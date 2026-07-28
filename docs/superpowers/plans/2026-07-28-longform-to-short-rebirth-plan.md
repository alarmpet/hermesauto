# Longform-to-Short Rebirth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 완성된 Hermes 본편 작업에서 원본 자산을 재사용해 60~120초의 9:16 쇼츠 1개와 편집 가능한 CapCut 초안을 생성한다.

**Architecture:** `shorts-derivative-manifest.json`을 파생 작업의 단일 계약으로 삼는다. 분석·자산 처리·렌더링은 Hermes 서비스가 담당하고 `hermes-longform-to-short` 개인 스킬은 승인 순서와 QA를 오케스트레이션한다.

**Tech Stack:** Node.js ESM, Electron IPC, FFmpeg/ffprobe, Python pycapcut builder, 기존 Hermes 렌더 파이프라인, Codex personal skill

## Global Constraints

- 원본 본편 작업 파일은 수정하지 않고 `shorts-rebirth/<derivativeId>/` 아래에만 결과를 쓴다.
- 출력은 1080×1920, SAR 1:1, 60~120초이며 기본 목표는 90초다.
- 1분 초과 결과에는 자체 보유 음원 또는 YouTube Audio Library 음원만 허용한다.
- 음원 출처를 기계적으로 증명할 메타데이터가 없으면 원본 BGM을 제거하고 나레이션·승인된 SFX만 사용한다.
- 신규 대형 런타임 의존성(PySceneDetect, WhisperX 포함)을 추가하지 않는다.
- 자동 선택 점수가 70 미만이면 렌더하지 않고 사용자 범위 선택을 요구한다.
- 자막은 최대 2줄이며 핵심 피사체와 함께 세로 안전영역을 통과해야 한다.
- 모든 구현은 실패 테스트 → 최소 구현 → 통과 테스트 순서로 진행한다.

---

## 파일 구조

- Create `electron/services/shorts-derivative-schema.mjs`: 파생 매니페스트 정규화와 검증
- Create `electron/services/longform-short-candidate.mjs`: SRT·장면 기반 후보 생성과 점수화
- Create `electron/services/shorts-asset-strategy.mjs`: crop/blur-background/regenerate-vertical 판정
- Create `electron/services/longform-to-short-service.mjs`: 분석·준비·렌더 오케스트레이션
- Create `scripts/render-longform-derived-short.mjs`: 스킬과 수동 실행용 CLI
- Modify `electron/services/capcut-handoff-package.mjs`: 파생 세그먼트와 초점 좌표 입력 지원
- Modify `electron/main.mjs`: 분석·생성 IPC 등록
- Modify `electron/preload.mjs`: 안전한 renderer API 노출
- Modify `electron/renderer/index.html`: 쇼츠 재탄생 패널 마크업
- Modify `electron/renderer/app.js`: 후보·승인·진행 상태 제어
- Modify `electron/renderer/styles.css`: 9:16 미리보기와 상태 UI
- Create `scripts/check-shorts-derivative-schema.mjs`: 매니페스트 계약 검사
- Create `scripts/check-longform-short-candidate.mjs`: 후보 점수·경계 검사
- Create `scripts/check-shorts-asset-strategy.mjs`: 화면 전략 검사
- Create `scripts/check-longform-to-short-service.mjs`: 서비스 통합 계약 검사
- Create `scripts/check-longform-to-short-ipc.mjs`: IPC/UI 계약 검사
- Create `scripts/check-eiffel-derived-short-acceptance.mjs`: 에펠탑 실자산 수용 검사
- Create `C:/Users/amd/.codex/skills/hermes-longform-to-short/SKILL.md`: 범용 실행 절차
- Create `C:/Users/amd/.codex/skills/hermes-longform-to-short/agents/openai.yaml`: 스킬 UI 메타데이터
- Create `C:/Users/amd/.codex/skills/hermes-longform-to-short/references/manifest.md`: 매니페스트 필드와 승인 규칙

### Task 1: 파생 매니페스트 계약

**Files:**
- Create: `electron/services/shorts-derivative-schema.mjs`
- Test: `scripts/check-shorts-derivative-schema.mjs`

