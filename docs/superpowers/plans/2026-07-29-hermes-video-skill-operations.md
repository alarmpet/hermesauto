# Hermes Video Skill Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codex·Claude·Gemini가 전체 Hermes 영상 코드베이스를 재독해하지 않고도 공통 스킬과 결정론적 명령으로 영상 job 생성, 실행, 재개와 검증을 수행하게 한다.

**Architecture:** `.agents/skills/`를 스킬의 canonical source로 두고, 작은 router/task skill이 공용 application service를 호출하는 통합 CLI를 선택한다. CLI와 Electron은 동일 service와 domain event/action contract를 공유하며, CapCut three-tier profile은 예상 장면 계획 후 측정된 TTS로 adaptive timeline을 다시 생성한다. 원본 생성 자산과 파생 렌더는 서로 다른 cache key를 사용한다.

**Tech Stack:** Node.js ESM, Electron IPC, existing Hermes YouTube workflow, FFmpeg/ffprobe, JSON Schema-style validation, Agent Skills open standard, PowerShell-compatible npm scripts.

## Global Constraints

- Canonical skill source는 repository의 `.agents/skills/`이며 생성된 Codex·Claude·Gemini 복사본을 직접 편집하지 않는다.
- router `SKILL.md`는 200단어 이내, task skill은 각 500단어 이내를 목표로 한다.
- skill은 판단과 명령 선택만 담당하고 파일 탐색, hash, 상태 판정과 검증은 JavaScript가 담당한다.
- CLI와 Electron은 subprocess로 서로를 호출하지 않고 동일한 application service를 import한다.
- stdout의 최종 결과는 versioned JSON envelope이며 진행 이벤트는 event sink 또는 `--json-stream` NDJSON으로 전달한다.
- three-tier CapCut profile은 measured TTS timeline 없이는 media generation과 handoff를 시작하지 않는다.
- 일반 Hermes render와 Shorts의 기존 실행 순서는 변경하지 않는다.
- source asset은 `sourceContentHash`와 `generationKey`, 파생 render는 `renderKey`로 검증한다.
- 기존 baseline 실패를 새 회귀로 오인하지 않되 만료일 없는 allowlist를 만들지 않는다.
- 실제 provider 호출, 유료 생성과 CapCut GUI acceptance는 자동 CI에서 실행하지 않는다.

---

### Task 1: Versioned Video Profile Registry

**Files:**
- Create: `config/video-profiles/history-longform-capcut-15m-v1.json`
- Create: `config/video-profiles/profile-schema.v1.json`
- Create: `scripts/lib/video-profile-loader.mjs`
- Create: `scripts/check-video-profile-contract.mjs`
- Modify: `package.json`
- Modify: `C:/Users/amd/.gemini/antigravity/brain/c3d6c36a-a9d2-4a16-bf61-c7160da7bbfe/research.md`

**Interfaces:**
- Produces: `loadVideoProfile(profileId, { rootDir? }): object`
- Produces: `listVideoProfiles({ rootDir? }): Array<{ id, schemaVersion, path }>`
- Produces: `validateVideoProfile(profile): { ok, errors: Array<{ path, code, message }> }`
- Consumes: no earlier task.

- [ ] **Step 1: Write the failing profile contract**

Create `scripts/check-video-profile-contract.mjs`:

```js
import assert from "node:assert/strict";
import { loadVideoProfile, listVideoProfiles, validateVideoProfile } from "./lib/video-profile-loader.mjs";

const profiles = listVideoProfiles();
assert.ok(profiles.some((item) => item.id === "history-longform-capcut-15m-v1"));

const profile = loadVideoProfile("history-longform-capcut-15m-v1");
assert.equal(profile.schemaVersion, 1);
assert.equal(profile.durationSeconds, 900);
assert.equal(profile.aspectRatio, "16:9");
assert.equal(profile.deliveryMode, "capcut-editable");
assert.deepEqual(profile.intro, { clipCount: 3, clipSeconds: 10, totalSeconds: 30 });
assert.deepEqual(profile.visualPacing.early, { start: 30, end: 180, min: 8, target: 10, max: 15 });
assert.deepEqual(profile.visualPacing.deep, { start: 180, end: 900, min: 16, target: 20, max: 30 });
assert.equal(validateVideoProfile({ ...profile, durationSeconds: 0 }).ok, false);
assert.throws(() => loadVideoProfile("../package"), /PROFILE_ID_INVALID/);
console.log(JSON.stringify({ ok: true, checked: "video-profile-contract" }));
```

