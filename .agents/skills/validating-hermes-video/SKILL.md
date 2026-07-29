---
name: validating-hermes-video
description: Use when reviewing Hermes 영상/video QA, CapCut handoff validity, fingerprints, profile compliance, offline checks, or hash mismatch failures.
---

# Validating a Hermes Video

Prerequisite: a job directory for job QA, or the repository for contract checks.

Run:

`npm run hermes:video -- verify "<jobDir>" --level contract --json`

Use `--level offline-e2e` only for local synthetic verification. `live-acceptance` additionally requires explicit approval and `--approved-live`.

Success requires `ok:true` and empty `failureCodes`. Report every code and bounded artifact list. Do not convert skipped live checks into success.

Load the router intent map only when QA recommends a recovery action.
