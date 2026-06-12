import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
  validatePreFlowDurationGate,
  assertPreFlowDurationGate,
} from "./youtube-draft-duration.mjs";
import { buildResearchDraft } from "../youtube-workflow-stages.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const shortDraft = {
  script: "우리는 이렇게 알고 있죠? 작은 체구에서 뿜어져 나오는 맹렬한 권력욕과 지독한 열등감을 가리켜 나폴레옹 콤플렉스라고 부릅니다. 그런데 사실은 다릅니다. 이 우스꽝스러운 이미지는 19세기 언론이 만든 가짜 뉴스입니다.",
};

const baseJob = {
  sourceType: "script",
  options: {
    scriptLengthMode: "custom",
    customDurationSeconds: 60,
    speechSpeed: 1.05,
    mockMediaMode: false,
    flowOutputMode: "image",
  },
};

const failed = validatePreFlowDurationGate({ draft: shortDraft, job: baseJob });
assert.equal(failed.ok, false);
assert.equal(failed.failureCode, "PREFLOW_DURATION_TARGET_DRIFT");
assert.equal(failed.shouldBlockFlowSpend, true);
assert.ok(failed.estimatedSeconds < failed.minSeconds);
assert.ok(failed.recommendedTargetSeconds >= 15);
assert.ok(failed.recoveryActions.includes("adjustTargetToEstimatedDuration"));

assert.throws(
  () => assertPreFlowDurationGate({ draft: shortDraft, job: baseJob }),
  (error) => error?.code === "PREFLOW_DURATION_TARGET_DRIFT" && error?.preFlowDurationGate?.shouldBlockFlowSpend,
);

const autoDuration = validatePreFlowDurationGate({
  draft: shortDraft,
  job: {
    ...baseJob,
    options: {
      ...baseJob.options,
      scriptLengthMode: "auto",
      customDurationSeconds: 60,
    },
  },
});
assert.equal(autoDuration.ok, true);
assert.equal(autoDuration.skippedReason, "script-auto-duration");

const mockMedia = validatePreFlowDurationGate({
  draft: shortDraft,
  job: {
    ...baseJob,
    options: {
      ...baseJob.options,
      mockMediaMode: true,
    },
  },
});
assert.equal(mockMedia.ok, true);
assert.equal(mockMedia.skippedReason, "mock-media");

const stageSource = fs.readFileSync(path.join(repoRoot, "youtube-workflow-stages.mjs"), "utf8");
assert.match(stageSource, /validatePreFlowDurationGate/);
assert.match(stageSource, /runPreFlowDurationGate/);
assert.match(stageSource, /pre-flow-duration-gate/);

const emitted = [];
await assert.rejects(
  () => buildResearchDraft({
    id: "preflow-duration-fixture",
    sourceType: "script",
    sourceValue: shortDraft.script,
    options: baseJob.options,
  }, {
    jobDir: "preflow-duration-fixture",
    emit: (event) => emitted.push(event),
  }),
  (error) => error?.code === "PREFLOW_DURATION_TARGET_DRIFT",
);
assert.ok(emitted.some((event) => event.phase === "pre-flow-duration-gate" && event.type === "workflow-warning"));
assert.equal(emitted.some((event) => event.phase === "draft"), false);

console.log("Pre-Flow duration gate contract OK");