- [ ] **Step 2: Run RED**

Run: `node scripts/check-video-profile-contract.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `video-profile-loader.mjs`.

- [ ] **Step 3: Add the profile schema and profile**

Define required fields and closed enums in `profile-schema.v1.json`. Create the production profile with the exact values asserted above. Add:

```json
{
  "tts": { "engine": "supertonic3", "voice": "male_30_announcer", "speed": 1.02 },
  "captions": { "maxCharactersPerLine": 25 },
  "cachePolicy": { "sourceHash": "sha256", "maxSourceReuse": 2 },
  "requiresMeasuredTimeline": true
}
```

- [ ] **Step 4: Implement the loader**

`video-profile-loader.mjs` must reject IDs outside `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, resolve only inside `config/video-profiles`, validate boundary continuity, validate `min <= target <= max`, and return stable error codes `PROFILE_ID_INVALID`, `PROFILE_NOT_FOUND`, or `PROFILE_SCHEMA_INVALID`.

- [ ] **Step 5: Update research.md**

Replace runtime-authoritative wording with:

```markdown
실행 시 사용하는 숫자의 단일 원본은
`config/video-profiles/history-longform-capcut-15m-v1.json`이다.
이 문서의 3분 이후 30~60초 전환은 비교 실험 후보이며 기본 production profile이 아니다.
실험하려면 별도 profile ID를 생성하고 acceptance 결과를 기록한다.
```

- [ ] **Step 6: Run GREEN**

Run: `node scripts/check-video-profile-contract.mjs`

Expected: `{"ok":true,"checked":"video-profile-contract"}`.

- [ ] **Step 7: Register and commit**

Add `"check:video-profiles": "node scripts/check-video-profile-contract.mjs"` to `package.json`.

```powershell
git add config/video-profiles scripts/lib/video-profile-loader.mjs scripts/check-video-profile-contract.mjs package.json
git commit -m "feat: add versioned video profile registry"
```

Do not add the external Antigravity `research.md` path to the repository commit.

---

### Task 2: Shared Domain Event and Recovery Action Contract

**Files:**
- Create: `electron/services/video-domain-events.mjs`
- Create: `scripts/check-video-domain-event-contract.mjs`
- Modify: `electron/services/job-progress-events.mjs`
- Modify: `electron/renderer/app.js`
- Modify: `scripts/check-desktop-recovery-actions.mjs`

**Interfaces:**
- Produces: `VIDEO_ACTION_IDS: ReadonlySet<string>`
- Produces: `createVideoAction({ actionId, targetStage, uiLabel, reason, command?, payload? })`
- Produces: `normalizeVideoEvent(event): VideoDomainEvent`
- Consumes: existing `createJobProgressEvent()`.

- [ ] **Step 1: Write failing action contract**

```js
import assert from "node:assert/strict";
import { createVideoAction, normalizeVideoEvent } from "../electron/services/video-domain-events.mjs";

const action = createVideoAction({
  actionId: "RETRY_FAILED_SCENES",
  targetStage: "media",
  uiLabel: "실패 장면 미디어 재생성",
  reason: "scene 5 failed",
});
assert.equal(action.actionId, "RETRY_FAILED_SCENES");
assert.throws(
  () => createVideoAction({ actionId: "FREE_FORM", targetStage: "media", uiLabel: "x", reason: "x" }),
  /VIDEO_ACTION_ID_INVALID/,
);
const event = normalizeVideoEvent({ jobId: "job-1", phase: "flow-media", status: "action-required", nextActions: [action] });
assert.equal(event.schemaVersion, 1);
assert.equal(event.nextActions[0].targetStage, "media");
```

- [ ] **Step 2: Run RED**

