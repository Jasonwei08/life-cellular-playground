// Runs the same C++ trials as the UI and saves complete reproducible evidence.
import { mkdirSync, writeFileSync } from "node:fs";
import createLifeModule from "../life_engine.js";
const Life = await createLifeModule();
mkdirSync("results", { recursive: true });
function batch(name, rules, states = 2, noiseLevels = [0], trials = 3) {
  const config = {
    seed: 2026,
    cols: 32,
    rows: 32,
    density: 0.2,
    steps: 200,
    trials,
    states,
    noiseLevels,
  };
  const result = {
    schema: "life-lab-v1",
    engine: "life-lab-1",
    boundary: "toroidal",
    rng: "LCG32:1664525*x+1013904223; event=floor(p*2^32)",
    noiseModel: "post-update active/inactive flip; refractory activates",
    sampling:
      name === "sampled"
        ? "100 distinct high-18-bit LCG draws"
        : "explicit selected rules",
    classification: "See docs/design.md; heuristic trajectory labels",
    config,
    rules,
    complete: true,
    results: [],
  };
  for (const rule of rules)
    for (const noise of noiseLevels)
      for (let trial = 0; trial < trials; trial++) {
        const seed = (config.seed + Math.imul(trial + 1, 2654435761)) >>> 0;
        const run = JSON.parse(
          Life.runTrial(
            rule,
            states,
            noise,
            config.cols,
            config.rows,
            config.density,
            config.steps,
            seed,
          ),
        );
        result.results.push({ ...run, trial });
      }
  writeFileSync(`results/${name}.json`, JSON.stringify(result));
  return result;
}
const sample = batch("sampled", Life.sampleRules(2026));
const categories = {};
sample.results.forEach((r) => {
  categories[r.category] = (categories[r.category] || 0) + 1;
});
// Choose for follow-up by a stated algorithm, not an unsupported visual claim.
const interesting =
  sample.results.find(
    (r) => r.category === "oscillatory" && r.terminalPeriod > 2,
  )?.rule ||
  sample.results.find((r) => r.category === "oscillatory")?.rule ||
  sample.rules[0];
const noise = batch(
  "noise-comparison",
  [...new Set(["B3/S23", "B36/S23", interesting])],
  2,
  [0, 0.001, 0.01, 0.05],
  5,
);
const multi = batch("generations", ["B2/S"], 3, [0, 0.001, 0.01, 0.05], 5);
const means = (data) => {
  const rows = [];
  for (const rule of data.rules)
    for (const p of data.config.noiseLevels) {
      const trials = data.results.filter(
        (r) => r.rule === rule && r.noise === p,
      );
      const mean = (key) =>
        trials.reduce((s, r) => s + r[key].at(-1), 0) / trials.length;
      rows.push({
        rule,
        states: data.config.states,
        noise: p,
        trials: trials.length,
        finalDensity: mean("density"),
        finalDistance: mean("distance"),
        categories: trials.map((r) => r.category),
      });
    }
  return rows;
};
const summary = {
  sampleConfig: sample.config,
  sampleCategories: categories,
  interestingRule: interesting,
  selection:
    "first sampled trial with terminal period >2, else first oscillatory trial, else first rule",
  interestingTrials: sample.results
    .filter((r) => r.rule === interesting)
    .map(
      ({
        rule,
        seed,
        category,
        terminalPeriod,
        firstEmpty,
        tailChange,
        growth,
      }) => ({
        rule,
        seed,
        category,
        terminalPeriod,
        firstEmpty,
        tailChange,
        growth,
      }),
    ),
  noise: means(noise),
  generations: means(multi),
};
writeFileSync("results/summary.json", JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
