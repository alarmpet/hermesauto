#!/usr/bin/env node
import assert from "node:assert/strict";
import { loadVideoProfile } from "./lib/video-profile-loader.mjs";
import {
  assertMeasuredVisualTimeline,
  buildMeasuredVisualTimeline,
} from "../electron/services/measured-visual-timeline.mjs";

const profile = loadVideoProfile("history-longform-capcut-15m-v1");
const sceneTimings = Array.from({ length: 174 }, (_, index) => ({
  order: index + 1,
  text: `token-${index + 1}`,
  startSeconds: 30 + (index * 5),
  endSeconds: 35 + (index * 5),
  measuredDurationSeconds: 5,
}));
const result = buildMeasuredVisualTimeline({
  profile,
  draftScenes: sceneTimings.map((item) => ({
    order: item.order,
    narration: item.text,
    image_prompt: `prompt ${item.order}`,
  })),
  narrationManifest: {
    durationSeconds: 900,
    introDurationSeconds: 30,
    sceneTimings,
  },
});

assert.equal(result.schemaVersion, 1);
assert.equal(result.profileId, profile.id);
assert.match(result.narrationHash, /^[a-f0-9]{64}$/);
assert.equal(result.beats[0].timelineStartSeconds, 30);
assert.equal(result.beats.at(-1).timelineEndSeconds, 900);
assert.ok(result.beats.filter((beat) => beat.pacingTier === "early").every((beat) => beat.duration_seconds >= 8 && beat.duration_seconds <= 15));
assert.ok(result.beats.filter((beat) => beat.pacingTier === "deep").every((beat) => beat.duration_seconds >= 16 && beat.duration_seconds <= 30));
assert.deepEqual(
  result.beats.flatMap((beat) => beat.narration.split(/\s+/u)),
  sceneTimings.map((item) => item.text),
  "measured narration must remain ordered and appear exactly once",
);
const uniqueSlots = new Set(result.beats.map((beat) => beat.sourceAssetSlot));
assert.ok(uniqueSlots.size >= 18 && uniqueSlots.size <= 28);
const reuseCounts = new Map();
for (const beat of result.beats) {
  reuseCounts.set(beat.sourceAssetSlot, (reuseCounts.get(beat.sourceAssetSlot) || 0) + 1);
}
assert.ok([...reuseCounts.values()].every((count) => count <= 2));
assert.equal(
  assertMeasuredVisualTimeline({
    timeline: result,
    narrationManifest: { sceneTimings },
    profileId: profile.id,
  }).narrationHash,
  result.narrationHash,
);
assert.throws(
  () => assertMeasuredVisualTimeline({
    timeline: result,
    narrationManifest: { sceneTimings: sceneTimings.map((item, index) => (
      index === 0 ? { ...item, text: "변경된 해설" } : item
    )) },
    profileId: profile.id,
  }),
  /MEASURED_TIMELINE_NARRATION_MISMATCH/,
);

assert.throws(
  () => buildMeasuredVisualTimeline({
    profile,
    draftScenes: [],
    narrationManifest: {
      sceneTimings: [
        { order: 1, text: "first", startSeconds: 30, endSeconds: 40 },
        { order: 2, text: "overlap", startSeconds: 39, endSeconds: 49 },
      ],
    },
  }),
  /NARRATION_TIMELINE_OVERLAP/,
);

console.log(JSON.stringify({
  ok: true,
  checked: "measured-visual-timeline-contract",
  beatCount: result.beats.length,
  uniqueImageBudget: uniqueSlots.size,
}));
