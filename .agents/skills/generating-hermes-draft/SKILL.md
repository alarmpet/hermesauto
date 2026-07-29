---
name: generating-hermes-draft
description: Use when a Hermes 영상/video job needs a script, narration draft, scene plan, or 대본 generated without continuing into paid media.
---

# Generating a Hermes Draft

Prerequisite: an existing job directory. Inspect it first:

`npm run hermes:video -- inspect "<jobDir>" --json`

Then run:

`npm run hermes:video -- run "<jobDir>" --until draft --json-stream`

Success requires `ok:true`, no `failureCodes`, and draft artifacts. Stop on action-required or unknown state; return `nextActions` without continuing into media.

Load the router intent map only if inspection reports a later completed stage or recovery requirement.