**Interfaces:**
- Produces: `normalizeShortsDerivativeManifest(input, { parentJobDir })`
- Produces: `validateShortsDerivativeManifest(manifest)`
- Produces: `SHORTS_DERIVATIVE_VERSION = 1`

- [ ] **Step 1: 실패하는 계약 검사를 작성한다**

검사에는 최소한 다음 사례를 코드로 고정한다.

```js
const valid = normalizeShortsDerivativeManifest({
  derivativeId: "eiffel-maupassant-reversal",
  target: { durationSeconds: 100 },
  candidate: {
    sourceStartSeconds: 461.841,
    sourceEndSeconds: 591.101,
    score: 91,
    reasonCodes: ["strong-contradiction", "clear-payoff"]
  },
  segments: [{
    id: "hook",
    role: "hook",
    sourceSceneIds: ["scene_35"],
    sourceStartSeconds: 461.841,
    sourceEndSeconds: 475,
    narrationMode: "source-slice",
    visualStrategy: "regenerate-vertical"
  }],
  musicPolicy: "owned-or-youtube-audio-library-only",
  audioProvenance: [
    { id: "voice", kind: "narration", sourcePath: join(fixtureDir, "capcut-handoff", "voice.wav") }
  ],
  warnings: [],
  cta: { type: "watch-full-video", durationSeconds: 4 }
}, { parentJobDir: fixtureDir });
assert.equal(valid.target.aspectRatio, "9:16");
assert.equal(valid.target.width, 1080);
assert.throws(() => normalizeShortsDerivativeManifest({
  derivativeId: "outside-parent-duration",
  target: { durationSeconds: 90 },
  parentDurationSeconds: 700,
  segments: [{
    id: "invalid-range",
    role: "body",
    sourceStartSeconds: 690,
    sourceEndSeconds: 710,
    narrationMode: "source-slice",
    visualStrategy: "crop"
  }]
}, { parentJobDir: fixtureDir }), /SHORT_SOURCE_RANGE_OUT_OF_BOUNDS/);
assert.throws(() => normalizeShortsDerivativeManifest({
  derivativeId: "../escape",
  target: { durationSeconds: 45 }
}, { parentJobDir: fixtureDir }), /DERIVATIVE_ID|DURATION/);
```

- [ ] **Step 2: 검사가 실패하는지 확인한다**

Run: `node scripts/check-shorts-derivative-schema.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 최소 스키마 구현을 작성한다**

`derivativeId`는 `^[a-z0-9][a-z0-9-]{2,63}$`, 길이는 60~120초, 점수는 0~100, 전략은 `crop|blur-background|regenerate-vertical`, 나레이션은 `source-slice|generated-bridge`만 허용한다. 모든 원본 경로는 `resolve(parentJobDir)` 하위인지 검사한다. 모든 `source-slice` 세그먼트는 `0 <= sourceStartSeconds < sourceEndSeconds <= parentDurationSeconds`를 만족해야 하며 위반 시 `SHORT_SOURCE_RANGE_OUT_OF_BOUNDS`로 거부한다. `audioProvenance[].kind`는 `owned|youtube-audio-library|narration|approved-sfx|unknown`만 허용하고 `warnings`는 문자열 배열로 정규화한다.

- [ ] **Step 4: 계약 검사를 통과시킨다**

Run: `node scripts/check-shorts-derivative-schema.mjs`
Expected: `SHORTS_DERIVATIVE_SCHEMA_OK`

- [ ] **Step 5: 커밋한다**

```powershell
git add electron/services/shorts-derivative-schema.mjs scripts/check-shorts-derivative-schema.mjs
git commit -m "feat: add shorts derivative manifest contract"
```

### Task 2: 본편 후보 생성기

**Files:**
- Create: `electron/services/longform-short-candidate.mjs`
- Test: `scripts/check-longform-short-candidate.mjs`
- Fixture: `C:/Users/amd/AppData/Roaming/hermes/outputs/desktop/youtube-capcut-eiffel-15m-production-run/capcut-handoff/captions.srt`

**Interfaces:**
- Consumes: 정규화된 SRT 큐 `{ index, startSeconds, endSeconds, text }[]`
- Produces: `buildShortCandidates({ cues, scenes, targetSeconds = 90, minSeconds = 60, maxSeconds = 120, limit = 3 })`
- Produces: `{ editMode, sourceStartSeconds, sourceEndSeconds, score, scoreBreakdown, reasonCodes, cueIndexes, segments }[]`

- [ ] **Step 1: 에펠탑 반전 구간과 일반 fixture 검사를 작성한다**

```js
const candidates = buildShortCandidates({
  cues: parseSrtFixture(eiffelSrt),
  scenes: sceneFixture,
  targetSeconds: 100
});
assert.ok(candidates.length >= 1 && candidates.length <= 3);
const durationOf = (item) => item.segments.reduce(
  (sum, segment) => sum + segment.sourceEndSeconds - segment.sourceStartSeconds,
  0
);
assert.ok(candidates.every((item) => durationOf(item) >= 60));
assert.ok(candidates.every((item) => durationOf(item) <= 120));
assert.ok(candidates.some((item) => item.reasonCodes.includes("strong-contradiction")));
assert.ok(candidates.some((item) =>
  item.editMode === "hook-remix"
  && item.segments[0].role === "hook"
  && item.segments[0].sourceStartSeconds > item.segments[1].sourceStartSeconds
));
assert.deepEqual([...candidates].sort((a, b) => b.score - a.score), candidates);
```

- [ ] **Step 2: 검사가 실패하는지 확인한다**

Run: `node scripts/check-longform-short-candidate.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 결정론적 후보 점수화를 구현한다**

