#!/usr/bin/env node
import assert from "node:assert/strict";
import { runComputerUseEngine } from "../automation/web-agent-engines/computer-use-engine.mjs";

const disabled = await runComputerUseEngine({ provider: "fixture", task: "visual fallback" });
assert.equal(disabled.type, "web-agent-observation");
assert.equal(disabled.engine, "computer-use");
assert.equal(disabled.failureCode, "COMPUTER_USE_DISABLED_UNSAFE_ENVIRONMENT");
assert.equal(disabled.mediaAccepted, false);
assert.equal(disabled.actionPolicy.noSpend, true);

const gated = await runComputerUseEngine({
  provider: "fixture",
  task: "visual fallback",
  computerUseEnabled: true,
  isolatedEnvironment: true,
});
assert.equal(gated.failureCode, "COMPUTER_USE_MANUAL_INTEGRATION_REQUIRED");

console.log(JSON.stringify({ ok: true, checked: "computer-use-safety-gate" }));
