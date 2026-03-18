import { SpatialHash } from './spatial.js';

let nextId = 0;

function createNode(x, y) {
  return { id: nextId++, x, y, vx: 0, vy: 0, prev: null, next: null };
}

export class Simulation {
  constructor(params) {
    this.params = {
      repulsionRadius: 15,
      repulsionStrength: 0.8,
      attractionStrength: 0.3,
      alignmentStrength: 0.5,
      maxEdgeLength: 8,
      maxSpeed: 1.5,
      growthInterval: 3,
      damping: 0.85,
      ...params,
    };

    this.nodes = [];
    this.step = 0;
    this.spatial = new SpatialHash(this.params.repulsionRadius);
  }

  // Build a closed loop from an array of {x, y}
  seedFromPoints(points, closed = true) {
    if (points.length < 2) return;
    const newNodes = points.map(p => createNode(p.x, p.y));

    for (let i = 0; i < newNodes.length; i++) {
      const prev = i > 0 ? newNodes[i - 1] : (closed ? newNodes[newNodes.length - 1] : null);
      const next = i < newNodes.length - 1 ? newNodes[i + 1] : (closed ? newNodes[0] : null);
      newNodes[i].prev = prev;
      newNodes[i].next = next;
    }

    this.nodes.push(...newNodes);
  }

  seedCircle(cx, cy, radius, count = 20) {
    const pts = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
    }
    this.seedFromPoints(pts, true);
  }

  seedLine(x1, y1, x2, y2, count = 15) {
    const pts = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
    }
    this.seedFromPoints(pts, false);
  }

  seedRectangle(cx, cy, w, h, spacing = 5) {
    const pts = [];
    const hw = w / 2, hh = h / 2;
    const perimeter = 2 * (w + h);
    const count = Math.floor(perimeter / spacing);

    for (let i = 0; i < count; i++) {
      const t = (i / count) * perimeter;
      let x, y;
      if (t < w) {
        x = cx - hw + t; y = cy - hh;
      } else if (t < w + h) {
        x = cx + hw; y = cy - hh + (t - w);
      } else if (t < 2 * w + h) {
        x = cx + hw - (t - w - h); y = cy + hh;
      } else {
        x = cx - hw; y = cy + hh - (t - 2 * w - h);
      }
      pts.push({ x, y });
    }
    this.seedFromPoints(pts, true);
  }

  reset() {
    this.nodes = [];
    this.step = 0;
    nextId = 0;
  }

  update() {
    const { repulsionRadius, repulsionStrength, attractionStrength,
            alignmentStrength, maxSpeed, damping } = this.params;

    // Rebuild spatial hash
    this.spatial.cellSize = repulsionRadius;
    this.spatial.clear();
    for (let i = 0; i < this.nodes.length; i++) {
      this.spatial.insert(this.nodes[i]);
    }

    // Compute forces
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      let fx = 0, fy = 0;

      // Repulsion from nearby nodes
      const neighbors = this.spatial.query(node.x, node.y, repulsionRadius);
      for (let j = 0; j < neighbors.length; j++) {
        const other = neighbors[j];
        if (other.id === node.id) continue;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.001) continue;
        const force = repulsionStrength * (1 - dist / repulsionRadius);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      // Attraction to connected neighbors (keep edges short)
      if (node.prev) {
        const dx = node.prev.x - node.x;
        const dy = node.prev.y - node.y;
        fx += dx * attractionStrength;
        fy += dy * attractionStrength;
      }
      if (node.next) {
        const dx = node.next.x - node.x;
        const dy = node.next.y - node.y;
        fx += dx * attractionStrength;
        fy += dy * attractionStrength;
      }

      // Alignment — move toward midpoint of neighbors for smoother curves
      if (node.prev && node.next) {
        const mx = (node.prev.x + node.next.x) / 2;
        const my = (node.prev.y + node.next.y) / 2;
        fx += (mx - node.x) * alignmentStrength;
        fy += (my - node.y) * alignmentStrength;
      }

      node.vx = (node.vx + fx) * damping;
      node.vy = (node.vy + fy) * damping;

      // Clamp speed
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > maxSpeed) {
        node.vx = (node.vx / speed) * maxSpeed;
        node.vy = (node.vy / speed) * maxSpeed;
      }
    }

    // Apply velocities
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].x += this.nodes[i].vx;
      this.nodes[i].y += this.nodes[i].vy;
    }

    // Growth — subdivide long edges
    this.step++;
    if (this.step % this.params.growthInterval === 0) {
      this.subdivide();
    }
  }

  subdivide() {
    const { maxEdgeLength } = this.params;
    const maxLen2 = maxEdgeLength * maxEdgeLength;
    const toInsert = [];

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (!node.next) continue;
      const dx = node.next.x - node.x;
      const dy = node.next.y - node.y;
      if (dx * dx + dy * dy > maxLen2) {
        toInsert.push(node);
      }
    }

    for (let i = 0; i < toInsert.length; i++) {
      const node = toInsert[i];
      const next = node.next;
      if (!next) continue;

      const mid = createNode(
        (node.x + next.x) / 2 + (Math.random() - 0.5) * 0.5,
        (node.y + next.y) / 2 + (Math.random() - 0.5) * 0.5
      );
      mid.vx = (node.vx + next.vx) / 2;
      mid.vy = (node.vy + next.vy) / 2;

      mid.prev = node;
      mid.next = next;
      node.next = mid;
      next.prev = mid;

      this.nodes.push(mid);
    }
  }

  // Get chains for rendering — each chain is an ordered array of nodes
  getChains() {
    const visited = new Set();
    const chains = [];

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (visited.has(node.id)) continue;

      // Find chain start (go backwards)
      let start = node;
      while (start.prev && !visited.has(start.prev.id)) {
        start = start.prev;
        if (start === node) break; // closed loop
      }

      const chain = [];
      let current = start;
      const isLoop = (start.prev !== null && start.prev.next === start);

      do {
        if (visited.has(current.id)) break;
        visited.add(current.id);
        chain.push(current);
        current = current.next;
      } while (current && current !== start);

      if (chain.length >= 2) {
        chain.closed = isLoop && current === start;
        chains.push(chain);
      }
    }
    return chains;
  }
}
