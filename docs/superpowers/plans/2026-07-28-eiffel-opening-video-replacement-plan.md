# Eiffel Opening Video Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new editable CapCut draft whose first 30 seconds use `scene1.mp4`, `scene2.mp4`, and `scene3.mp4` from Downloads while preserving the existing narration, captions, total duration, and all later Eiffel-job media.

**Architecture:** Validate and normalize the three supplied clips to silent 1920×1080 10-second assets. Create a derived edit plan instead of mutating the canonical handoff: the three new clips occupy 0–30 seconds, the remaining 18.802925 seconds before original scene 4 are filled by the existing scene-3 image-motion clip, and original scene 4 onward remains sequential and unchanged. Build a uniquely named CapCut draft through the existing verified Python builder.

**Tech Stack:** Node.js, FFmpeg/ffprobe, JSON, pycapcut, CapCut 8.9.1.

## Global Constraints

- Source job: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run`
- Inputs: `C:\Users\amd\Downloads\scene1.mp4`, `scene2.mp4`, `scene3.mp4`
- Output aspect ratio: 16:9, 1920×1080
- Each replacement occupies exactly 10 seconds and is muted.
- Existing narration, captions, scene 4 onward media durations, and total project duration remain unchanged.
- Canonical `capcut-handoff\edit-plan.json` and the existing CapCut draft are not overwritten.

---

### Task 1: Validate and Normalize User Videos

**Files:**
- Read: `C:\Users\amd\Downloads\scene1.mp4`
- Read: `C:\Users\amd\Downloads\scene2.mp4`
- Read: `C:\Users\amd\Downloads\scene3.mp4`
- Create: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run\manual-video-replacement\scene-1.mp4`
- Create: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run\manual-video-replacement\scene-2.mp4`
- Create: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run\manual-video-replacement\scene-3.mp4`

**Interfaces:**
- Consumes: Three user-generated MP4 files.
- Produces: Three silent H.264 1920×1080 MP4 files, each exactly 10 seconds.

- [ ] **Step 1: Probe the three source files**

Run ffprobe for duration, width, height, codecs, and audio streams. Expected: all three contain readable video near 10 seconds.

- [ ] **Step 2: Normalize each clip**

Run FFmpeg with scale-and-crop to 1920×1080, 30 fps, H.264/yuv420p, no audio, and an exact 10-second output duration.

- [ ] **Step 3: Probe normalized outputs**

Expected: duration 10.00±0.05 seconds, 1920×1080, H.264 video, and no audio stream.

### Task 2: Create a Non-Destructive Replacement Edit Plan

**Files:**
- Read: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run\capcut-handoff\edit-plan.json`
- Create: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run\manual-video-replacement\edit-plan.json`

**Interfaces:**
- Consumes: Three normalized clips and the canonical edit plan.
- Produces: A complete derived edit plan accepted by `build_hermes_editable_draft.py`.

- [ ] **Step 1: Build replacement video entries**

Create sequential muted entries for the three normalized clips with `targetDuration`, `sourceDuration`, and `materialDuration` set to 10 seconds.

- [ ] **Step 2: Preserve the pre-scene-4 remainder**

Append the existing scene-3 editable clip for `48.80292517006802 - 30 = 18.80292517006802` seconds, then append the canonical scene-4 and later entries unchanged.

- [ ] **Step 3: Validate plan arithmetic**

Assert that the first three entries total 30 seconds, scene 4 still begins after a cumulative 48.80292517006802 seconds, every media path exists, the video track duration matches the original plan within 0.05 seconds, and narration/caption inputs are unchanged.

### Task 3: Build and Verify the New Editable CapCut Draft

**Files:**
- Read: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run\capcut-handoff\captions.srt`
- Read: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run\capcut-handoff\caption-style.json`
- Create: a unique project under `C:\Users\amd\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft`

**Interfaces:**
- Consumes: Derived edit plan, captions, and caption style.
- Produces: A new editable CapCut project without modifying the prior project.

- [ ] **Step 1: Run the verified draft builder**

Use `C:\Users\amd\AppData\Roaming\hermes\runtimes\pycapcut\.venv\Scripts\python.exe` with `scripts\capcut\build_hermes_editable_draft.py`, recipe `basic_video_voice_srt`, and a unique draft name.

- [ ] **Step 2: Inspect builder result**

Expected: success, 51 video segments (three replacements, one scene-3 remainder, and original scene 4 onward), one narration segment, existing caption cue count, 16:9 canvas, and muted video.

- [ ] **Step 3: Verify the generated draft**

Confirm the new draft directory exists, its JSON references all three normalized replacement paths, its first three clip durations total 30 seconds, its voice/subtitle tracks exist, and its total duration matches the canonical draft.

- [ ] **Step 4: Report handoff**

Report the new CapCut draft name and directory, the backup/non-destructive status, validation results, and the next manual review action in CapCut.
