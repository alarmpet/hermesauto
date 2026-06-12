#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_CONFIG } from "../electron/services/config-store.mjs";
import { DEFAULT_YOUTUBE_JOB_OPTIONS } from "../youtube-job-schema.mjs";

const root = resolve(import.meta.dirname, "..");
const renderer = readFileSync(resolve(root, "electron/renderer/app.js"), "utf8");
const html = readFileSync(resolve(root, "electron/renderer/index.html"), "utf8");
const packageJson = readFileSync(resolve(root, "package.json"), "utf8");

for (const key of [
  "useProviderAdapter",
  "webAgentEngine",
  "stagehandEnabled",
  "browserUseEnabled",
  "computerUseEnabled",
]) {
  assert.ok(Object.hasOwn(DEFAULT_CONFIG, key), `DEFAULT_CONFIG should expose ${key}`);
  assert.ok(Object.hasOwn(DEFAULT_CONFIG.defaults, key), `DEFAULT_CONFIG.defaults should expose ${key}`);
  assert.ok(Object.hasOwn(DEFAULT_YOUTUBE_JOB_OPTIONS, key), `DEFAULT_YOUTUBE_JOB_OPTIONS should expose ${key}`);
  assert.match(renderer, new RegExp(key), `renderer should wire ${key}`);
  assert.match(html, new RegExp(key), `HTML should expose ${key}`);
}

assert.equal(DEFAULT_CONFIG.useProviderAdapter, false);
assert.equal(DEFAULT_YOUTUBE_JOB_OPTIONS.useProviderAdapter, false);
assert.match(packageJson, /check-web-agent-config-contract\.mjs/, "package checks should include web-agent config contract");

console.log(JSON.stringify({ ok: true, checked: "web-agent-config-contract" }));