Run: `node scripts/check-video-domain-event-contract.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement the registry**

Allow only:

```js
[
  "RETRY_FAILED_SCENES",
  "RENDER_EXISTING_ASSETS",
  "AUTHENTICATE_PROVIDER",
  "UPLOAD_MANUAL_MEDIA",
  "REBUILD_CAPCUT_HANDOFF",
  "RUN_LIVE_ACCEPTANCE",
]
```

Require `targetStage`, `uiLabel`, and `reason`. Keep `command` optional because Electron executes IPC actions while CLI consumers use commands.

- [ ] **Step 4: Adapt existing progress events**

Keep `actionRequired.title/message` for backward compatibility. Add `nextActions` using registered action IDs for existing manual upload, Flow authentication/cooldown, CapCut runtime and render recovery cases. Do not remove existing renderer behavior in this task.

- [ ] **Step 5: Render structured actions**

Update `app.js` so an event with `nextActions` maps known `actionId` values to existing `retryFailedScenesBtn` and `renderExistingAssetsBtn`. Unknown values remain hidden and are logged; they must not execute arbitrary `command` strings in the renderer.

- [ ] **Step 6: Verify**

Run:

```powershell
node scripts/check-video-domain-event-contract.mjs
node scripts/check-desktop-recovery-actions.mjs
npm run check:desktop-progress
```

Expected: all exit 0.

- [ ] **Step 7: Commit**

```powershell
git add electron/services/video-domain-events.mjs electron/services/job-progress-events.mjs electron/renderer/app.js scripts/check-video-domain-event-contract.mjs scripts/check-desktop-recovery-actions.mjs
git commit -m "feat: standardize video recovery actions"
```

---

### Task 3: Read-Only Job Inspector

**Files:**
- Create: `scripts/lib/video-job-inspector.mjs`
- Create: `scripts/fixtures/video-jobs/media-partial/job-request.json`
- Create: `scripts/fixtures/video-jobs/media-partial/draft.json`
- Create: `scripts/fixtures/video-jobs/media-partial/scene-media-manifest.json`
- Create: `scripts/check-video-job-inspector-contract.mjs`

**Interfaces:**
- Produces: `inspectVideoJob(jobDir, { hashFile? }): Promise<JobInspection>`
- `JobInspection`: `{ schemaVersion, ok, jobId, profileId, state, artifacts, failureCodes, resumeFrom, nextActions }`
- Consumes: Task 1 profile loader and Task 2 action contract.

- [ ] **Step 1: Create a failing media-partial fixture**

Fixture must contain two planned scenes. Scene 1 has a completed manifest record pointing to an existing fixture asset; scene 2 has status `failed` with `FLOW_MODE_MISMATCH`.

- [ ] **Step 2: Write failing inspector assertions**

```js
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { inspectVideoJob } from "./lib/video-job-inspector.mjs";

const result = await inspectVideoJob(resolve("scripts/fixtures/video-jobs/media-partial"));
assert.equal(result.schemaVersion, 1);
assert.equal(result.state, "media-partial");
assert.equal(result.resumeFrom, "media");
assert.ok(result.failureCodes.includes("FLOW_MODE_MISMATCH"));
assert.equal(result.nextActions[0].actionId, "RETRY_FAILED_SCENES");
assert.equal(result.nextActions[0].targetStage, "media");
```

- [ ] **Step 3: Run RED**

Run: `node scripts/check-video-job-inspector-contract.mjs`

Expected: module-not-found failure.

- [ ] **Step 4: Implement bounded inspection**

Read only the known manifest filenames. Do not recursively enumerate the job directory. Limit returned artifacts to 100 records and failure codes to unique values. States are:

```js
["created", "draft-ready", "narration-ready", "media-partial", "media-ready", "rendered", "awaiting-human-review", "failed"]
```

Inspection must never mutate files or start providers.

- [ ] **Step 5: Add corrupt manifest and path tests**

Assert `JOB_DIR_INVALID`, `JOB_REQUEST_MISSING`, `MANIFEST_JSON_INVALID`, and a Windows path containing spaces. Confirm the inspector returns failure codes rather than throwing for malformed job artifacts; invalid job directory itself may throw.

- [ ] **Step 6: Verify and commit**

Run: `node scripts/check-video-job-inspector-contract.mjs`

```powershell
git add scripts/lib/video-job-inspector.mjs scripts/fixtures/video-jobs/media-partial scripts/check-video-job-inspector-contract.mjs
git commit -m "feat: inspect resumable video jobs"
```

---

### Task 4: Layered Asset and Render Fingerprints

**Files:**
- Create: `electron/services/video-artifact-fingerprints.mjs`
- Create: `scripts/check-video-artifact-fingerprints.mjs`
- Modify: `youtube-workflow.mjs`
- Modify: `electron/services/image-scene-renderer.mjs`
- Modify: `scripts/check-longform-scene-resume-contract.mjs`

**Interfaces:**
- Produces: `hashFileSha256(path): string`
- Produces: `createGenerationKey({ profileVersion, provider, model, normalizedPrompt, settings }): string`
- Produces: `createRenderKey({ sourceContentHash, timelineSlice, motion, crop, overlays, rendererVersion }): string`
- Consumes: manifest records from existing scene media workflow.

- [ ] **Step 1: Write failing deterministic fingerprint tests**

Assert identical canonical objects yield identical keys regardless of property insertion order. Assert changes to prompt/provider change `generationKey`; changes to caption/timeline change `renderKey` but not `sourceContentHash`.

- [ ] **Step 2: Run RED**

Run: `node scripts/check-video-artifact-fingerprints.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement canonical hashing**