문장 종결 큐에서만 경계를 만들고 `hook 30 + payoff 25 + standalone 20 + visual 15 + compression 10`으로 계산한다. 질문·모순 접속어·결과 표현·고유명사 재소개·장면 다양성을 코드에 명시된 한국어 패턴으로 평가하고 반복 n-gram에는 감점을 준다. 연속 구간 후보 외에 최고 payoff 큐를 0~3초 훅으로 전진 배치하고 본문을 뒤에 잇는 `hook-remix` 후보를 정확히 1개 포함한다. 리믹스의 출력 길이는 `segments`의 재생 길이 합으로 계산하며 원본의 훅 큐가 본문에서 다시 반복되지 않게 한다.

- [ ] **Step 4: 후보 검사를 통과시킨다**

Run: `node scripts/check-longform-short-candidate.mjs`
Expected: `LONGFORM_SHORT_CANDIDATE_OK`

- [ ] **Step 5: 커밋한다**

```powershell
git add electron/services/longform-short-candidate.mjs scripts/check-longform-short-candidate.mjs
git commit -m "feat: score longform short candidates"
```

### Task 3: 장면별 세로 자산 전략

**Files:**
- Create: `electron/services/shorts-asset-strategy.mjs`
- Test: `scripts/check-shorts-asset-strategy.mjs`

**Interfaces:**
- Produces: `resolveVerticalAssetStrategy({ role, sourceWidth, sourceHeight, focalPoint, safeBox, hasMotion })`
- Produces: `{ strategy, focalPoint, confidence, reasonCodes, regenerationPrompt }`
- Produces: `buildVerticalVideoFilter({ strategy, sourceWidth, sourceHeight, focalPoint })`

- [ ] **Step 1: 전략 우선순위 검사를 작성한다**

```js
assert.equal(resolveVerticalAssetStrategy({
  role: "hook", sourceWidth: 1920, sourceHeight: 1080
}).strategy, "regenerate-vertical");
assert.equal(resolveVerticalAssetStrategy({
  role: "body", sourceWidth: 1920, sourceHeight: 1080,
  focalPoint: { x: 0.5, y: 0.45 }, safeBox: { left: 0.35, right: 0.65 }
}).strategy, "crop");
assert.equal(resolveVerticalAssetStrategy({
  role: "body", sourceWidth: 1920, sourceHeight: 1080,
  focalPoint: { x: 0.1, y: 0.45 }
}).strategy, "blur-background");
assert.equal(
  buildVerticalVideoFilter({
    strategy: "crop",
    sourceWidth: 1920,
    sourceHeight: 1080,
    focalPoint: { x: 0.68, y: 0.5 }
  }),
  "scale=-2:1920,crop=1080:1920:x=clip(iw*0.68-540\\,0\\,iw-1080):y=0,setsar=1"
);
```

