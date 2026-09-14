import createLifeModule from "./life_engine.js";
// Register the listener before awaiting Wasm so the first browser message is not lost.
let modulePromise;
self.onmessage = async ({ data: { config: c, rules } }) => {
  try {
    const Life = await (modulePromise ??= createLifeModule());
    const total = rules.length * c.trials * c.noiseLevels.length;
    for (const rule of rules)
      for (const noise of c.noiseLevels)
        for (let trial = 0; trial < c.trials; trial++) {
          // Same initial and noise seeds across rules/levels: paired comparisons.
          const seed = (c.seed + Math.imul(trial + 1, 2654435761)) >>> 0;
          const result = JSON.parse(
            Life.runTrial(
              rule,
              c.states,
              noise,
              c.cols,
              c.rows,
              c.density,
              c.steps,
              seed,
            ),
          );
          result.trial = trial;
          self.postMessage({ result, total });
        }
    self.postMessage({ done: true });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
