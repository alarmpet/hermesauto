#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runBrowserUseEngine } from "../automation/web-agent-engines/browser-use-engine.mjs";

const root = resolve(import.meta.dirname, "..");
const engine = readFileSync(resolve(root, "automation/web-agent-engines/browser-use-engine.mjs"), "utf8");

assert.match(engine, /browser_use/, "Browser Use engine should probe the Python package");
assert.match(engine, /BROWSER_USE_NOT_AVAILABLE/, "Browser Use engine should fail softly when not installed");
assert.match(engine, /noSpend/, "Browser Use engine should preserve no-spend policy");

const result = await runBrowserUseEngine({
  provider: "fixture",
  task: "observe state",
  browserUseCommand: "python",
});
assert.equal(result.type, "web-agent-observation");
assert.equal(result.engine, "browser-use");
assert.equal(result.mediaAccepted, false);

console.log(JSON.stringify({ ok: true, checked: "browser-use-engine-contract", failureCode: result.failureCode }));