Implement recursive object-key sorting, JSON serialization and SHA-256. Reject functions, `undefined`, secrets and absolute source paths from key inputs with `FINGERPRINT_INPUT_INVALID`.

- [ ] **Step 4: Persist source hashes**

When media generation completes, persist:

```js
{
  sourceContentHash,
  generationKey,
  fingerprintVersion: 1
}
```

Before `findReusableSceneMedia()` returns a completed record, hash the current file and require equality. Legacy records without hashes are not reusable for three-tier profile; other profiles keep legacy behavior until migrated.

- [ ] **Step 5: Fingerprint derived renders**

Persist `renderKey` beside derived scene clips. A changed TTS slice, caption, title overlay, crop or motion invalidates the derived render without deleting or regenerating the source image.

- [ ] **Step 6: Verify**

Run:

```powershell
node scripts/check-video-artifact-fingerprints.mjs
node scripts/check-longform-scene-resume-contract.mjs
node scripts/check-image-scene-renderer-contract.mjs
```

Expected: all exit 0, including a test that replaces a completed image file and observes regeneration.

- [ ] **Step 7: Commit**

```powershell
git add electron/services/video-artifact-fingerprints.mjs youtube-workflow.mjs electron/services/image-scene-renderer.mjs scripts/check-video-artifact-fingerprints.mjs scripts/check-longform-scene-resume-contract.mjs
git commit -m "feat: validate layered video artifact fingerprints"
```

---

### Task 5: Measured-TTS Adaptive Timeline Connection

**Files:**
- Create: `electron/services/measured-visual-timeline.mjs`
- Create: `scripts/check-measured-visual-timeline-contract.mjs`
- Modify: `electron/services/longform-planner.mjs`
- Modify: `electron/services/capcut-job-service.mjs`
- Modify: `youtube-workflow.mjs`
- Modify: `scripts/check-longform-production-contract.mjs`
- Modify: `scripts/check-capcut-editable-e2e.mjs`

**Interfaces:**
- Produces: `buildMeasuredVisualTimeline({ profile, draftScenes, narrationManifest }): MeasuredVisualTimeline`
- `MeasuredVisualTimeline`: `{ schemaVersion, profileId, narrationHash, durationSeconds, beats }`
- Consumes: Task 1 profile and existing `prepareCapcutNarrationForDraft()` result.

- [ ] **Step 1: Write failing measured timeline contract**

Create a fixture narration manifest with exact measured segment starts and ends totaling 870 seconds after the 30-second intro. Assert:

- first body beat starts at 30
- early beats are each 8–15 seconds
- deep beats are each 16–30 seconds
- concatenated beat narration tokens equal input tokens exactly once
- final beat ends at 900
- unique image budget is 18–28 and source reuse is at most 2

- [ ] **Step 2: Run RED**

