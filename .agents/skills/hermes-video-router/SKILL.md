---
name: hermes-video-router
description: Use when a Hermes request mentions 영상/video, job creation, draft, Flow/Grok media, CapCut, resume/recovery, render, or video QA.
---

# Hermes Video Router

If a job directory exists, first run:

`npm run hermes:video -- inspect "<jobDir>" --json`

Select exactly one focused skill from [references/intent-map.md](references/intent-map.md):

- `creating-hermes-video-job`
- `generating-hermes-draft`
- `generating-hermes-media`
- `assembling-hermes-capcut`
- `resuming-hermes-video-job`
- `validating-hermes-video`

Do not read `youtube-workflow.mjs` unless the CLI returns `SOURCE_INSPECTION_REQUIRED`.

Return the selected skill, executed command, and bounded JSON result. Treat `failureCodes` and `nextActions` as authoritative.
