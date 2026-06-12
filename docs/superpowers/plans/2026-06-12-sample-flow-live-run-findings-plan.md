# Hermes Studio Sample Flow Live Run Findings Plan

## Summary

2026-06-12 live smoke run used Hermes Studio's desktop job service with Google Flow image mode, Nano Banana Pro, 9:16, one image per scene, `useProviderAdapter=true`, and the existing authenticated Flow profile.

Result:

- Google Flow settings no-spend check passed before submit.
- Google Flow generated 4 real images successfully.
- Hermes converted all 4 images into motion clips.
- Initial end-to-end job failed only at final output QA with `TARGET_DURATION_DRIFT`.
- Re-rendering the same generated Flow assets with target duration adjusted from 35s to 26s produced an accepted final video.

Artifacts:

- Job dir: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-sample-flow-final-1781235530671`
- Accepted final video: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-sample-flow-final-1781235530671\desktop-flow-accepted-26s.mp4`
- QA result after accepted re-render: `ok=true`, `targetSeconds=26`, `finalDuration=26.03`, `durationDrift=0.03`
- Flow images: `scene_1_flow.jpg` through `scene_4_flow.jpg`, all non-placeholder JPGs between 491KB and 753KB.

## Findings

### P0: Desktop Mapper Dropped Web-Agent Options

Before this run, `useProviderAdapter`, `webAgentEngine`, and related engine flags existed in UI/config/schema but were not passed through `buildDesktopJobRequest()`. This meant Hermes Studio could show the options while the actual job ignored them.

Status: fixed in this session.

Verification:

- `node scripts/check-web-agent-desktop-job-mapper.mjs`
- `npm.cmd run check:web-agent-runtime-contract`

### P0: Duration Failure Happens After Expensive Flow Generation

The sample script was too short for `customDurationSeconds=35`.

Observed:

- Draft duration QA estimated about 23.38s but allowed the job through with `provider-soft`.
- TTS/audio manifest duration was about 25.796s.
- Initial final video duration was 26.03s.
- Final QA failed with `TARGET_DURATION_DRIFT` because target was still 35s.

Impact:

- Flow spent real generation requests for all scenes before Hermes rejected the final output.
- This is expensive and frustrating because the failure was predictable from the script length before Flow submission.

### P1: No Automatic Final Re-Render Recovery

A valid final MP4 existed even when the job failed. After adjusting `render-options.json`, `job-request.json`, and `draft.json` target duration to 26s, re-rendering the same assets passed QA without regenerating Flow media.

Hermes should offer an automatic recovery path:

- If only `TARGET_DURATION_DRIFT` fails and final/audio/subtitle sync is good, suggest or perform a no-Flow re-render with actual TTS duration as target.
- Preserve original target metadata in backup files.
- Emit a clear progress event: `final-duration-target-auto-adjusted`.

### P1: Scene Media Manifest Fields Are Ambiguous For Image Mode

In `scene-media-manifest.json`, image-mode scenes show:

- `path`: `scene_N.mp4`
- `contentType`: `video/mp4`
- `bytes`: size of the original Flow JPG
- `sceneOutputMode`: `image`

This is confusing because one record mixes generated image facts and rendered clip facts.

Required improvement:

- Split fields into `sourceImagePath`, `sourceImageBytes`, `sourceImageContentType`, `renderedClipPath`, `renderedClipContentType`, `renderedClipBytes`.
- Keep backward-compatible `path` only as the rendered clip path.

### P1: Adapter Direct Bridge Works But Is Still Transitional

The run emitted `provider-adapter-direct-bridge` for all 4 scenes, proving the Studio option now reaches the workflow. However, the adapter still delegates full generation to `generateGoogleFlowVideoFromPrompt()`.

Next migration should move one phase at a time:

1. Prompt focus and fill.
2. Settings verification.
3. Submit confirmation and paid-credit rejection.
4. Media wait and authenticated download.
5. Evidence and retry classification.

### P2: Progress Events Are Noisy

Most Flow progress messages are emitted twice as both `flow-progress` and `flow-media`. This makes the console harder to scan.

Recommended:

- Keep `flow-media` for structured media telemetry.
- Keep `flow-progress` for user-facing status.
- Collapse duplicate text messages in the UI console by `(sceneOrder, phase, message)` within a short time window.

### P2: Motion Variety Was Acceptable In This Run

Observed motion presets:

- Scene 1: `slow-pan-down`
- Scene 2: `reverse-diagonal-drift`
- Scene 3: `slow-pull-back`
- Scene 4: `slow-pan-up`

This is more varied than the earlier left-to-right-only problem. Keep monitoring over longer jobs.

## Implementation Plan

### Task 1: Add Pre-Flow Duration Gate

- Add a check after direct-script draft normalization and before Flow generation.
- If `sourceType=script`, `customDurationSeconds` is user-selected, and estimated narration duration is below 80% of target, stop before Flow.
- Offer two recovery choices in job details:
  - `adjustTargetToEstimatedDuration`
  - `expandScriptBeforeFlow`

Verification:

- Add `scripts/check-pre-flow-duration-gate.mjs`.
- Test that a 26s script with 35s target fails before any `flow-submit` event.

### Task 2: Add No-Flow Duration Recovery Render

- If final QA only fails `TARGET_DURATION_DRIFT`, compute target from `scene_audio_manifest.json` or `render-report-v2.json`.
- Back up target metadata.
- Re-run `render-youtube-with-tts.mjs` with adjusted target and a new final filename.
- Re-run `analyzeYouTubeOutput()`.

Verification:

- Add fixture test using this job pattern.
- Assert accepted render has `ok=true` and does not touch Flow media files.

### Task 3: Split Image Manifest Fields

- Update scene media manifest writer for image mode.
- Preserve `path` for rendered clip compatibility.
- Add explicit source/rendered fields.

Verification:

- Add contract test checking image-mode scenes include both source image and rendered clip metadata.

### Task 4: Continue Adapter Phase Migration

- Move `writeEvidence()` and `classifyFailure()` usage into the direct Flow path at failure points.
- Then migrate authenticated download to `adapter.downloadMedia()`.
- Keep direct bridge rollback until image and video live smoke jobs pass.

Verification:

- `npm.cmd run check:web-agent-runtime-contract`
- One image-mode live smoke.
- One no-spend settings smoke for video mode.

## Current Verdict

Google Flow image generation is currently usable for short sample jobs. The major blocker is not Flow control in this run; it is late duration validation. Hermes should prevent or auto-recover `TARGET_DURATION_DRIFT` before spending more Flow generations.
