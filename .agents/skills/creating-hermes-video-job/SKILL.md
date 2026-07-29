---
name: creating-hermes-video-job
description: Use when creating a new Hermes 영상/video job from an input brief, especially a profile-based long-form or CapCut request.
---

# Creating a Hermes Video Job

Prerequisites: a JSON input file and a valid profile from `npm run hermes:video -- profiles list --json`.

Run:

`npm run hermes:video -- job create --input "<input.json>" --profile "<profileId>" --json`

Success requires `ok:true`, a non-empty `jobId`, no `failureCodes`, and recorded `artifacts`. On failure, stop and return `failureCodes` plus `nextActions`; never substitute provider credentials or silently change the profile.

Load `../hermes-video-router/references/intent-map.md` only when the request also asks to resume, validate, or assemble.
