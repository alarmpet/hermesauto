#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inspectVideoJob } from "./lib/video-job-inspector.mjs";

const fixtureDir = resolve("scripts/fixtures/video-jobs/media-partial");
const result = await inspectVideoJob(fixtureDir);
assert.equal(result.schemaVersion, 1);
assert.equal(result.jobId, "youtube-media-partial");
assert.equal(result.profileId, "history-longform-capcut-15m-v1");
assert.equal(result.state, "media-partial");
assert.equal(result.resumeFrom, "media");
assert.ok(result.failureCodes.includes("FLOW_MODE_MISMATCH"));
assert.equal(result.nextActions[0].actionId, "RETRY_FAILED_SCENES");
assert.equal(result.nextActions[0].targetStage, "media");
assert.ok(result.artifacts.length <= 100);

const root = mkdtempSync(join(tmpdir(), "hermes inspector with spaces "));
const malformedDir = join(root, "broken job");
mkdirSync(malformedDir);
writeFileSync(join(malformedDir, "job-request.json"), JSON.stringify({ id: "broken-job", options: {} }));
writeFileSync(join(malformedDir, "scene-media-manifest.json"), "{not-json");
const malformed = await inspectVideoJob(malformedDir);
assert.equal(malformed.ok, false);
assert.ok(malformed.failureCodes.includes("MANIFEST_JSON_INVALID"));

await assert.rejects(
  () => inspectVideoJob(join(root, "missing")),
  /JOB_DIR_INVALID/,
);

console.log(JSON.stringify({ ok: true, checked: "video-job-inspector-contract" }));