Run: `node scripts/check-measured-visual-timeline-contract.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement measured segment conversion**

Convert narration output to ordered segments with:

```js
{
  id: `narration-${order}`,
  text,
  startSeconds,
  endSeconds,
  durationSeconds,
  sha256
}
```

Reject gaps, overlap, non-monotonic timestamps and duplicate narration with stable codes.

- [ ] **Step 4: Re-plan after narration, before media**

In `generateYouTubeWorkflowAssets()` retain the existing order:

```text
draft/estimated scene plan
prepareCapcutNarration
buildMeasuredVisualTimeline
write measured-visual-timeline.json
generateSceneMedia
```

Replace `draft.scenes` with measured beats only when the loaded profile has `requiresMeasuredTimeline: true`. Do not alter normal Hermes render and Shorts branches.

- [ ] **Step 5: Make handoff require the measured manifest**

For the three-tier CapCut profile, `createCapcutEditableDraft()` must fail with `MEASURED_TTS_REQUIRED` or `MEASURED_TIMELINE_INVALID` if the manifest is absent or its narration hash differs.

- [ ] **Step 6: Verify**

Run:

```powershell
node scripts/check-measured-visual-timeline-contract.mjs
node scripts/check-longform-production-contract.mjs
node scripts/check-capcut-editable-e2e.mjs
node scripts/check-narration-timeline-assets.mjs
```

Expected: all exit 0.

- [ ] **Step 7: Commit**

```powershell
git add electron/services/measured-visual-timeline.mjs electron/services/longform-planner.mjs electron/services/capcut-job-service.mjs youtube-workflow.mjs scripts/check-measured-visual-timeline-contract.mjs scripts/check-longform-production-contract.mjs scripts/check-capcut-editable-e2e.mjs
git commit -m "feat: plan capcut visuals from measured narration"
```

---

### Task 6: Shared Video Operation Service and CLI

**Files:**
- Create: `electron/services/video-operation-service.mjs`
- Create: `scripts/hermes-video.mjs`
- Create: `scripts/check-hermes-video-cli-contract.mjs`
- Modify: `electron/main.mjs`
- Modify: `electron/services/youtube-job-service.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `createVideoOperationService({ paths, emit, dependencies }): { profiles, createJob, inspect, run, resume, verify, report }`
- Produces CLI commands: `profiles list`, `job create`, `inspect`, `run`, `resume`, `verify`, `report`
- Consumes: Tasks 1–5.

- [ ] **Step 1: Write failing CLI tests**

Use `spawnSync(process.execPath, ["scripts/hermes-video.mjs", "profiles", "list", "--json"])` and assert exactly one JSON document on stdout, exit 0 and no ANSI sequences. Test invalid command returns exit 2 and `{ ok:false, failureCodes:["COMMAND_INVALID"] }`.

- [ ] **Step 2: Run RED**

Run: `node scripts/check-hermes-video-cli-contract.mjs`

Expected: CLI file missing.

- [ ] **Step 3: Implement the application service**

Move no provider code in this task. Wrap existing services through injected functions. Every method returns:

```js
{
  schemaVersion: 1,
  ok: true,
  command: "inspect",
  jobId: "",
  state: "",
  artifacts: [],
  failureCodes: [],
  nextActions: []
}
```

The service accepts `emit` and emits Task 2 domain events. It owns per-job in-process locks so Electron cannot start two writes for the same resolved job directory.

- [ ] **Step 4: Implement CLI parsing**

Do not add a parsing dependency. Support `--json`, `--json-stream`, `--profile`, `--input`, `--until`, `--level`, and `--format`. Validate paths before execution. With `--json-stream`, write domain events as one-line JSON and the final envelope as `{ type:"result", ... }`.

- [ ] **Step 5: Bind Electron to the shared service**

Existing IPC handlers call service methods directly and pass `sendYouTubeEvent` as `emit`. Do not spawn `scripts/hermes-video.mjs` from Electron. Preserve existing IPC channel names and renderer behavior.

- [ ] **Step 6: Verify**

Run:

```powershell
node scripts/check-hermes-video-cli-contract.mjs
node scripts/check-youtube-job-runner.mjs
node scripts/check-desktop-recovery-actions.mjs
npm run check:desktop-progress
```

Expected: all exit 0.

- [ ] **Step 7: Register and commit**

Add:

```json
"hermes:video": "node scripts/hermes-video.mjs",
"check:hermes-video-cli": "node scripts/check-hermes-video-cli-contract.mjs"
```

```powershell
git add electron/services/video-operation-service.mjs electron/main.mjs electron/services/youtube-job-service.mjs scripts/hermes-video.mjs scripts/check-hermes-video-cli-contract.mjs package.json
git commit -m "feat: add shared Hermes video operation CLI"
```

---

### Task 7: Canonical Agent Skills

