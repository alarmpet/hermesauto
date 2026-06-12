#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const stages = readFileSync(resolve(root, "youtube-workflow-stages.mjs"), "utf8");

assert.match(stages, /useProviderAdapter/, "workflow should read the provider adapter rollout flag");
assert.match(stages, /createGoogleFlowProviderAdapter/, "workflow should construct the Google Flow provider adapter");
assert.match(stages, /provider-adapter-direct-bridge/, "workflow should emit a visible direct bridge event during staged rollout");
assert.match(stages, /\.generateMedia\(/, "workflow should call adapter.generateMedia when the rollout flag is enabled");
assert.match(stages, /direct-google-flow/, "workflow should identify the direct Flow bridge path");

console.log(JSON.stringify({ ok: true, checked: "provider-adapter-rollout-guard" }));