- [ ] **Step 2: 검사가 실패하는지 확인한다**

Run: `node scripts/check-shorts-asset-strategy.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 세 가지 전략과 Flow 프롬프트 생성을 구현한다**

훅과 반전 공개 장면은 기본적으로 `regenerate-vertical`, 안전영역 안의 단일 피사체는 `crop`, 넓은 건축물·복수 인물·낮은 신뢰도는 `blur-background`를 반환한다. 재생성 프롬프트에는 `9:16 vertical`, 시대·장소·인물 연속성, 무문자 조건을 포함한다. 16:9 원본의 `crop`은 직접 `crop=1080:1920`하지 않고 먼저 `scale=-2:1920`으로 높이를 맞춘 뒤 `x=clip(iw*focalX-540\,0\,iw-1080)`으로 잘라낸다. `-2`는 FFmpeg가 짝수 너비를 선택하게 해 libx264 호환성을 보존한다. `blur-background`는 `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=40` 배경과 `scale=1080:-2` 전경을 중앙 overlay하고 마지막에 `setsar=1`을 적용한다.

- [ ] **Step 4: 전략 검사를 통과시킨다**

Run: `node scripts/check-shorts-asset-strategy.mjs`
Expected: `SHORTS_ASSET_STRATEGY_OK`

- [ ] **Step 5: 커밋한다**

```powershell
git add electron/services/shorts-asset-strategy.mjs scripts/check-shorts-asset-strategy.mjs
git commit -m "feat: plan vertical assets for derived shorts"
```

### Task 4: 파생 작업 서비스와 CLI

**Files:**
- Create: `electron/services/longform-to-short-service.mjs`
- Create: `scripts/render-longform-derived-short.mjs`
- Test: `scripts/check-longform-to-short-service.mjs`

**Interfaces:**
- Consumes: Tasks 1~3의 스키마·후보·전략 함수
- Produces: `analyzeLongformForShort({ parentJobDir, targetSeconds })`
- Produces: `prepareDerivedShort({ parentJobDir, candidate, overrides })`
- Produces: `renderDerivedShort({ manifestPath, context })`

- [ ] **Step 1: 원본 불변성과 재시작 검사를 작성한다**

테스트 fixture의 원본 파일 SHA-256 목록을 실행 전후 비교한다. `prepareDerivedShort`를 두 번 호출해 동일 `derivativeId`와 완료 자산을 재사용하는지도 검증한다.

```js
const before = hashParentFixture(parentJobDir);
const analysis = await analyzeLongformForShort({ parentJobDir, targetSeconds: 90 });
assert.ok(analysis.candidates[0].score >= 70);
const prepared = await prepareDerivedShort({
  parentJobDir,
  candidate: analysis.candidates[0],
  overrides: {}
});
assert.match(prepared.manifestPath, /shorts-rebirth/);
assert.deepEqual(hashParentFixture(parentJobDir), before);
```

- [ ] **Step 2: 검사가 실패하는지 확인한다**

Run: `node scripts/check-longform-to-short-service.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 분석·준비·렌더 오케스트레이션을 구현한다**

입력은 `draft.json`, `metadata.json`, `scene-media-manifest.json`, `capcut-handoff/captions.srt` 순으로 발견한다. 70점 미만이면 `SHORT_CANDIDATE_APPROVAL_REQUIRED`, 누락 자산은 `SHORT_SOURCE_ASSET_MISSING` 코드로 중단한다. FFmpeg 오디오 절단은 `atrim`을 사용하고 각 절단 조각에는 시작·끝 30ms `afade`를 적용한 뒤 `concat`한다. 길이를 줄이는 `acrossfade`는 사용하지 않는다. 파생 SRT는 각 조각의 측정된 재생 길이 누적값으로 재작성하고 최종 음성은 `loudnorm=I=-16:TP=-1:LRA=11`을 사용한다.