**Files:**
- Create: `.agents/skills/hermes-video-router/SKILL.md`
- Create: `.agents/skills/hermes-video-router/references/intent-map.md`
- Create: `.agents/skills/creating-hermes-video-job/SKILL.md`
- Create: `.agents/skills/generating-hermes-draft/SKILL.md`
- Create: `.agents/skills/generating-hermes-media/SKILL.md`
- Create: `.agents/skills/assembling-hermes-capcut/SKILL.md`
- Create: `.agents/skills/resuming-hermes-video-job/SKILL.md`
- Create: `.agents/skills/validating-hermes-video/SKILL.md`
- Create: `.agents/rules/hermes-video-safety.md`
- Create: `scripts/check-hermes-video-skill-contract.mjs`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces seven Agent Skills standard-compatible skill folders.
- Consumes: Task 6 CLI commands and failure/action IDs.

- [ ] **Step 1: Create RED evaluation fixtures**

In `scripts/check-hermes-video-skill-contract.mjs`, validate frontmatter, name/folder equality, description length, body word limits, relative reference existence and forbidden duplicated secrets. Add routing cases:

```js
[
  ["15분 역사 영상 새로 만들어", "creating-hermes-video-job"],
  ["scene 18에서 실패한 작업 이어서 해", "resuming-hermes-video-job"],
  ["CapCut 드래프트 검증해", "validating-hermes-video"],
  ["Flow 이미지 생성만 다시 해", "generating-hermes-media"],
]
```

The RED test must fail because skills do not exist.

- [ ] **Step 2: Run RED**

Run: `node scripts/check-hermes-video-skill-contract.mjs`

- [ ] **Step 3: Write router skill**

Its body must contain only:

1. run `npm run hermes:video -- inspect <jobDir> --json` when a job directory exists
2. select one focused task skill from the intent map
3. do not read `youtube-workflow.mjs` unless the CLI returns `SOURCE_INSPECTION_REQUIRED`
4. return the selected command and bounded result

- [ ] **Step 4: Write six task skills**

Each description starts with `Use when...` and includes Korean/English trigger keywords. Each body states the exact CLI command, prerequisites, success envelope fields, fail-closed behavior and the one reference to load conditionally. Do not repeat profile numbers in every skill; reference profile IDs.

- [ ] **Step 5: Add safety rule and AGENTS routing**

`AGENTS.md` gets only:

```markdown
## Hermes 영상 작업
- 새 생성, 재개, CapCut, Flow/Grok media, render 또는 영상 QA 요청은 먼저 `.agents/skills/hermes-video-router/SKILL.md`를 사용한다.
- job 디렉터리가 있으면 소스 파일을 읽기 전에 `npm run hermes:video -- inspect "<jobDir>" --json`을 실행한다.
- provider 비용 발생, 계정 인증, 업로드와 live CapCut acceptance는 명시적 승인 없이 실행하지 않는다.
```

- [ ] **Step 6: Forward-test trigger behavior**

Run five fresh-context samples per routing case with no skill and with skill. Record only selected skill, command, source files read and token counts in `docs/skill-evals/hermes-video-router-v1.json`. Do not include conversation secrets or raw source material.

- [ ] **Step 7: Verify and commit**

Run:

```powershell
node scripts/check-hermes-video-skill-contract.mjs
npx --yes skills-ref validate .agents/skills/hermes-video-router
```

If `skills-ref` cannot run offline, record `SKILLS_REF_UNAVAILABLE` and require the local contract to pass; do not silently skip both.

```powershell
git add .agents/skills .agents/rules AGENTS.md scripts/check-hermes-video-skill-contract.mjs docs/skill-evals/hermes-video-router-v1.json
git commit -m "feat: add portable Hermes video agent skills"
```

---

### Task 8: Cross-Agent Skill Synchronization

**Files:**
- Create: `scripts/sync-agent-skills.mjs`
- Create: `scripts/check-agent-skill-sync-contract.mjs`
- Create: `.agent-skill-targets.json`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Produces: `syncAgentSkills({ sourceDir, target, dryRun }): SyncResult`
- Consumes: Task 7 canonical skills.

- [ ] **Step 1: Write failing sync test**

Use temporary directories and assert:

- canonical files copy to each configured target
- generated manifest contains canonical Git commit SHA and content hashes
- `--check` detects edited generated copies
- source path traversal is rejected
- dry-run writes nothing

- [ ] **Step 2: Run RED**

Run: `node scripts/check-agent-skill-sync-contract.mjs`

- [ ] **Step 3: Define target adapters**

`.agent-skill-targets.json` contains repository-local generated targets only:

