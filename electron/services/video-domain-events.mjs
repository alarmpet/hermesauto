export const VIDEO_ACTION_IDS = Object.freeze(new Set([
  "RETRY_FAILED_SCENES",
  "RENDER_EXISTING_ASSETS",
  "AUTHENTICATE_PROVIDER",
  "UPLOAD_MANUAL_MEDIA",
  "REBUILD_CAPCUT_HANDOFF",
  "RUN_LIVE_ACCEPTANCE",
]));

export function createVideoAction({
  actionId,
  targetStage,
  uiLabel,
  reason,
  command = "",
  payload = null,
} = {}) {
  if (!VIDEO_ACTION_IDS.has(actionId)) {
    throw videoEventError("VIDEO_ACTION_ID_INVALID", actionId);
  }
  if (!String(targetStage || "").trim()) throw videoEventError("VIDEO_ACTION_TARGET_REQUIRED", actionId);
  if (!String(uiLabel || "").trim()) throw videoEventError("VIDEO_ACTION_LABEL_REQUIRED", actionId);
  if (!String(reason || "").trim()) throw videoEventError("VIDEO_ACTION_REASON_REQUIRED", actionId);
  return {
    actionId,
    targetStage: String(targetStage).trim(),
    uiLabel: String(uiLabel).trim(),
    reason: String(reason).trim(),
    ...(command ? { command: String(command) } : {}),
    ...(payload && typeof payload === "object" ? { payload } : {}),
  };
}

export function normalizeVideoEvent(event = {}) {
  const nextActions = Array.isArray(event.nextActions)
    ? event.nextActions.map((action) => createVideoAction(action))
    : [];
  return {
    schemaVersion: 1,
    type: event.type || "job-progress",
    jobId: String(event.jobId || ""),
    phase: String(event.phase || "submitted"),
    status: String(event.status || "running"),
    ...event,
    nextActions,
    updatedAt: event.updatedAt || new Date().toISOString(),
  };
}

function videoEventError(code, value) {
  const error = new Error(`${code}: ${value || ""}`.trim());
  error.code = code;
  return error;
}
