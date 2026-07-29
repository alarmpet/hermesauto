#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  listVideoProfiles,
  loadVideoProfile,
  validateVideoProfile,
} from "./lib/video-profile-loader.mjs";

const profiles = listVideoProfiles();
assert.ok(profiles.some((item) => item.id === "history-longform-capcut-15m-v1"));

const profile = loadVideoProfile("history-longform-capcut-15m-v1");
assert.equal(profile.schemaVersion, 1);
assert.equal(profile.durationSeconds, 900);
assert.equal(profile.aspectRatio, "16:9");
assert.equal(profile.deliveryMode, "capcut-editable");
assert.deepEqual(profile.intro, { clipCount: 3, clipSeconds: 10, totalSeconds: 30 });
assert.deepEqual(profile.visualPacing.early, { start: 30, end: 180, min: 8, target: 10, max: 15 });
assert.deepEqual(profile.visualPacing.deep, { start: 180, end: 900, min: 16, target: 20, max: 30 });
assert.equal(validateVideoProfile({ ...profile, durationSeconds: 0 }).ok, false);
assert.throws(() => loadVideoProfile("../package"), /PROFILE_ID_INVALID/);

console.log(JSON.stringify({ ok: true, checked: "video-profile-contract" }));