```json
{
  "schemaVersion": 1,
  "targets": {
    "codex": ".generated-agent-skills/codex",
    "claude": ".generated-agent-skills/claude",
    "gemini": ".generated-agent-skills/gemini"
  }
}
```

Do not write to user home directories by default.

- [ ] **Step 4: Implement deterministic sync**

Copy canonical skill content, generate target-specific discovery index only where required, and write `skill-sync-manifest.json`. Reject symlinks that escape source/target roots. `--check` compares hashes without mutation.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
node scripts/check-agent-skill-sync-contract.mjs
node scripts/sync-agent-skills.mjs --target all --check
```

```powershell
git add scripts/sync-agent-skills.mjs scripts/check-agent-skill-sync-contract.mjs .agent-skill-targets.json .gitignore package.json
git commit -m "feat: synchronize canonical video skills"
```

---

### Task 9: Unified Verification, Baseline Policy, and Token Benchmark

**Files:**
- Create: `config/verification-baseline.json`
- Create: `scripts/lib/video-verification-runner.mjs`
- Create: `scripts/benchmark-hermes-video-agent-tokens.mjs`
- Create: `scripts/check-video-verification-runner.mjs`
- Create: `.github/workflows/hermes-video-contract.yml`
- Create: `.github/workflows/reusable-hermes-video-offline.yml`
- Modify: `scripts/analyze-youtube-output.mjs`
- Modify: `package.json`
- Modify: `timeline.md`

**Interfaces:**
- Produces: `runVideoVerification({ jobDir, level, baseline, now }): VerificationEnvelope`
- Produces: benchmark JSON `{ scenario, baselineTokens, skillTokens, reductionRatio, success }`
- Consumes: Tasks 1–8.

- [ ] **Step 1: Write failing verification-level tests**

Assert:

- `contract` runs schema, profile, skill, CLI and fingerprint checks
- `offline-e2e` additionally runs synthetic intro, measured timeline, narration, handoff and CapCut edit-plan checks
- `live-acceptance` never runs without `--approved-live`
- expired baseline entries fail with `BASELINE_ENTRY_EXPIRED`
- a known baseline failure does not hide a different new failure code

- [ ] **Step 2: Run RED**

Run: `node scripts/check-video-verification-runner.mjs`

- [ ] **Step 3: Implement verification registry**

Use arrays of command descriptors, not one concatenated shell string. Execute each command directly with `spawnSync` and fixed args. Capture exit code, bounded stdout/stderr tail and duration.

- [ ] **Step 4: Define expiring baseline entries**

Each entry must have:

```json
{
  "code": "CAPCUT_BUILDER_PROVENANCE_MISMATCH",
  "scope": "check:capcut-editable",
  "reason": "pre-existing upstream builder hash mismatch",
  "owner": "hermes",
  "expiresOn": "2026-08-29"
}
```

Do not add failures that were not reproduced during implementation.

- [ ] **Step 5: Connect three-tier QA**

Call `analyzeThreeTierTimeline()` from `analyzeYouTubeOutput()` when `profileId` resolves to a three-tier profile. Read `intro-assets.json`, `measured-visual-timeline.json`, caption timing and scene media manifest. Merge returned codes into the standard QA envelope.

- [ ] **Step 6: Implement token benchmark**

Run fixed tasks in clean contexts:

1. create a 15-minute CapCut job
2. inspect and resume a partial media job
3. diagnose a hash mismatch
4. validate an existing CapCut handoff

Record skill/reference characters loaded, source characters read, CLI output characters and model token usage when the harness exposes it. If direct token usage is unavailable, store `tokenMeasurement: "estimated"` and use a documented tokenizer; never label character counts as tokens.

- [ ] **Step 7: Add reusable GitHub workflows**

`hermes-video-contract.yml` calls the reusable offline workflow. The reusable workflow installs Node dependencies and runs:

```powershell
npm run check:hermes-video-contract
npm run check:hermes-video-offline
```

It must not use provider credentials or invoke live acceptance.

- [ ] **Step 8: Register aggregate commands**

Add:

```json
"check:hermes-video-contract": "node scripts/check-video-profile-contract.mjs && node scripts/check-video-domain-event-contract.mjs && node scripts/check-video-job-inspector-contract.mjs && node scripts/check-video-artifact-fingerprints.mjs && node scripts/check-hermes-video-cli-contract.mjs && node scripts/check-hermes-video-skill-contract.mjs && node scripts/check-agent-skill-sync-contract.mjs",
"check:hermes-video-offline": "node scripts/check-measured-visual-timeline-contract.mjs && node scripts/check-user-intro-assets-contract.mjs && node scripts/check-narration-timeline-assets.mjs && node scripts/check-capcut-handoff-package.mjs && node scripts/check-capcut-edit-plan-contract.mjs && node scripts/check-capcut-editable-e2e.mjs",
"benchmark:hermes-video-tokens": "node scripts/benchmark-hermes-video-agent-tokens.mjs"
```

- [ ] **Step 9: Final verification**

Run:

```powershell
npm run check:hermes-video-contract
npm run check:hermes-video-offline
npm run benchmark:hermes-video-tokens
npm run electron:pack
```

Expected:

- contract and offline suites exit 0
- benchmark reports success for all four scenarios
- median token reduction is at least 50%, or the report explicitly marks the target unmet without changing the measurement
- Electron installer builds successfully

- [ ] **Step 10: Record timeline and commit**

Append exact commands, pass/fail counts, measured reduction and any remaining live acceptance to `timeline.md`.

```powershell
git add config/verification-baseline.json scripts/lib/video-verification-runner.mjs scripts/benchmark-hermes-video-agent-tokens.mjs scripts/check-video-verification-runner.mjs scripts/analyze-youtube-output.mjs .github/workflows/hermes-video-contract.yml .github/workflows/reusable-hermes-video-offline.yml package.json timeline.md
git commit -m "test: verify portable Hermes video operations"
```

---

## Review Feedback Disposition

The external review at `HERMES_VIDEO_SKILL_OPERATIONS_REVIEW.md` was evaluated against the current code.

- **Accepted with modification:** Electron progress and manual handoff must remain first-class. Implement as a shared imported application service and event sink, not an Electron-spawned CLI subprocess or new `event-fd`.
- **Partially accepted:** Use estimated planning followed by measured-TTS adaptive planning. The claim that current CapCut media runs before TTS is incorrect; `youtube-workflow.mjs` already calls `prepareCapcutNarration()` before `generateSceneMedia()`. Task 5 connects measured output to re-planning without changing unrelated render paths.
- **Accepted with modification:** Hash-aware reuse is required. Use layered `generationKey`, `sourceContentHash`, and `renderKey`; do not use the proposed single hash combining raw file, script and duration because that would conflate source assets with derived renders.
- **Accepted:** Recovery actions need stable `actionId`, `targetStage`, and `uiLabel`. Integrate them with existing `actionRequired`, retry and render-existing-assets controls rather than building a second recovery UI.
- **Rejected:** A generic `--event-fd`/`--ui-event-channel` is not required for the initial implementation. `--json-stream` plus the shared event sink covers CLI and Electron without platform-specific file descriptor behavior on Windows.

## Completion Gate

This program is complete only when:

- `npm run check:hermes-video-contract` and `npm run check:hermes-video-offline` pass.
- Electron uses the shared service and existing UI progress/recovery behavior remains verified.
- three-tier CapCut media planning consumes measured narration.
- corrupt or replaced source assets cannot resume as completed.
- all seven skills pass format and routing evaluations.
- Codex, Claude and Gemini generated targets match the canonical skill hashes.
- the benchmark reports whether the 50% median token reduction goal was met.
- live provider and CapCut GUI acceptance remain explicitly separate and are not represented as automated success.

## Implementation Status (2026-07-29)

- Tasks 1–9 implemented on `codex/video-skill-operations`.
- The clean worktree did not contain the uncommitted `capcut-job-service.mjs`, intro-assets, narration-assets, handoff, or edit-plan files named by the original Task 5/9 checklist. Their intended guarantees were implemented and tested through the available measured timeline/workflow, longform production, and resume contracts without copying unrelated dirty main-worktree files.
- Contract suite: 8 checks passed. Offline suite: 4 checks passed. Full `npm test` passed.
- Electron NSIS packaging passed after the initial 120-second tool timeout was rerun with a 360-second limit.
- Token reduction target met at an estimated median 95.57%; this is a character-based estimate, not direct model token telemetry.
- Live provider spending, authentication, upload, and CapCut GUI acceptance were not run and remain explicit approval gates.
