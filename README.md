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

The default grid contains 80 x 48 cells and wraps at its edges; experiment replay can use other dimensions. The default simulation uses Conway's B3/S23 rules: an empty cell with three neighbors is born, and a living cell with two or three neighbors survives. Fading trails are visual only.

## Files

- `index.html`: page entrypoint and metadata
- `style.css`: responsive visual design
- `app.js`: interface, controls, rendering, and optional WebMCP integration
- `life_engine.js` / `life_engine.wasm`: compiled WebAssembly build of the C++ engine (generated from `cpp/`; see below)
- `server.mjs`: dependency-free local preview server
- `cpp/`: the simulation engine's source of truth — patterns and simulation rules, in C++ (`engine.hpp`/`engine.cpp`), embind bindings for the browser (`wasm_bindings.cpp`), a native CLI demo (`main.cpp`), and tests (`tests.cpp`)

To host the website, serve `index.html`, `style.css`, `app.js`, `lab.js`, `experiment-worker.js`, `life_engine.js`, and `life_engine.wasm` together using any static web host. No credentials, database, or environment secrets are required.

### Rebuilding the engine

After changing anything in `cpp/`, regenerate `life_engine.js`/`life_engine.wasm` with the [Emscripten SDK](https://emscripten.org/):

```sh
npm run build
```

The build script uses `em++` on PATH, `$EMXX` if set, or the SDK at
`C:/emsdk/upstream/emscripten/em++.exe` on Windows. It compiles `engine.cpp`,
`experiments.cpp` and `wasm_bindings.cpp` with C++17, exceptions, embind,
ES-module output and memory growth. Web, worker and Node environments are
supported by the same generated module. Only source files are hand-edited;
`life_engine.js` and `life_engine.wasm` are generated artifacts.

To build and run the native CLI demo and test suite instead (no browser involved), see `cpp/CMakeLists.txt`.

## Syntax checks

```sh
npm run check
```

Inspired by John Conway's Game of Life (1970).


## Rule laboratory

- Edit birth/survival checkboxes or enter B/S notation. Apply validates the rule; invalid text leaves the previous rule active. Conway restores binary Life with zero noise; HighLife selects B36/S23.
- Select 3..8 states for Generations, or try the B2/S, 3-state preset. State 1 is active; states 2 onward decay through a refractory sequence to 0. Only active neighbors count. Use the state brush or keyboard to draw/inspect states.
- Set noise probability, simulation seed and random initialization density. Noise flips active/inactive status after each synchronous update; zero preserves deterministic behavior. Changing model/noise/seed pauses and makes the current grid the new starting checkpoint. Reset restores that grid and the noise stream.
- In Rule experiments, configure seed, dimensions, density, trials, steps and comma-separated noise levels. Choose 100 sampled binary rules or the current rule/state model. Run, cancel, inspect individual trials, view traces, replay exact grids, and export complete or partial JSON.
- Trial seeds and noise seeds are separate; matched trials share initial grids across rules and noise levels. UI results are held in memory: export before starting a new batch or closing the page.

## Build and verification

Requires Node.js >=18 to serve the checked-in build. Rebuilding/testing C++ requires the Emscripten SDK; no npm runtime packages are required.

```sh
npm run build
npm test
npm run test:integration
npm run check
npm run experiments
npm start
```

`npm test` compiles and executes the dependency-free C++ suite as Wasm under Node.
`npm run test:integration` verifies the distributed Wasm API, exact replay,
worker results and preview-server assets. `npm run experiments` regenerates the
recorded evidence in `results/` (overwrites the four named result files).

For a native toolchain:

```sh
cmake -S cpp -B build/native
cmake --build build/native --config Release
ctest --test-dir build/native -C Release --output-on-failure
```

The native `life` CLI still runs the original pattern demo. Native experiments
are available through `life::runTrial`; the browser and Node evidence script
provide the ready-to-use experiment interfaces.

## Design and evidence

- [Design, rule semantics, reproducibility and limitations](docs/design.md)
- [Actual experiment observations and follow-up questions](docs/experiments.md)
- [Compact measured results](results/summary.json); full traces/grids in `results/sampled.json`, `results/noise-comparison.json` and `results/generations.json`
- [Report outline only](docs/report-outline.md)
- [Draft section on verification and artificial life](docs/verification-section.md)

The added source files are `cpp/experiments.hpp/.cpp` (C++ measurements and sampling),
`lab.js` (controls/results), `experiment-worker.js` (batch orchestration), and
`scripts/` (build, validation and recorded experiments). Existing engine,
bindings, canvas, server, styles and tests were extended rather than replaced.

## Change inventory

| Files | Purpose |
| --- | --- |
| `cpp/engine.hpp`, `cpp/engine.cpp` | B/S masks and parsing; seeded grids; noise and Generations transitions; shape/state validation; legacy Conway wrapper |
| `cpp/experiments.hpp`, `cpp/experiments.cpp` | Distinct rule sampling, repeated-trial measurements, recurrence, heuristic labels and JSON serialization |
| `cpp/wasm_bindings.cpp`, `cpp/CMakeLists.txt` | Expose the additions to Wasm and include the experiment module in native builds |
| `app.js` | Connect the existing canvas/playback to configurable C++; state drawing, rendering, announcements and exact replay |
| `lab.js`, `experiment-worker.js` | Rule/noise/state controls, experiment configuration, worker batches, charts, inspection, cancellation and export |
| `style.css`, `server.mjs` | Lab styling/accessibility and serving new modules |
| `cpp/tests.cpp`, `scripts/integration-test.mjs` | C++ regression/semantics tests and Wasm/replay/worker/HTTP integration checks |
| `scripts/build.mjs`, `package.json`, `.gitignore` | Repeatable build/test commands and ignored temporary build products |
| `scripts/representative-experiments.mjs` | Regenerate the recorded 380-trial sample and comparison evidence |
| `life_engine.js`, `life_engine.wasm` | Rebuilt distributable C++ engine |
| `results/sampled.json`, `results/noise-comparison.json`, `results/generations.json`, `results/summary.json` | Actual reproducible experiment outputs |
| `README.md`, `docs/design.md`, `docs/experiments.md` | Instructions, mathematical/design rationale, measurement definitions, actual findings and limitations |
| `docs/report-outline.md`, `docs/verification-section.md` | Report outline and the requested substantive draft section only |

Verification in this environment: Emscripten build passed; original and expanded
C++ suites passed; exact replay for four rule/state/noise combinations passed;
actual worker execution (eight additional integration trials) passed; all site
assets returned HTTP 200 with correct JavaScript/Wasm content types; JavaScript
syntax and formatting/whitespace checks passed. The new JavaScript modules were
formatted with Prettier 3.6.2 without adding an npm runtime dependency. Native
compilation and interactive/visual browser QA were not available here.
