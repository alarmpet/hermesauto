import { createHash } from "node:crypto";

export function buildMeasuredVisualTimeline({
  profile,
  draftScenes = [],
  narrationManifest = {},
} = {}) {
  if (!profile?.id || !profile.visualPacing) throw timelineError("VIDEO_PROFILE_REQUIRED");
  const segments = normalizeSegments(narrationManifest.sceneTimings);
  const introSeconds = Number(profile.intro?.totalSeconds || 0);
  const durationSeconds = Number(profile.durationSeconds || 0);
  if (!segments.length || Math.abs(segments[0].startSeconds - introSeconds) > 0.001) {
    throw timelineError("NARRATION_TIMELINE_INTRO_MISMATCH");
  }
  if (Math.abs(segments.at(-1).endSeconds - durationSeconds) > 0.001) {
    throw timelineError("NARRATION_TIMELINE_DURATION_MISMATCH");
  }

  const sceneByOrder = new Map(draftScenes.map((scene) => [Number(scene.order), scene]));
  const early = profile.visualPacing.early;
  const deep = profile.visualPacing.deep;
  const earlySegments = selectTierSegments(segments, early, "early");
  const deepSegments = selectTierSegments(segments, deep, "deep");
  const rawBeats = [
    ...groupSegments(earlySegments, early, "early"),
    ...groupSegments(deepSegments, deep, "deep"),
  ];
  const maxSourceReuse = Number(profile.cachePolicy?.maxSourceReuse || 2);
  const uniqueImageBudget = Math.ceil(rawBeats.length / maxSourceReuse);
  if (uniqueImageBudget < 18 || uniqueImageBudget > 28) {
    throw timelineError("IMAGE_BUDGET_OUT_OF_RANGE");
  }
  const motionPresets = ["slow-zoom-in", "slow-pan-left", "slow-pan-right"];
  const cropAnchors = ["center", "left-third", "right-third", "upper-third"];
  const beats = rawBeats.map((beat, index) => {
    const sourceAssetSlot = (index % uniqueImageBudget) + 1;
    const reuseIndex = Math.floor(index / uniqueImageBudget) + 1;
    const sourceScene = sceneByOrder.get(beat.segmentOrders[0]) || {};
    return {
      order: index + 1,
      narration: beat.text,
      duration_seconds: beat.endSeconds - beat.startSeconds,
      timelineStartSeconds: beat.startSeconds,
      timelineEndSeconds: beat.endSeconds,
      pacingTier: beat.pacingTier,
      outputMode: "image",
      flowOutputMode: "image",
      image_prompt: sourceScene.image_prompt || sourceScene.prompt || "",
      narrationSegmentOrders: beat.segmentOrders,
      sourceAssetSlot,
      reuseIndex,
      generationRequired: reuseIndex === 1,
      motionPreset: motionPresets[(sourceAssetSlot + reuseIndex - 2) % motionPresets.length],
      cropAnchor: cropAnchors[(sourceAssetSlot + reuseIndex - 2) % cropAnchors.length],
    };
  });

  return {
    schemaVersion: 1,
    profileId: profile.id,
    narrationHash: hashNarration(segments),
    durationSeconds,
    uniqueImageBudget,
    beats,
  };
}

export function assertMeasuredVisualTimeline({
  timeline,
  narrationManifest,
  profileId,
} = {}) {
  if (!timeline || timeline.schemaVersion !== 1 || !Array.isArray(timeline.beats)) {
    throw timelineError("MEASURED_TIMELINE_INVALID");
  }
  if (profileId && timeline.profileId !== profileId) {
    throw timelineError("MEASURED_TIMELINE_PROFILE_MISMATCH");
  }
  const narrationHash = hashNarration(normalizeSegments(narrationManifest?.sceneTimings));
  if (timeline.narrationHash !== narrationHash) {
    throw timelineError("MEASURED_TIMELINE_NARRATION_MISMATCH");
  }
  return timeline;
}

