#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildDesktopJobRequest } from "../electron/services/youtube-job-service.mjs";

const job = buildDesktopJobRequest({
  sourceType: "script",
  sourceValue: "첫 장면입니다. 둘째 장면입니다.",
  useProviderAdapter: true,
  webAgentEngine: "stagehand",
  stagehandEnabled: true,
  browserUseEnabled: true,
  computerUseEnabled: false,
});

assert.equal(job.options.useProviderAdapter, true);
assert.equal(job.options.webAgentEngine, "stagehand");
assert.equal(job.options.stagehandEnabled, true);
assert.equal(job.options.browserUseEnabled, true);
assert.equal(job.options.computerUseEnabled, false);

console.log(JSON.stringify({ ok: true, checked: "web-agent-desktop-job-mapper" }));
