#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeYouTubeJobRequest } from "../youtube-job-schema.mjs";
import { generateYouTubeWorkflowAssets } from "../youtube-workflow.mjs";

const sourceTokens = Array.from({ length: 174 }, (_, index) => `해설${index + 1}`);
const subjects = ["왕실", "상인", "농민", "학자", "기술자", "도시", "마을", "항구", "법정", "학교", "시장", "군영", "사찰", "공방", "가문"];
const changes = ["기록을 남겼습니다", "제도를 바꾸었습니다", "갈등을 해결했습니다", "새 길을 열었습니다", "원인을 조사했습니다", "결과를 설명했습니다", "증거를 보존했습니다", "관습을 고쳤습니다", "약속을 지켰습니다", "위기를 넘겼습니다", "판단을 내렸습니다", "교훈을 전했습니다"];
const script = sourceTokens.map((token, index) => (
  `${token}에서 ${subjects[index % subjects.length]}은 ${changes[Math.floor(index / subjects.length) % changes.length]}`
)).join(". ");
const job = normalizeYouTubeJobRequest({
  sourceType: "script",
  sourceValue: script,
  options: {
    videoFormat: "longform",
    longformTargetSeconds: 900,
    scriptLengthMode: "custom",
    customDurationSeconds: 900,
    deliveryMode: "capcut-editable",
    flowOutputMode: "image",
    aspectRatio: "16:9",
  },
});
job.options.profileId = "history-longform-capcut-15m-v1";
job.options.profileVersion = 1;

const sceneTimings = sourceTokens.map((text, index) => ({
  order: index + 1,
  text,
  startSeconds: 30 + (index * 5),
  endSeconds: 35 + (index * 5),
  measuredDurationSeconds: 5,
}));
const root = await mkdtemp(join(tmpdir(), "hermes-measured-workflow-"));
const jobDir = join(root, "desktop", job.id);
const callOrder = [];
const assets = await generateYouTubeWorkflowAssets(job, {
  jobDir,
  outputDir: root,
  draft: {
    title: "Measured timeline fixture",
    script,
    duration_seconds: 900,
    scenes: sourceTokens.map((text, index) => ({
      order: index + 1,
      narration: text,
      image_prompt: `prompt ${index + 1}`,
      duration_seconds: 5,
    })),
  },
  prepareCapcutNarration: async () => {
    callOrder.push("narration");
    return {
      durationSeconds: 900,
      introDurationSeconds: 30,
      sceneTimings,
      voicePath: join(jobDir, "voice.wav"),
      srtPath: join(jobDir, "captions.srt"),
    };
  },
  generateSceneMedia: async ({ scene }) => {
    callOrder.push(`media-${scene.order}`);
    const path = join(jobDir, `scene_${scene.order}.fixture`);
    await writeFile(path, `scene ${scene.order}`);
    return { path, sceneOutputMode: "image", contentType: "image/png" };
  },
  emit: () => {},
});

assert.equal(callOrder[0], "narration", "measured narration must run before media generation");
assert.equal(assets.draft.scenes.length, 51);
assert.equal(assets.draft.scenes[0].timelineStartSeconds, 30);
assert.ok(existsSync(join(jobDir, "measured-visual-timeline.json")));
assert.equal(assets.measuredVisualTimeline.profileId, "history-longform-capcut-15m-v1");

console.log(JSON.stringify({ ok: true, checked: "measured-visual-workflow-contract" }));
