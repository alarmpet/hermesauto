#!/usr/bin/env node
import assert from "node:assert/strict";
import { runWebAgentEngine, selectWebAgentEngine } from "../automation/web-agent-engines/router.mjs";

assert.equal(selectWebAgentEngine({ preferred: "stagehand" }), "stagehand");
assert.equal(selectWebAgentEngine({ preferred: "missing", fallback: "webwright" }), "webwright");
assert.equal(selectWebAgentEngine({ preferred: "browser-use", task: "write reusable diagnostic script" }), "webwright");

const stagehand = await runWebAgentEngine({ preferred: "stagehand", provider: "fixture", task: "observe create button" });
assert.equal(stagehand.type, "web-agent-observation");
assert.equal(stagehand.engine, "stagehand");
assert.equal(stagehand.mediaAccepted, false);
assert.equal(stagehand.actionPolicy.noSpend, true);

console.log(JSON.stringify({ ok: true, checked: "web-agent-engine-router" }));
