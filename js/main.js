import { Simulation } from './simulation.js';
import { Renderer, chainsToSVG } from './renderer.js';

// --- Preset definitions ---
const PRESETS = {
  coral: {
    repulsionRadius: 15, repulsionStrength: 0.8, attractionStrength: 0.3,
    alignmentStrength: 0.5, maxEdgeLength: 8, maxSpeed: 1.5, growthInterval: 3,
    seed: (sim, w, h) => sim.seedCircle(w / 2, h / 2, 40, 24),
  },
  brain: {
    repulsionRadius: 12, repulsionStrength: 1.2, attractionStrength: 0.4,
    alignmentStrength: 0.8, maxEdgeLength: 6, maxSpeed: 1.0, growthInterval: 2,
    seed: (sim, w, h) => sim.seedCircle(w / 2, h / 2, 60, 30),
  },
  lichen: {
    repulsionRadius: 20, repulsionStrength: 0.5, attractionStrength: 0.2,
    alignmentStrength: 0.3, maxEdgeLength: 10, maxSpeed: 2.0, growthInterval: 2,
    seed: (sim, w, h) => {
      sim.seedCircle(w / 2, h / 2, 30, 16);
      sim.seedCircle(w / 2 - 60, h / 2 + 40, 20, 12);
      sim.seedCircle(w / 2 + 70, h / 2 - 30, 25, 14);
    },
  },
  circle: {
    seed: (sim, w, h) => sim.seedCircle(w / 2, h / 2, 50, 24),
  },
  line: {
    seed: (sim, w, h) => sim.seedLine(w / 2 - 100, h / 2, w / 2 + 100, h / 2, 20),
  },
  rectangle: {
    seed: (sim, w, h) => sim.seedRectangle(w / 2, h / 2, 120, 80),
  },
};

// --- Init ---
const canvas = document.getElementById('canvas');
const renderer = new Renderer(canvas);
const sim = new Simulation();

let paused = false;
let currentPreset = 'coral';
let lastTime = performance.now();
let frameCount = 0;
let fpsDisplay = 0;

// --- Controls binding ---
const controls = {
  preset: document.getElementById('preset'),
  repulsionRadius: document.getElementById('repulsionRadius'),
  repulsionStrength: document.getElementById('repulsionStrength'),
  attractionStrength: document.getElementById('attractionStrength'),
  alignmentStrength: document.getElementById('alignmentStrength'),
  maxEdgeLength: document.getElementById('maxEdgeLength'),
  maxSpeed: document.getElementById('maxSpeed'),
  growthInterval: document.getElementById('growthInterval'),
  showNodes: document.getElementById('showNodes'),
};

const paramKeys = ['repulsionRadius', 'repulsionStrength', 'attractionStrength',
                   'alignmentStrength', 'maxEdgeLength', 'maxSpeed', 'growthInterval'];

function syncControlsToSim() {
  for (const key of paramKeys) {
    controls[key].value = sim.params[key];
    const valEl = document.getElementById(key + 'Val');
    if (valEl) valEl.textContent = sim.params[key];
  }
}

function syncSimToControls() {
  for (const key of paramKeys) {
    sim.params[key] = parseFloat(controls[key].value);
    const valEl = document.getElementById(key + 'Val');
    if (valEl) valEl.textContent = controls[key].value;
  }
}

// Bind slider events
for (const key of paramKeys) {
  controls[key].addEventListener('input', syncSimToControls);
}

controls.showNodes.addEventListener('change', () => {
  renderer.showNodes = controls.showNodes.checked;
});

// Preset selector
controls.preset.addEventListener('change', () => {
  applyPreset(controls.preset.value);
});

function applyPreset(name) {
  currentPreset = name;
  const preset = PRESETS[name];
  sim.reset();

  // Apply preset params (if any)
  for (const key of paramKeys) {
    if (preset[key] !== undefined) {
      sim.params[key] = preset[key];
    }
  }

  syncControlsToSim();
  preset.seed(sim, renderer.width, renderer.height);
}

// Pause / Reset
document.getElementById('pauseBtn').addEventListener('click', () => {
  paused = !paused;
  document.getElementById('pauseBtn').textContent = paused ? 'Play' : 'Pause';
});

document.getElementById('resetBtn').addEventListener('click', () => {
  applyPreset(currentPreset);
});

// --- Export ---
document.getElementById('exportSVG').addEventListener('click', () => {
  const chains = sim.getChains();
  const svg = chainsToSVG(chains, renderer.width, renderer.height);
  downloadBlob(svg, 'differential-growth.svg', 'image/svg+xml');
});

document.getElementById('exportPNG').addEventListener('click', () => {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'differential-growth.png';
    a.click();
    URL.revokeObjectURL(url);
  });
});

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Interaction ---
let isDragging = false;
let didDrag = false;
let dragNode = null;
const DRAG_RADIUS = 30;

canvas.addEventListener('mousedown', (e) => {
  const x = e.clientX;
  const y = e.clientY;
  didDrag = false;

  // Try to find a nearby node to drag
  let closest = null;
  let closestDist = DRAG_RADIUS;

  for (const node of sim.nodes) {
    const dx = node.x - x;
    const dy = node.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist) {
      closest = node;
      closestDist = dist;
    }
  }

  if (closest) {
    isDragging = true;
    dragNode = closest;
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging || !dragNode) return;
  didDrag = true;

  // Move the dragged node and nearby nodes
  const x = e.clientX;
  const y = e.clientY;
  const nearby = sim.spatial.query(dragNode.x, dragNode.y, DRAG_RADIUS);

  for (const node of nearby) {
    const dx = node.x - dragNode.x;
    const dy = node.y - dragNode.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const influence = 1 - dist / DRAG_RADIUS;
    if (influence > 0) {
      node.x += (x - dragNode.x) * influence * 0.3;
      node.y += (y - dragNode.y) * influence * 0.3;
    }
  }

  dragNode.x = x;
  dragNode.y = y;
  dragNode.vx = 0;
  dragNode.vy = 0;
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
  dragNode = null;
});

// Click to add seed
canvas.addEventListener('click', (e) => {
  if (didDrag) return;
  // Only add seed if not near existing nodes
  const x = e.clientX;
  const y = e.clientY;
  const nearby = sim.spatial.query(x, y, 30);
  if (nearby.length === 0) {
    sim.seedCircle(x, y, 20, 12);
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  renderer.resize();
});

// --- Animation loop ---
function loop() {
  if (!paused) {
    sim.update();
  }

  renderer.clear();
  const chains = sim.getChains();
  renderer.drawChains(chains);

  // FPS counter
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    fpsDisplay = frameCount;
    frameCount = 0;
    lastTime = now;
    document.getElementById('fps').textContent = fpsDisplay;
    document.getElementById('nodeCount').textContent = sim.nodes.length;
  }

  requestAnimationFrame(loop);
}

// --- Start ---
applyPreset('coral');
loop();
