---
name: resuming-hermes-video-job
description: Use when a Hermes 영상/video job is partial, interrupted, failed at a scene, needs retry/이어서 하기, or should reuse valid artifacts.
---

# Resuming a Hermes Video Job

Inspect first:

`npm run hermes:video -- inspect "<jobDir>" --json`

Use its `resumeFrom`:

`npm run hermes:video -- resume "<jobDir>" --stage "<resumeFrom>" --json-stream`

Success requires `ok:true`, empty `failureCodes`, and updated artifacts. Never mark replaced or hash-mismatched files complete. If `resumeFrom` is empty or an action requires authentication/payment, stop and return `nextActions`.

Load the router intent map only when inspection recommends validation rather than resume.
