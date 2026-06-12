#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const plan = readFileSync(resolve(root, "docs/superpowers/plans/2026-06-12-web-agent-playwright-replacement-plan.md"), "utf8");
const flow = readFileSync(resolve(root, "automation/google-flow-media.mjs"), "utf8");

for (const name of [
  "Prompt focus and entry",
  "Output settings and ingredients",
  "Generation submit and confirmation",
  "Media wait and download",
  "Evidence and retry classification",
]) {
  assert.match(plan, new RegExp(name), `plan should split Flow migration phase: ${name}`);
}

for (const fn of [
  "rejectFlowVideoCreditConfirmation",
  "probeFlowGenerationConfirmation",
  "classifyFlowGenerationFailureText",
  "verifyFlowSubmissionStarted",
  "httpUrlToBuffer",
]) {
  assert.match(flow, new RegExp(fn), `existing Flow implementation should still expose ${fn}`);
}

console.log(JSON.stringify({ ok: true, checked: "google-flow-state-machine-map" }));
