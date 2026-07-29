#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createVideoAction,
  normalizeVideoEvent,
} from "../electron/services/video-domain-events.mjs";

const action = createVideoAction({
  actionId: "RETRY_FAILED_SCENES",
  targetStage: "media",
  uiLabel: "실패 장면 미디어 재생성",
  reason: "scene 5 failed",
});
assert.equal(action.actionId, "RETRY_FAILED_SCENES");
assert.throws(
  () => createVideoAction({
    actionId: "FREE_FORM",
    targetStage: "media",
    uiLabel: "x",
    reason: "x",
  }),
  /VIDEO_ACTION_ID_INVALID/,
);

const event = normalizeVideoEvent({
  jobId: "job-1",
  phase: "flow-media",
  status: "action-required",
  nextActions: [action],
});
assert.equal(event.schemaVersion, 1);
assert.equal(event.nextActions[0].targetStage, "media");
assert.throws(
  () => normalizeVideoEvent({ phase: "flow-media", nextActions: [{ actionId: "FREE_FORM" }] }),
  /VIDEO_ACTION_ID_INVALID/,
);

console.log(JSON.stringify({ ok: true, checked: "video-domain-event-contract" }));
