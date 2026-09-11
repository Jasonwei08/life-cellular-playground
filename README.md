# Life — a cellular playground

An interactive Conway's Game of Life website. The interface is HTML, CSS, and vanilla JavaScript; the simulation engine itself is C++, compiled to WebAssembly. No runtime dependencies or build step are needed to run the site — the compiled `life_engine.js`/`life_engine.wasm` are checked in.

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
- `life_engine.js` / `life_engine.wasm`: compiled WebAssembly build of the C++ engine (generated from `cpp/`; see below)
- `server.mjs`: dependency-free local preview server
- `cpp/`: the simulation engine's source of truth — patterns and simulation rules, in C++ (`engine.hpp`/`engine.cpp`), embind bindings for the browser (`wasm_bindings.cpp`), a native CLI demo (`main.cpp`), and tests (`tests.cpp`)

To host the website, serve `index.html`, `style.css`, `app.js`, `life_engine.js`, and `life_engine.wasm` together using any static web host. No credentials, database, or environment secrets are required.

### Rebuilding the engine

After changing anything in `cpp/`, regenerate `life_engine.js`/`life_engine.wasm` with the [Emscripten SDK](https://emscripten.org/):

```sh
em++ cpp/engine.cpp cpp/wasm_bindings.cpp --bind -O2 -std=c++17 \
  -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT=web \
  -o life_engine.js
```

To build and run the native CLI demo and test suite instead (no browser involved), see `cpp/CMakeLists.txt`.

## Syntax checks

```sh
npm run check
```

Inspired by John Conway's Game of Life (1970).