원본 작업에 별도 BGM 파일이 있더라도 출처 증명 필드가 현재 Hermes 계약에 존재하지 않으므로 자동 승계하지 않는다. `durationSeconds > 60`이면 `audioProvenance.kind`가 `owned`, `youtube-audio-library`, `narration`, `approved-sfx` 중 하나인 트랙만 허용한다. 그 밖의 트랙은 제거하고 매니페스트 `warnings`에 `warning-external-bgm-stripped`를 기록한다.

- [ ] **Step 4: CLI 인자를 연결한다**

```powershell
node scripts/render-longform-derived-short.mjs analyze --parent-job-dir "C:\path\job" --target-seconds 90
node scripts/render-longform-derived-short.mjs prepare --parent-job-dir "C:\path\job" --candidate-index 0
node scripts/render-longform-derived-short.mjs render --manifest "C:\path\shorts-derivative-manifest.json"
```

CLI는 마지막 줄에 JSON `{ ok, command, manifestPath, outputPath, probe, warnings, errorCode }`를 출력하고 실패 시 0이 아닌 종료 코드를 반환한다. 렌더 성공 시 `probe`는 ffprobe로 측정한 `{ width, height, sampleAspectRatio, durationSeconds, audioChannels }`를 포함하며 기대값과 다르면 성공으로 반환하지 않는다.

- [ ] **Step 5: 서비스 검사를 통과시킨다**

Run: `node scripts/check-longform-to-short-service.mjs`
Expected: `LONGFORM_TO_SHORT_SERVICE_OK`

- [ ] **Step 6: 커밋한다**

```powershell
git add electron/services/longform-to-short-service.mjs scripts/render-longform-derived-short.mjs scripts/check-longform-to-short-service.mjs
git commit -m "feat: orchestrate longform derived shorts"
```

### Task 5: CapCut 9:16 파생 편집 지원

**Files:**
- Modify: `electron/services/capcut-handoff-package.mjs`
- Modify: `scripts/capcut/build_hermes_editable_draft.py`
- Test: `scripts/check-capcut-handoff-package.mjs`
- Test: `scripts/check-eiffel-derived-short-acceptance.mjs`

**Interfaces:**
- Consumes: `manifest.segments[].visualStrategy`와 `focalPoint`
- Produces: 1080×1920 CapCut draft plan 및 편집 가능한 초안

- [ ] **Step 1: 9:16 초점 좌표와 배경 전략 실패 검사를 추가한다**

검사는 `crop` 자산이 Task 3의 scale→focal crop 필터로 1080×1920에 정규화되고, `blur-background`가 배경과 원본 유지 전경을 서로 다른 편집 가능 비디오 트랙으로 생성하며 `regenerate-vertical` 자산이 없을 때 `SHORT_VERTICAL_ASSET_APPROVAL_REQUIRED`로 중단하는지 확인한다. 기존 `canvas_for("9:16") == (1080, 1920)`과 overlay 트랙 지원은 새로 재구현하지 않고 회귀 테스트로 고정한다.

- [ ] **Step 2: 기존 검사가 유지되고 새 검사가 실패하는지 확인한다**

Run: `node scripts/check-capcut-handoff-package.mjs && node scripts/check-eiffel-derived-short-acceptance.mjs`
Expected: 기존 계약 PASS 후 새 파생 계약 FAIL

- [ ] **Step 3: 파생 세그먼트 정규화와 pycapcut 레이어 생성을 구현한다**

기존 일반 작업 경로는 변경하지 않고 `derivativeManifest`가 제공될 때만 전략별 필터와 레이어를 사용한다. 초점 좌표는 0~1 범위로 검증하고 프레임 밖 crop 위치는 clamp한다. 기존 edit-plan의 `overlays[]`와 pycapcut의 `relative_index` 비디오 트랙 기능을 확장해 `blur-background` 배경 트랙을 전경보다 아래에 배치한다. 별도 `--aspect-ratio` CLI 플래그는 추가하지 않고 이미 필수인 `plan.aspectRatio`를 단일 출처로 유지한다.

