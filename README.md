# Life — a cellular playground

An interactive Conway's Game of Life website, built with HTML, CSS, and vanilla JavaScript. No runtime dependencies or build step are needed.

## Run locally

Install Node.js, then run:

```sh
npm start
```

Open http://127.0.0.1:4173 in your browser. To choose a different port, set the `PORT` environment variable.

## Play

- Draw or erase cells by clicking and dragging on the grid.
- Choose from six classic patterns: Glider, Pulsar, Gosper glider gun, R-pentomino, Lightweight ship, and Blinker.
- Play, pause, advance one generation, adjust speed, randomize, clear, or reset the world.
- Follow the generation count, population, births, and density.
- Use Space to play/pause, N to step, and R to reset. Focus the canvas and use arrow keys and Enter to edit cells with the keyboard.

The grid contains 80 × 48 cells and wraps at its edges. The simulation uses Conway's B3/S23 rules: an empty cell with three neighbors is born, and a living cell with two or three neighbors survives. Fading trails are visual only.

## Files

- `index.html`: page entrypoint and metadata
- `style.css`: responsive visual design
- `app.js`: interface, controls, rendering, and optional WebMCP integration
- `engine.js`: patterns and simulation rules
- `server.mjs`: dependency-free local preview server

To host the website, serve `index.html`, `style.css`, `app.js`, and `engine.js` together using any static web host. No credentials, database, or environment secrets are required.

## Syntax checks

```sh
npm run check
```

Inspired by John Conway's Game of Life (1970).
