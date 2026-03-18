# Differential Growth

Organic form generator — node chains that grow, subdivide, attract, and repel to produce coral, brain fold, and lichen-like biological forms.

## Run

Open `index.html` in a browser. No build step required.

## Features

- **Simulation**: Linked-list node chains with attraction, repulsion (spatial hash), and alignment forces
- **Growth**: Edges subdivide when they exceed max length, inserting new nodes at midpoints
- **Presets**: Coral, brain folds, lichen, circle/line/rectangle seeds
- **Controls**: Real-time parameter adjustment (repulsion, attraction, alignment, edge length, speed, growth rate)
- **Interaction**: Click to add seed circles, drag to deform existing forms
- **Export**: SVG vector output and PNG screenshot
- **FunForrest palette**: Dark background with gold glow rendering

## Architecture

```
js/
├── spatial.js    — Spatial hash grid for O(1) neighbor queries
├── simulation.js — Node system, forces, subdivision, chain extraction
├── renderer.js   — Canvas 2D smooth curves + SVG generation
└── main.js       — Controls, presets, interaction, animation loop
```