function normalizeSegments(sceneTimings = []) {
  if (!Array.isArray(sceneTimings)) throw timelineError("NARRATION_TIMELINE_REQUIRED");
  const segments = sceneTimings.map((item, index) => ({
    order: Number(item.order ?? index + 1),
    text: String(item.text || item.narration || "").replace(/\s+/g, " ").trim(),
    startSeconds: Number(item.startSeconds),
    endSeconds: Number(item.endSeconds),
  }));
  for (const [index, segment] of segments.entries()) {
    if (!Number.isInteger(segment.order) || !segment.text
      || !Number.isFinite(segment.startSeconds) || !Number.isFinite(segment.endSeconds)
      || segment.endSeconds <= segment.startSeconds) {
      throw timelineError("NARRATION_TIMELINE_INVALID");
    }
    if (index > 0) {
      const prior = segments[index - 1];
      if (segment.startSeconds < prior.endSeconds - 0.001) throw timelineError("NARRATION_TIMELINE_OVERLAP");
      if (segment.startSeconds > prior.endSeconds + 0.001) throw timelineError("NARRATION_TIMELINE_GAP");
      if (segment.order <= prior.order) throw timelineError("NARRATION_TIMELINE_ORDER_INVALID");
    }
  }
  return segments;
}

function selectTierSegments(segments, range, tier) {
  const selected = segments.filter((segment) => (
    segment.startSeconds >= Number(range.start) - 0.001
    && segment.endSeconds <= Number(range.end) + 0.001
  ));
  const crossing = segments.some((segment) => (
    segment.startSeconds < Number(range.end) - 0.001
    && segment.endSeconds > Number(range.end) + 0.001
  ));
  if (crossing) throw timelineError("NARRATION_SEGMENT_CROSSES_PACING_BOUNDARY");
  if (!selected.length) throw timelineError(`NARRATION_${tier.toUpperCase()}_TIER_EMPTY`);
  return selected;
}

function groupSegments(segments, range, pacingTier) {
  const groups = [];
  let current = [];
  for (const segment of segments) {
    const proposed = [...current, segment];
    const proposedDuration = proposed.at(-1).endSeconds - proposed[0].startSeconds;
    if (current.length && proposedDuration > Number(range.max) + 0.001) {
      closeGroup(groups, current, range, pacingTier);
      current = [segment];
    } else {
      current = proposed;
    }
    const duration = current.at(-1).endSeconds - current[0].startSeconds;
    const remaining = Number(range.end) - current.at(-1).endSeconds;
    if (duration >= Number(range.target) - 0.001
      && (remaining === 0 || remaining >= Number(range.min) - 0.001)) {
      closeGroup(groups, current, range, pacingTier);
      current = [];
    }
  }
  if (current.length) {
    const duration = current.at(-1).endSeconds - current[0].startSeconds;
    if (duration < Number(range.min) - 0.001 && groups.length) {
      const previous = groups.pop();
      const merged = [...previous.segments, ...current];
      closeGroup(groups, merged, range, pacingTier);
    } else {
      closeGroup(groups, current, range, pacingTier);
    }
  }
  return groups.map(({ segments: _segments, ...group }) => group);
}

function closeGroup(groups, segments, range, pacingTier) {
  const duration = segments.at(-1).endSeconds - segments[0].startSeconds;
  if (duration < Number(range.min) - 0.001 || duration > Number(range.max) + 0.001) {
    throw timelineError(`NARRATION_${pacingTier.toUpperCase()}_BEAT_OUT_OF_RANGE`);
  }
  groups.push({
    segments,
    startSeconds: segments[0].startSeconds,
    endSeconds: segments.at(-1).endSeconds,
    text: segments.map((segment) => segment.text).join(" "),
    segmentOrders: segments.map((segment) => segment.order),
    pacingTier,
  });
}

function hashNarration(segments) {
  const canonical = segments.map((segment) => ({
    order: segment.order,
    text: segment.text,
    startSeconds: segment.startSeconds,
    endSeconds: segment.endSeconds,
  }));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function timelineError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}
