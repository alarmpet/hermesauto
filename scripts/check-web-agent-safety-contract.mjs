#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  assertWebAgentSafeAction,
  createWebAgentObservation,
  isAllowedWebAgentDomain,
} from "../automation/web-agent-safety.mjs";

assert.equal(assertWebAgentSafeAction({ action: "extract visible aspect ratio", url: "https://labs.google/fx/tools/flow" }), true);
assert.equal(isAllowedWebAgentDomain("https://labs.google/fx/tools/flow"), true);
assert.equal(isAllowedWebAgentDomain("https://evil.example/fx/tools/flow"), false);

assert.throws(() => assertWebAgentSafeAction({ action: "click 승인 button", url: "https://labs.google/fx/tools/flow" }), /WEB_AGENT_HIGH_IMPACT_ACTION_BLOCKED/);
assert.throws(() => assertWebAgentSafeAction({ action: "approve paid credits", url: "https://labs.google/fx/tools/flow" }), /WEB_AGENT_HIGH_IMPACT_ACTION_BLOCKED/);
assert.throws(() => assertWebAgentSafeAction({ action: "use 15 credits", url: "https://labs.google/fx/tools/flow" }), /WEB_AGENT_SPEND_ACTION_BLOCKED/);
assert.throws(() => assertWebAgentSafeAction({ action: "extract visible state", url: "https://evil.example" }), /WEB_AGENT_DOMAIN_NOT_ALLOWED/);

const observation = createWebAgentObservation({ engine: "webwright", provider: "google-flow", ok: true });
assert.equal(observation.type, "web-agent-observation");
assert.equal(observation.mediaAccepted, false);
assert.equal(observation.actionPolicy.noHighImpactActions, true);

console.log(JSON.stringify({ ok: true, checked: "web-agent-safety-contract" }));
