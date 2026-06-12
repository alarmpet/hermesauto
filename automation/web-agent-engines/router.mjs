import { runBrowserUseEngine } from "./browser-use-engine.mjs";
import { runComputerUseEngine } from "./computer-use-engine.mjs";
import { runStagehandEngine } from "./stagehand-engine.mjs";
import { runWebwrightEngine } from "./webwright-engine.mjs";

const ENGINE_RUNNERS = new Map([
  ["webwright", runWebwrightEngine],
  ["stagehand", runStagehandEngine],
  ["browser-use", runBrowserUseEngine],
  ["computer-use", runComputerUseEngine],
]);

export function selectWebAgentEngine({ preferred = "webwright", fallback = "webwright", task = "" } = {}) {
  if (/diagnostic|reusable|script|webwright/i.test(task)) return "webwright";
  return ENGINE_RUNNERS.has(preferred) ? preferred : fallback;
}

export async function runWebAgentEngine(options = {}) {
  const engine = selectWebAgentEngine(options);
  const runner = ENGINE_RUNNERS.get(engine) || ENGINE_RUNNERS.get("webwright");
  const result = await runner({ ...options, engine });
  if (result?.ok || !options.fallback || options.fallback === engine) return result;
  const fallbackRunner = ENGINE_RUNNERS.get(options.fallback) || ENGINE_RUNNERS.get("webwright");
  return fallbackRunner({ ...options, engine: options.fallback });
}
