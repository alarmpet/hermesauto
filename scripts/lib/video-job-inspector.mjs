import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { createVideoAction } from "../../electron/services/video-domain-events.mjs";

const KNOWN_ARTIFACTS = Object.freeze([
  ["job-request", "job-request.json"],
  ["draft", "draft.json"],
  ["narration", "scene_audio_manifest.json"],
  ["measured-timeline", "measured-visual-timeline.json"],
  ["scene-media", "scene-media-manifest.json"],
  ["render-report", "render-report-v2.json"],
  ["capcut-handoff", "capcut-handoff.json"],
  ["final-qa", "final-output-qa.json"],
]);

export async function inspectVideoJob(jobDir, { hashFile } = {}) {
  const resolvedJobDir = resolve(String(jobDir || ""));
  if (!await isDirectory(resolvedJobDir)) throw inspectorError("JOB_DIR_INVALID", resolvedJobDir);

  const failureCodes = [];
  const artifacts = [];
  const parsed = new Map();
  for (const [kind, fileName] of KNOWN_ARTIFACTS) {
    const path = join(resolvedJobDir, fileName);
    if (!existsSync(path)) continue;
    const record = { kind, path, fileName };
    try {
      const fileStat = await stat(path);
      record.sizeBytes = fileStat.size;
      if (typeof hashFile === "function") record.sha256 = await hashFile(path);
      parsed.set(kind, JSON.parse(await readFile(path, "utf8")));
      record.validJson = true;
    } catch (error) {
      record.validJson = false;
      record.error = error.message;
      failureCodes.push("MANIFEST_JSON_INVALID");
    }
    artifacts.push(record);
  }

  const job = parsed.get("job-request");
  if (!job) failureCodes.push("JOB_REQUEST_MISSING");
  const draft = parsed.get("draft");
  const narration = parsed.get("narration");
  const measuredTimeline = parsed.get("measured-timeline");
  const sceneMedia = parsed.get("scene-media");
  const renderReport = parsed.get("render-report");
  const capcutHandoff = parsed.get("capcut-handoff");
  const finalQa = parsed.get("final-qa");

  const sceneRecords = Array.isArray(sceneMedia?.scenes) ? sceneMedia.scenes.slice(0, 100) : [];
  for (const scene of sceneRecords) {
    if (scene.failureCode) failureCodes.push(String(scene.failureCode));
    if (scene.path) {
      const mediaPath = isAbsolute(scene.path) ? scene.path : join(resolvedJobDir, scene.path);
      if (scene.status === "completed" && !existsSync(mediaPath)) failureCodes.push("ARTIFACT_MISSING");
    }
  }

  const state = resolveState({
    job,
    draft,
    narration,
    measuredTimeline,
    sceneMedia,
    renderReport,
    capcutHandoff,
    finalQa,
    failureCodes,
  });
  const resumeFrom = resolveResumeStage(state);
  const uniqueFailureCodes = [...new Set(failureCodes)].slice(0, 100);
  return {
    schemaVersion: 1,
    ok: uniqueFailureCodes.length === 0,
    jobId: String(job?.id || ""),
    profileId: String(job?.options?.profileId || job?.profileId || ""),
    state,
    artifacts: artifacts.slice(0, 100),
    failureCodes: uniqueFailureCodes,
    resumeFrom,
    nextActions: createNextActions({ state, resumeFrom, jobId: job?.id, failureCodes: uniqueFailureCodes }),
  };
}

function resolveState({
  job,
  draft,
  narration,
  measuredTimeline,
  sceneMedia,
  renderReport,
  capcutHandoff,
  finalQa,
  failureCodes,
}) {
  if (!job) return "failed";
  if (capcutHandoff?.status === "awaiting_human_review" || capcutHandoff?.awaitingHumanReview) {
    return "awaiting-human-review";
  }
  if (renderReport?.finalPath || finalQa?.finalPath || finalQa?.ok === true) return "rendered";
  const mediaScenes = Array.isArray(sceneMedia?.scenes) ? sceneMedia.scenes : [];
  if (mediaScenes.length && mediaScenes.every((scene) => scene.status === "completed")) return "media-ready";
  if (mediaScenes.length || failureCodes.some((code) => /FLOW|MEDIA|ARTIFACT/.test(code))) return "media-partial";
  if (narration || measuredTimeline) return "narration-ready";
  if (draft) return "draft-ready";
  return failureCodes.length ? "failed" : "created";
}

function resolveResumeStage(state) {
  return ({
    created: "draft",
    "draft-ready": "narration",
    "narration-ready": "media",
    "media-partial": "media",
    "media-ready": "render",
    rendered: "",
    "awaiting-human-review": "",
    failed: "",
  })[state] ?? "";
}

function createNextActions({ state, resumeFrom, jobId, failureCodes }) {
  const reason = failureCodes.length
    ? `Job has failures: ${failureCodes.join(", ")}`
    : `Job state is ${state}`;
  if (resumeFrom === "media") {
    return [createVideoAction({
      actionId: "RETRY_FAILED_SCENES",
      targetStage: "media",
      uiLabel: "실패 장면 미디어 재생성",
      reason,
      command: `npm run hermes:video -- resume "${jobId || ""}" --stage media`,
    })];
  }
  if (resumeFrom === "render") {
    return [createVideoAction({
      actionId: "RENDER_EXISTING_ASSETS",
      targetStage: "render",
      uiLabel: "기존 자산 렌더링",
      reason,
      command: `npm run hermes:video -- resume "${jobId || ""}" --stage render`,
    })];
  }
  return [];
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function inspectorError(code, value) {
  const error = new Error(`${code}: ${value}`);
  error.code = code;
  return error;
}
