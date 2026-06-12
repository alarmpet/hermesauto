#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const plan = readFileSync(resolve(root, "docs/superpowers/plans/2026-06-12-web-agent-playwright-replacement-plan.md"), "utf8");

for (const name of [
  "automation/web-ui-provider-harness.mjs",
  "automation/google-flow-media.mjs",
  "automation/google-flow-output-mode.mjs",
  "automation/google-flow-ingredients.mjs",
  "automation/google-flow-chip-classifier.mjs",
  "automation/chatgpt-thumbnail-source.mjs",
  "automation/gemini-research-draft.mjs",
  "automation/chromium-window-bounds.mjs",
]) {
  assert.match(plan, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `plan should mention ${name}`);
}

console.log(JSON.stringify({ ok: true, checked: "browser-automation-inventory" }));