- [ ] **Step 4: CapCut 및 에펠탑 수용 검사를 통과시킨다**

Run: `node scripts/check-capcut-handoff-package.mjs && node scripts/check-eiffel-derived-short-acceptance.mjs`
Expected: `CAPCUT_HANDOFF_PACKAGE_OK` and `EIFFEL_DERIVED_SHORT_ACCEPTANCE_OK`

- [ ] **Step 5: 커밋한다**

```powershell
git add electron/services/capcut-handoff-package.mjs scripts/capcut/build_hermes_editable_draft.py scripts/check-capcut-handoff-package.mjs scripts/check-eiffel-derived-short-acceptance.mjs
git commit -m "feat: build vertical CapCut derived shorts"
```

### Task 6: Electron IPC와 UI

**Files:**
- Modify: `electron/main.mjs`
- Modify: `electron/preload.mjs`
- Modify: `electron/renderer/index.html`
- Modify: `electron/renderer/app.js`
- Modify: `electron/renderer/styles.css`
- Test: `scripts/check-longform-to-short-ipc.mjs`

**Interfaces:**
- Produces IPC: `shorts:analyze-longform`, `shorts:prepare-derivative`, `shorts:render-derivative`
- Produces renderer API: `analyzeLongformShort(payload)`, `prepareLongformShort(payload)`, `renderLongformShort(payload)`

- [ ] **Step 1: IPC allowlist와 UI 상태 검사를 작성한다**

검사는 세 IPC가 preload에만 노출되고 renderer가 직접 파일 경로를 쓰지 않으며 `idle → analyzing → review → preparing → rendering → completed|failed` 상태만 허용하는지 확인한다.

- [ ] **Step 2: 검사가 실패하는지 확인한다**

Run: `node scripts/check-longform-to-short-ipc.mjs`
Expected: FAIL because the IPC handlers do not exist

- [ ] **Step 3: main/preload 연결을 구현한다**

main에서 선택된 작업 ID를 `paths.jobsDir` 또는 허용된 desktop output root 아래의 실제 경로로 해석한다. 임의 절대경로 payload는 거부하고 서비스의 구조화 오류 코드를 그대로 반환한다.

- [ ] **Step 4: 쇼츠 재탄생 패널을 구현한다**

완료된 본편에만 버튼을 표시하고 후보 최대 3개, 점수 세부값, 시간 범위, 세로 전략, 재생성 프롬프트를 보여준다. 점수 70 미만 또는 `regenerate-vertical` 미승인 상태에서는 렌더 버튼을 비활성화한다.

- [ ] **Step 5: IPC/UI 검사를 통과시킨다**

Run: `node scripts/check-longform-to-short-ipc.mjs`
Expected: `LONGFORM_TO_SHORT_IPC_OK`

- [ ] **Step 6: 커밋한다**

```powershell
git add electron/main.mjs electron/preload.mjs electron/renderer/index.html electron/renderer/app.js electron/renderer/styles.css scripts/check-longform-to-short-ipc.mjs
git commit -m "feat: add longform to short desktop workflow"
```

### Task 7: 범용 Codex 스킬

**Files:**
- Create: `C:/Users/amd/.codex/skills/hermes-longform-to-short/SKILL.md`
- Create: `C:/Users/amd/.codex/skills/hermes-longform-to-short/agents/openai.yaml`
- Create: `C:/Users/amd/.codex/skills/hermes-longform-to-short/references/manifest.md`

**Interfaces:**
- Consumes: `scripts/render-longform-derived-short.mjs` CLI
- Produces: “본편 자산으로 쇼츠 만들어줘”, “이 영상을 쇼츠로 재탄생시켜줘” 요청에 반응하는 개인 스킬

- [ ] **Step 1: 공식 초기화 스크립트로 스킬 골격을 만든다**

```powershell
python "C:\Users\amd\.codex\skills\.system\skill-creator\scripts\init_skill.py" hermes-longform-to-short --path "C:\Users\amd\.codex\skills" --resources references --interface "display_name=Hermes 본편 쇼츠 재탄생" --interface "short_description=완성된 Hermes 본편을 1~2분 세로 쇼츠로 재구성" --interface "default_prompt=완료된 Hermes 본편 작업을 분석해 원본 자산 기반 쇼츠 1개를 계획하고 승인 후 생성해 주세요."
```

