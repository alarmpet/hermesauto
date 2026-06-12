import { createWebAgentObservation } from "../web-agent-safety.mjs";

export async function runStagehandEngine({
  provider = "",
  task = "",
  engine = "stagehand",
  noSpend = true,
} = {}) {
  let stagehand = null;
  try {
    stagehand = await import("@browserbase/stagehand");
  } catch {
    return createWebAgentObservation({
      engine,
      provider,
      task,
      ok: false,
      failureCode: "STAGEHAND_NOT_AVAILABLE",
      message: "Stagehand SDK is not installed. Install @browserbase/stagehand to enable selector assist.",
      actionPolicy: { noSpend },
    });
  }
  return createWebAgentObservation({
    engine,
    provider,
    task,
    ok: false,
    failureCode: "STAGEHAND_MANUAL_INTEGRATION_REQUIRED",
    message: "Stagehand is available but Hermes only permits it as a no-spend selector/extraction assist until provider adapters opt in.",
    extracted: { exports: Object.keys(stagehand || {}) },
    actionPolicy: { noSpend },
  });
}
