#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runVideoVerification } from "./lib/video-verification-runner.mjs";
import { analyzeYouTubeOutput } from "./analyze-youtube-output.mjs";

const calls = [];
const execute = (descriptor) => {
  calls.push(descriptor.id);
  return { id: descriptor.id, status: 0, stdout: "ok", stderr: "", durationMs: 1, failureCodes: [] };
};

const contract = runVideoVerification({ level: "contract", execute, baseline: { entries: [] } });
assert.equal(contract.ok, true);
assert.ok(calls.includes("profiles") && calls.includes("skills") && calls.includes("cli") && calls.includes("fingerprints"));
assert.equal(calls.includes("measured-timeline"), false);

calls.length = 0;
const offline = runVideoVerification({ level: "offline-e2e", execute, baseline: { entries: [] } });
assert.equal(offline.ok, true);
assert.ok(calls.includes("measured-timeline") && calls.includes("measured-workflow"));

assert.throws(
  () => runVideoVerification({ level: "live-acceptance", execute, approvedLive: false, baseline: { entries: [] } }),
  /LIVE_APPROVAL_REQUIRED/u,
);

const expired = runVideoVerification({
  level: "contract",
  now: new Date("2026-07-29T00:00:00Z"),
  baseline: { entries: [{ code: "KNOWN", scope: "profiles", expiresOn: "2026-07-28" }] },
  execute,
});
assert.ok(expired.failureCodes.includes("BASELINE_ENTRY_EXPIRED"));

const changed = runVideoVerification({
  level: "contract",
  baseline: { entries: [{ code: "KNOWN", scope: "profiles", expiresOn: "2026-08-29" }] },
  execute: (descriptor) => descriptor.id === "profiles"
    ? { id: descriptor.id, status: 1, stdout: "", stderr: "NEW", durationMs: 1, failureCodes: ["NEW"] }
    : execute(descriptor),
});
assert.equal(changed.ok, false);
assert.ok(changed.failureCodes.includes("NEW"));

const qaDir = await mkdtemp(join(tmpdir(), "hermes-three-tier-"));
await writeFile(join(qaDir, "job-request.json"), JSON.stringify({ profileId: "history-longform-capcut-15m-v1" }));
const threeTierQa = analyzeYouTubeOutput(qaDir);
assert.ok(threeTierQa.failureCodes.includes("THREE_TIER_INTRO_ASSETS_MISSING"));
assert.ok(threeTierQa.failureCodes.includes("THREE_TIER_MEASURED_TIMELINE_MISSING"));

console.log(JSON.stringify({ ok: true, checked: "video-verification-runner" }));
