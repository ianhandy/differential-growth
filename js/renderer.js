// FunForrest palette
const BG = '#1A0D00';
const GOLD = '#DDC165';
const GOLD_LIGHT = '#FFE9A3';
const ACCENT = '#E5591C';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.showNodes = false;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  clear() {
    this.ctx.fillStyle = BG;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawChains(chains) {
    const ctx = this.ctx;

    // Glow layer
    ctx.save();
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let c = 0; c < chains.length; c++) {
      this._drawSmoothCurve(ctx, chains[c]);
    }
    ctx.restore();

    // Crisp layer on top
    ctx.save();
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let c = 0; c < chains.length; c++) {
      this._drawSmoothCurve(ctx, chains[c]);
    }
    ctx.restore();

    // Optional node dots
    if (this.showNodes) {
      ctx.fillStyle = ACCENT;
      for (let c = 0; c < chains.length; c++) {
        const chain = chains[c];
        for (let i = 0; i < chain.length; i++) {
          ctx.beginPath();
          ctx.arc(chain[i].x, chain[i].y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  _drawSmoothCurve(ctx, chain) {
    if (chain.length < 2) return;

    ctx.beginPath();

    if (chain.length === 2) {
      ctx.moveTo(chain[0].x, chain[0].y);
      ctx.lineTo(chain[1].x, chain[1].y);
      ctx.stroke();
      return;
    }

    // Catmull-Rom to Bezier conversion for smooth curves
    const pts = chain;
    const closed = chain.closed;

    if (closed) {
      // For closed loops, wrap around
      const first = pts[0];
      const second = pts[1];
      const last = pts[pts.length - 1];
      const secondLast = pts[pts.length - 2];

      ctx.moveTo(
        (last.x + second.x) / 2 - (last.x - first.x - second.x + first.x) / 6,
        (last.y + second.y) / 2 - (last.y - first.y - second.y + first.y) / 6
      );

      // Actually, simpler approach: use quadratic curves through midpoints
      ctx.moveTo(
        (pts[0].x + pts[1].x) / 2,
        (pts[0].y + pts[1].y) / 2
      );

      for (let i = 1; i < pts.length; i++) {
        const next = (i + 1) % pts.length;
        const mx = (pts[i].x + pts[next].x) / 2;
        const my = (pts[i].y + pts[next].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }

      // Close back to start midpoint
      const mx = (pts[0].x + pts[1].x) / 2;
      const my = (pts[0].y + pts[1].y) / 2;
      ctx.quadraticCurveTo(pts[0].x, pts[0].y, mx, my);

      ctx.closePath();
    } else {
      // Open chain
      ctx.moveTo(pts[0].x, pts[0].y);

      // First segment: straight to midpoint
      if (pts.length > 2) {
        const mx = (pts[0].x + pts[1].x) / 2;
        const my = (pts[0].y + pts[1].y) / 2;
        ctx.lineTo(mx, my);

        for (let i = 1; i < pts.length - 1; i++) {
          const nextMx = (pts[i].x + pts[i + 1].x) / 2;
          const nextMy = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, nextMx, nextMy);
        }

        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      } else {
        ctx.lineTo(pts[1].x, pts[1].y);
      }
    }

    ctx.stroke();
  }
}

// Generate SVG path string from chains
export function chainsToSVG(chains, width, height) {
  let paths = '';

  for (const chain of chains) {
    if (chain.length < 2) continue;
    let d = '';

    const pts = chain;
    const closed = chain.closed;

    if (closed && pts.length > 2) {
      const mx0 = (pts[0].x + pts[1].x) / 2;
      const my0 = (pts[0].y + pts[1].y) / 2;
      d = `M${mx0.toFixed(2)},${my0.toFixed(2)}`;

      for (let i = 1; i < pts.length; i++) {
        const next = (i + 1) % pts.length;
        const mx = (pts[i].x + pts[next].x) / 2;
        const my = (pts[i].y + pts[next].y) / 2;
        d += ` Q${pts[i].x.toFixed(2)},${pts[i].y.toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)}`;
      }
      const cmx = (pts[0].x + pts[1].x) / 2;
      const cmy = (pts[0].y + pts[1].y) / 2;
      d += ` Q${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)} ${cmx.toFixed(2)},${cmy.toFixed(2)}Z`;
    } else {
      d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
      if (pts.length > 2) {
        const fmx = (pts[0].x + pts[1].x) / 2;
        const fmy = (pts[0].y + pts[1].y) / 2;
        d += ` L${fmx.toFixed(2)},${fmy.toFixed(2)}`;
        for (let i = 1; i < pts.length - 1; i++) {
          const nmx = (pts[i].x + pts[i + 1].x) / 2;
          const nmy = (pts[i].y + pts[i + 1].y) / 2;
          d += ` Q${pts[i].x.toFixed(2)},${pts[i].y.toFixed(2)} ${nmx.toFixed(2)},${nmy.toFixed(2)}`;
        }
        d += ` L${pts[pts.length - 1].x.toFixed(2)},${pts[pts.length - 1].y.toFixed(2)}`;
      } else {
        d += ` L${pts[1].x.toFixed(2)},${pts[1].y.toFixed(2)}`;
      }
    }

    paths += `  <path d="${d}" fill="none" stroke="${GOLD_LIGHT}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${BG}"/>
${paths}</svg>`;
}
