# Intent map

| Intent | Skill |
|---|---|
| 새 영상, new job, 15-minute video | `creating-hermes-video-job` |
| script, draft, 대본 | `generating-hermes-draft` |
| Flow/Grok, image/video, media, 장면 | `generating-hermes-media` |
| CapCut, editable draft, handoff | `assembling-hermes-capcut` |
| failed scene, resume, retry, 이어서 | `resuming-hermes-video-job` |
| verify, validate, QA, 검증, hash mismatch | `validating-hermes-video` |

When multiple intents appear, inspect first and select the skill matching `resumeFrom`; validation wins when the user asks only for review.