- [ ] **Step 2: SKILL.md에 필수 승인 흐름을 작성한다**

스킬은 입력 검사 → 후보 분석 → 후보와 시간 범위 표시 → 세로 재생성 목록 승인 → prepare → render → QA 순서로만 실행한다. 70점 미만 자동 진행 금지, 원본 수정 금지, 1분 초과 외부 음원 금지를 명시한다.

- [ ] **Step 3: 매니페스트 참조 문서를 작성한다**

`references/manifest.md`에 version 1 필드, 허용 enum, 오류 코드, 에펠탑 예시를 기록하고 SKILL.md에서 매니페스트를 검토할 때만 읽도록 연결한다.

- [ ] **Step 4: 스킬을 검증한다**

Run:

```powershell
python "C:\Users\amd\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "C:\Users\amd\.codex\skills\hermes-longform-to-short"
```

Expected: `Skill is valid!`

- [ ] **Step 5: 실제 에펠탑 입력으로 전방 검사를 수행한다**

새 Codex 세션에서 “에펠탑 본편 자산으로 1~2분 쇼츠 하나 만들어줘”라고 요청했을 때 스킬이 즉시 렌더하지 않고 후보·근거·재생성 목록을 먼저 제시하는지 확인한다.

### Task 8: 전체 회귀와 문서화

**Files:**
- Modify: `README.md`
- Modify: `timeline.md`
- Test: 앞선 모든 검사

**Interfaces:**
- Produces: 사용자 실행법, 결과 경로, 제한사항, 검증 증거

- [ ] **Step 1: 전체 관련 검사를 실행한다**

```powershell
node scripts/check-shorts-derivative-schema.mjs
node scripts/check-longform-short-candidate.mjs
node scripts/check-shorts-asset-strategy.mjs
node scripts/check-longform-to-short-service.mjs
node scripts/check-capcut-handoff-package.mjs
node scripts/check-longform-to-short-ipc.mjs
node scripts/check-eiffel-derived-short-acceptance.mjs
node scripts/check-youtube-job-schema.mjs
node scripts/check-youtube-workflow.mjs
```

Expected: 모든 명령 종료 코드 0

- [ ] **Step 2: 실출력 미디어를 검사한다**

```powershell
ffprobe -v error -show_entries stream=width,height,sample_aspect_ratio -show_entries format=duration -of json "C:\path\shorts-rebirth\eiffel-maupassant-reversal\final-short.mp4"
```

Expected: width 1080, height 1920, sample_aspect_ratio `1:1`, duration 60~120초

- [ ] **Step 3: 원본 불변성과 미디어 QA를 검사한다**

에펠탑 원본 SHA-256 목록이 Task 4 이전과 동일한지 비교하고 `scripts/analyze-youtube-output.mjs`로 검은 프레임, 무음 공백, 정지 고착, 자막 종료 시간을 확인한다. 모든 파생 SRT 큐에 대해 음성 조각의 측정 시작·종료 시각과 비교하여 최대 이탈이 100ms 이하인지 전수 검사한다. 총 자막 종료 시각과 ffprobe 음성 길이 차이도 100ms 이하여야 한다.

- [ ] **Step 4: README와 timeline을 갱신한다**

README에는 UI와 CLI 사용 예, 생성 결과 경로, 1분 초과 음악 제한을 기록한다. `timeline.md`에는 코드 변경과 위 검증 명령 결과만 한 줄로 기록한다.

- [ ] **Step 5: 최종 변경만 커밋한다**

```powershell
git add README.md timeline.md
git commit -m "docs: document longform shorts rebirth workflow"
```

- [ ] **Step 6: 완료 전 검증 스킬을 실행한다**

`superpowers:verification-before-completion`을 사용해 실제 명령 출력, CapCut 초안 존재, 최종 MP4 메타데이터를 다시 확인한 후에만 완료를 보고한다.
