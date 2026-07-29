---
name: generating-hermes-media
description: Use when a Hermes 영상/video job needs Flow/Grok images, scene media generation, failed media retries, or media-stage diagnosis.
---

# Generating Hermes Media

Prerequisite: inspect the job and confirm draft readiness.

`npm run hermes:video -- inspect "<jobDir>" --json`

Run:

`npm run hermes:video -- run "<jobDir>" --until media --json-stream`

Success requires `ok:true`, media artifacts, and empty `failureCodes`. Provider cost, authentication, or policy action requires explicit user approval; stop and report structured `nextActions`.

Load the router intent map only when inspection selects resume or validation instead.
