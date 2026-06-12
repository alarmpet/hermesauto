import { createWebAgentObservation } from "../web-agent-safety.mjs";

export async function runComputerUseEngine({
  provider = "",
  task = "",
  engine = "computer-use",
  computerUseEnabled = false,
  isolatedEnvironment = false,
  noSpend = true,
} = {}) {
  if (!computerUseEnabled || !isolatedEnvironment) {
    return createWebAgentObservation({
      engine,
      provider,
      task,
      ok: false,
      failureCode: "COMPUTER_USE_DISABLED_UNSAFE_ENVIRONMENT",
      message: "Computer Use requires explicit enablement and an isolated no-spend browser/VM environment.",
      actionPolicy: { noSpend },
    });
  }
  return createWebAgentObservation({
    engine,
    provider,
    task,
    ok: false,
    failureCode: "COMPUTER_USE_MANUAL_INTEGRATION_REQUIRED",
    message: "Computer Use is gated. Add an approved API/session runner before enabling visual fallback actions.",
    actionPolicy: { noSpend },
  });
}
