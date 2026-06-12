#!/usr/bin/env node
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

async function mustExist(path) {
  await access(resolve(root, path), constants.R_OK);
}

for (const path of [
  "automation/web-agent-engines/router.mjs",
  "automation/web-agent-engines/webwright-engine.mjs",
  "automation/web-agent-engines/stagehand-engine.mjs",
  "automation/web-agent-engines/browser-use-engine.mjs",
  "automation/web-agent-engines/computer-use-engine.mjs",
  "automation/google-flow-provider-adapter.mjs",
  "automation/providers/provider-browser-session.mjs",
]) {
  await mustExist(path);
}

const router = await readFile(resolve(root, "automation/web-agent-engines/router.mjs"), "utf8");
assert.match(router, /fallback/, "router should preserve fallback behavior");
assert.match(router, /webwright/, "router should keep webwright as default diagnostics engine");

const adapter = await readFile(resolve(root, "automation/google-flow-provider-adapter.mjs"), "utf8");
for (const method of [
  "configureSettings",
  "uploadIngredients",
  "submitGeneration",
  "handleConfirmation",
  "waitForMedia",
  "getAuthCookies",
  "downloadMedia",
  "writeEvidence",
  "classifyFailure",
  "inspectWithWebAgent",
]) {
  assert.match(adapter, new RegExp(method), `adapter should expose ${method}`);
}

console.log(JSON.stringify({ ok: true, checked: "web-agent-runtime-contract" }));
