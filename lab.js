// Controls and presentation only: transitions, sampling and measurements run in C++.
export const settings = {
  rule: "B3/S23",
  states: 2,
  noise: 0,
  seed: 42,
  rngState: 42,
  density: 0.2,
  brush: 1,
};
const $ = (id) => document.getElementById(id);
const numberField = (id, label, value, min, max, step = "1") =>
  `<label>${label}<input id="${id}" type="number" value="${value}" min="${min}" max="${max}" step="${step}" required></label>`;
function number(id) {
  const input = $(id);
  if (!input.checkValidity())
    throw Error(`Invalid ${input.parentElement.textContent.trim()}`);
  return Number(input.value);
}
export function mountLab(Life, view) {
  document.querySelector(".rules-panel").innerHTML = `<h2>Editable rule</h2>
    <p>Checked counts trigger birth or survival. Only active cells count as neighbors.</p>
    ${["B", "S"].map((kind) => `<fieldset><legend>${kind === "B" ? "Birth (empty → active)" : "Survival (active → active)"}</legend><div class="counts">${Array.from({ length: 9 }, (_, i) => `<label><input type="checkbox" data-count="${kind}${i}">${i}</label>`).join("")}</div></fieldset>`).join("")}
    <form id="rule-form"><label>B/S notation<input id="rule-text" value="B3/S23" autocomplete="off" spellcheck="false" aria-describedby="rule-error"></label><button>Apply rule</button></form>
    <p id="rule-error" role="alert"></p><div class="lab-actions"><button id="conway">Conway</button><button id="highlife">HighLife</button><button id="brain">B2/S | 3 states</button></div>
    <label>State model<select id="states">${Array.from({ length: 7 }, (_, i) => `<option value="${i + 2}">${i === 0 ? "Binary (Life compatible)" : `${i + 2} states | Generations`}</option>`).join("")}</select></label>
    <label id="brush-label">Draw state<select id="brush"></select></label><p id="state-help"></p>
    ${numberField("noise", "Noise probability / cell / step", 0, 0, 1, "any")}
    ${numberField("seed", "Simulation seed", 42, 0, 4294967295)}
    ${numberField("initial-density", "Randomize density", 0.2, 0, 1, "any")}
    <p>Noise flips between active and inactive after updating; refractory cells activate when perturbed. Zero is deterministic. Changes pause and start a new trajectory; Reset restores its grid and noise seed.</p>`;
  const lab = document.createElement("section");
  lab.className = "lab";
  lab.innerHTML = `<h2>Rule experiments</h2><p>Compare repeated trials, then inspect a trajectory. Categories are empirical heuristics, not proofs of chaos, mobility or reproduction.</p>
    <form id="experiment-form"><div class="lab-fields">
    <label>Rules<select id="experiment-mode"><option value="sample">100 sampled binary rules</option><option value="current">Current rule and state model</option></select></label>
    ${numberField("experiment-seed", "Experiment seed", 2026, 0, 4294967295)}
    ${numberField("experiment-cols", "Columns", 32, 3, 128)}${numberField("experiment-rows", "Rows", 32, 3, 128)}
    ${numberField("experiment-density", "Initial active density", 0.2, 0, 1, "any")}
    ${numberField("experiment-trials", "Trials per rule / noise level", 3, 2, 20)}
    ${numberField("experiment-steps", "Steps", 200, 1, 2000)}
    <label>Noise levels (comma separated)<input id="noise-levels" value="0" required></label></div>
    <div class="lab-actions"><button id="run-experiment">Run experiments</button><button id="cancel-experiment" type="button" disabled>Cancel</button><button id="export-experiment" type="button" disabled>Export JSON</button></div></form>
    <p id="experiment-status" role="status">Try current rule with noise levels 0, 0.001, 0.01, 0.05 for a matched comparison.</p>
    <div class="results-wrap"><table><caption>Outcomes by rule and noise level; click to inspect individual trials</caption><thead><tr><th>Rule</th><th>Noise</th><th>Trials</th><th>Categories</th><th>Mean final density</th><th>Mean final distance from zero noise</th><th>Inspect</th></tr></thead><tbody id="results"></tbody></table></div>
    <div id="trial-detail" hidden><h3>Inspect trajectory</h3><label>Trial<select id="trial-select"></select></label><p id="trial-summary"></p><div id="trial-chart"></div><p>Chart: active density (solid green), state-change rate (dashed blue), distance from matched deterministic trajectory (dotted orange). Exact arrays and initial/final grids are in the JSON.</p><button id="replay">Replay exact initial grid</button></div>`;
  document.querySelector(".footer").before(lab);
  let experiment = null,
    worker = null,
    selectedTrials = [];
  function sync() {
    $("rule-text").value = settings.rule;
    $("rule-text").setAttribute("aria-invalid", "false");
    $("rule-error").textContent = "";
    document.querySelector(".rule-badge").textContent =
      `${settings.rule}${settings.states > 2 ? ` | C${settings.states}` : ""}`;
    const [birth, survival] = settings.rule.split("/");
    document.querySelectorAll("[data-count]").forEach((el) => {
      el.checked = (el.dataset.count[0] === "B" ? birth : survival).includes(
        el.dataset.count[1],
      );
    });
    $("grid").setAttribute(
      "aria-label",
      settings.states === 2
        ? "Binary Life grid. Click or drag to draw. Use arrow keys to inspect cells and Enter to toggle."
        : "Generations grid. Select a draw state, then click or drag. Use arrow keys to hear cell states and Enter to paint.",
    );
    $("states").value = settings.states;
    $("brush-label").hidden = settings.states === 2;
    $("brush").innerHTML = Array.from(
      { length: settings.states },
      (_, i) =>
        `<option value="${i}">${i}: ${i === 0 ? "Empty" : i === 1 ? "Active" : `Refractory ${i - 1}`}</option>`,
    ).join("");
    settings.brush = Math.min(settings.brush, settings.states - 1);
    $("brush").value = settings.brush;
    $("state-help").textContent =
      settings.states === 2
        ? "Binary mode: positive bytes are live-cell ages."
        : `0 empty; 1 active; failed survival → 2 → … → ${settings.states - 1} → 0. Refractory cells cannot give birth or count as neighbors.`;
    $("noise").value = settings.noise;
    $("seed").value = settings.seed;
    document.querySelector(".legend").innerHTML =
      settings.states === 2
        ? "<span>Light green: newborn</span><span>Green: alive</span><span>Dark green: visual trail</span>"
        : `<span>Solid light green: active (1)</span><span>Hollow colored squares: refractory (2-${settings.states - 1}); numbers at larger zoom</span><span>Dark: empty (0)</span>`;
    const hint = document.createElement("span");
    hint.id = "grid-help";
    hint.className = "hint";
    hint.textContent = "Click or drag to draw. Keyboard: arrows and Enter.";
    document.querySelector(".legend").append(hint);
  }
  function setRule(text) {
    const valid = Life.validateRule(text.trim().toUpperCase());
    if (!valid) {
      $("rule-error").textContent =
        "Use B[counts]/S[counts], unique digits 0-8. Empty sets are allowed. Previous rule remains active.";
      $("rule-text").setAttribute("aria-invalid", "true");
      return;
    }
    settings.rule = valid;
    view.restart();
    sync();
  }
  $("rule-form").onsubmit = (e) => {
    e.preventDefault();
    setRule($("rule-text").value);
  };
  document.querySelectorAll("[data-count]").forEach(
    (el) =>
      (el.onchange = () => {
        const counts = (kind) =>
          Array.from(document.querySelectorAll(`[data-count^="${kind}"]`))
            .filter((el) => el.checked)
            .map((el) => el.dataset.count[1])
            .join("");
        setRule(`B${counts("B")}/S${counts("S")}`);
      }),
  );
  $("conway").onclick = () => {
    const old = settings.states;
    settings.states = 2;
    settings.noise = 0;
    view.changeMode(old);
    setRule("B3/S23");
  };
  $("highlife").onclick = () => setRule("B36/S23");
  $("brain").onclick = () => {
    const old = settings.states;
    settings.states = 3;
    settings.rule = "B2/S";
    view.changeMode(old);
    sync();
  };
  $("states").onchange = () => {
    const old = settings.states;
    settings.states = Number($("states").value);
    view.changeMode(old);
    sync();
  };
  $("brush").onchange = () => {
    settings.brush = Number($("brush").value);
  };
  for (const [id, key] of [
    ["noise", "noise"],
    ["seed", "seed"],
    ["initial-density", "density"],
  ])
    $(id).onchange = () => {
      try {
        settings[key] = number(id);
        view.restart();
        $("rule-error").textContent = "";
      } catch (error) {
        $("rule-error").textContent = error.message;
        $(id).value = settings[key];
      }
    };
  function finish(message) {
    worker?.terminate();
    worker = null;
    $("run-experiment").disabled = false;
    $("cancel-experiment").disabled = true;
    $("export-experiment").disabled = !experiment?.results.length;
    $("experiment-status").textContent = message;
  }
  function renderResults() {
    const groups = new Map();
    experiment.results.forEach((r) => {
      const key = `${r.rule}:${r.noise}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    $("results").replaceChildren();
    for (const trials of groups.values()) {
      const categories = {};
      trials.forEach((r) => {
        categories[r.category] = (categories[r.category] || 0) + 1;
      });
      const mean = (key) =>
        trials.reduce((sum, r) => sum + r[key].at(-1), 0) / trials.length;
      const row = document.createElement("tr");
      for (const value of [
        trials[0].rule,
        trials[0].noise,
        trials.length,
        Object.entries(categories)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", "),
        mean("density").toFixed(3),
        mean("distance").toFixed(3),
      ]) {
        const td = document.createElement("td");
        td.textContent = value;
        row.append(td);
      }
      const td = document.createElement("td"),
        button = document.createElement("button");
      button.textContent = "Inspect";
      button.onclick = () => inspect(trials);
      td.append(button);
      row.append(td);
      $("results").append(row);
    }
  }
  function inspect(trials) {
    selectedTrials = trials;
    $("trial-detail").hidden = false;
    $("trial-select").innerHTML = trials
      .map(
        (r, i) =>
          `<option value="${i}">Trial ${r.trial + 1} | seed ${r.seed}</option>`,
      )
      .join("");
    showTrial();
  }
  function showTrial() {
    const r = selectedTrials[Number($("trial-select").value)];
    $("trial-summary").textContent =
      `${r.rule} | ${r.states} states | noise ${r.noise} | ${r.cols}×${r.rows} | ${r.steps} steps | ${r.category}. First empty: ${r.firstEmpty < 0 ? "not observed" : r.firstEmpty}; terminal exact recurrence: ${r.terminalPeriod || "none within 16 steps"}${r.noise ? " (noise: not an oscillator proof)" : ""}. Density change between early/late windows: ${r.growth.toFixed(3)}.`;
    const line = (key) =>
      r[key]
        .map((v, i) => `${40 + (i / r.steps) * 700},${210 - v * 180}`)
        .join(" ");
    $("trial-chart").innerHTML =
      `<svg viewBox="0 0 780 245" role="img" aria-label="Density, change rate and deterministic distance over generations"><path d="M40 30V210H740" fill="none" stroke="#9aab95"/><text x="5" y="35">1</text><text x="5" y="210">0</text><text x="40" y="235">0</text><text x="650" y="235">${r.steps} steps</text>${[
        ["density", "#d0f583", ""],
        ["change", "#65c5ed", "8 4"],
        ["distance", "#e9ab71", "2 5"],
      ]
        .map(
          ([key, color, dash]) =>
            `<polyline points="${line(key)}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="${dash}"/>`,
        )
        .join("")}</svg>`;
  }
  $("trial-select").onchange = showTrial;
  $("replay").onclick = () => {
    const r = selectedTrials[Number($("trial-select").value)];
    settings.rule = r.rule;
    settings.states = r.states;
    settings.noise = r.noise;
    settings.seed = r.noiseSeed;
    sync();
    view.replay(r);
  };
  $("experiment-form").onsubmit = (e) => {
    e.preventDefault();
    try {
      const mode = $("experiment-mode").value;
      const noiseText = $("noise-levels")
        .value.split(",")
        .map((v) => v.trim());
      const noiseLevels = [...new Set(noiseText.map(Number))];
      if (
        noiseText.some((v) => !v) ||
        noiseLevels.length > 8 ||
        noiseLevels.some((v) => !Number.isFinite(v) || v < 0 || v > 1)
      )
        throw Error("Enter 1-8 comma-separated probabilities in [0,1].");
      const config = {
        seed: number("experiment-seed"),
        cols: number("experiment-cols"),
        rows: number("experiment-rows"),
        density: number("experiment-density"),
        trials: number("experiment-trials"),
        steps: number("experiment-steps"),
        noiseLevels,
        states: mode === "sample" ? 2 : settings.states,
        mode,
        rule: settings.rule,
      };
      const rules =
        mode === "sample" ? Life.sampleRules(config.seed) : [config.rule];
      const work =
        rules.length *
        config.trials *
        config.cols *
        config.rows *
        config.steps *
        noiseLevels.reduce((s, p) => s + (p > 0 ? 2 : 1), 0);
      if (work > 250000000)
        throw Error(
          "Batch too large: reduce dimensions, steps, trials or noise levels (250 million cell updates maximum).",
        );
      experiment = {
        schema: "life-lab-v1",
        engine: "life-lab-1",
        boundary: "toroidal",
        rng: "LCG32:1664525*x+1013904223; event=floor(p*2^32)",
        noiseModel: "post-update active/inactive flip; refractory activates",
        sampling: "distinct high-18-bit LCG draws; rejection of duplicates",
        classification:
          "terminal recurrence <=16 at p=0; growth >0.1; tail change >0.15; see docs/design.md",
        config,
        rules,
        complete: false,
        results: [],
      };
      $("results").replaceChildren();
      $("trial-detail").hidden = true;
      $("run-experiment").disabled = true;
      $("cancel-experiment").disabled = false;
      $("export-experiment").disabled = true;
      $("experiment-status").textContent = "Loading C++ experiment worker…";
      worker = new Worker(new URL("./experiment-worker.js", import.meta.url), {
        type: "module",
      });
      worker.onmessage = ({ data }) => {
        if (data.error) {
          finish(`Experiment failed: ${data.error}`);
          return;
        }
        if (data.result) {
          experiment.results.push(data.result);
          $("experiment-status").textContent =
            `Completed ${experiment.results.length} / ${data.total} trials`;
          if (experiment.results.length % config.trials === 0) renderResults();
        }
        if (data.done) {
          experiment.complete = true;
          renderResults();
          finish(
            `Completed ${experiment.results.length} trials. Export JSON to preserve metadata, traces and replay grids.`,
          );
        }
      };
      worker.onerror = (event) => finish(`Worker failed: ${event.message}`);
      worker.postMessage({ config, rules });
    } catch (error) {
      $("experiment-status").textContent = error.message;
    }
  };
  $("cancel-experiment").onclick = () => {
    renderResults();
    finish(
      `Cancelled; ${experiment.results.length} completed trials preserved. Export is marked incomplete.`,
    );
  };
  $("export-experiment").onclick = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(experiment)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-experiment-${experiment.config.seed}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  sync();
}
