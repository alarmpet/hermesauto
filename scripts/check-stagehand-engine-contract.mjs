#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runStagehandEngine } from "../automation/web-agent-engines/stagehand-engine.mjs";

const root = resolve(import.meta.dirname, "..");
const engine = readFileSync(resolve(root, "automation/web-agent-engines/stagehand-engine.mjs"), "utf8");

assert.match(engine, /@browserbase\/stagehand|stagehand/i, "Stagehand engine should probe the Stagehand SDK only when enabled");
assert.match(engine, /STAGEHAND_NOT_AVAILABLE/, "Stagehand engine should fail softly when not installed");
assert.match(engine, /noSpend/, "Stagehand engine should preserve no-spend policy");

const result = await runStagehandEngine({ provider: "fixture", task: "observe controls" });
assert.equal(result.type, "web-agent-observation");
assert.equal(result.engine, "stagehand");
assert.equal(result.mediaAccepted, false);
assert.equal(result.actionPolicy.noSpend, true);

console.log(JSON.stringify({ ok: true, checked: "stagehand-engine-contract" }));
