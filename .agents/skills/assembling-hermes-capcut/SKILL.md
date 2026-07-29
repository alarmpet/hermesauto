---
name: assembling-hermes-capcut
description: Use when a Hermes 영상/video request needs a CapCut editable draft, handoff package, measured narration timeline, or assembly check.
---

# Assembling Hermes CapCut

Prerequisite: inspect the job and require measured narration for profiles that declare it.

`npm run hermes:video -- inspect "<jobDir>" --json`

Run:

`npm run hermes:video -- run "<jobDir>" --until capcut --json-stream`

Success requires `ok:true`, CapCut artifacts, and no `MEASURED_TTS_REQUIRED` or `MEASURED_TIMELINE_INVALID`. Never claim GUI acceptance from file-only checks.

Load the router intent map only when the request is validation-only.
