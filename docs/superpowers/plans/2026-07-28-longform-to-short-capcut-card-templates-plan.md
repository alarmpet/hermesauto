# Longform-to-Short CapCut Card Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hermes가 롱폼 압축본과 자막을 받아 `white-article`과 `black-immersive` 두 가지 9:16 화면으로 렌더하고, 동일한 구조의 편집 가능한 CapCut 초안을 반복 생성하게 한다.

**Architecture:** CapCut 프로젝트 폴더 자체를 복제하지 않고 버전이 명시된 JSON 레이아웃 레시피를 단일 진실 공급원으로 둔다. Node 서비스가 레시피와 쇼츠 파생 매니페스트를 검증하고 렌더 계획을 만들며, 기존 pycapcut 빌더가 배경·미디어·고정 문구·자막·CTA를 별도 트랙으로 조립한다. 개인 스킬은 후보 선택과 문구 작성, 프리셋 선택, 생성, QA를 오케스트레이션한다.

**Tech Stack:** Node.js ESM, JSON Schema-style validation, FFmpeg/ffprobe, Python pycapcut, CapCut editable draft, Codex personal skill

## Global Constraints

- 출력은 1080×1920, SAR 1:1, H.264 영상과 AAC 오디오를 가져야 한다.
- 롱폼 원본과 기존 파생 결과는 수정하지 않고 `shorts-rebirth/<derivativeId>/templates/` 아래에만 새 결과를 쓴다.
- 프리셋 ID는 `white-article`과 `black-immersive`만 1차 릴리스에서 허용한다.
- 제목·본문·CTA는 유튜브 우측 상호작용 UI와 하단 채널 UI를 피하는 안전영역 안에 둔다.
- 이미 자막이 구워진 미디어를 입력하면 별도 동적 자막 트랙을 만들지 않는다.
- 자막이 없는 입력만 `captions.srt`를 동적 자막 트랙으로 추가한다.
- 원본 오디오 출처 정책과 60~120초 길이 규칙은 기존 `shorts-derivative-manifest.json` 계약을 그대로 적용한다.
- CapCut 앱 버전의 비공개 템플릿 ID나 마켓플레이스 템플릿에 의존하지 않는다.

---

## File Structure

- Create `electron/services/shorts-card-template-schema.mjs`: 프리셋 레시피 정규화와 좌표·색상·텍스트 길이 검증
- Create `electron/services/shorts-card-template-presets.mjs`: 두 기본 프리셋과 안전영역 정의
- Create `electron/services/shorts-card-template-plan.mjs`: 파생 매니페스트와 프리셋을 CapCut/FFmpeg 공통 렌더 계획으로 변환
- Modify `electron/services/capcut-handoff-package.mjs`: 카드형 레이어를 CapCut edit plan에 전달
- Modify `scripts/capcut/build_hermes_editable_draft.py`: 배경, 미디어 창, 제목, CTA, 선택적 자막 트랙 생성
- Create `scripts/render-short-card-template.mjs`: 미리보기와 최종 MP4를 생성하는 CLI
- Create `scripts/check-shorts-card-template-schema.mjs`: 레시피 계약 검사
- Create `scripts/check-shorts-card-template-plan.mjs`: 레이어와 안전영역 검사
- Create `scripts/check-shorts-card-template-render.mjs`: 실제 렌더·스트림·프레임 검사
- Create `scripts/check-shorts-card-template-capcut.mjs`: 편집 가능한 CapCut 트랙 검사
- Create `C:/Users/amd/.codex/skills/hermes-longform-card-short/SKILL.md`: 재사용 제작 절차
- Create `C:/Users/amd/.codex/skills/hermes-longform-card-short/references/template-contract.md`: 입력 필드와 선택 규칙

### Task 1: 카드 템플릿 계약

**Files:**
- Create: `electron/services/shorts-card-template-schema.mjs`
- Test: `scripts/check-shorts-card-template-schema.mjs`

**Interfaces:**
- Produces: `CARD_TEMPLATE_VERSION = 1`
- Produces: `normalizeShortsCardTemplate(input)`
- Produces: `validateShortsCardTemplate(template)`

- [ ] **Step 1: 실패하는 계약 검사를 작성한다**

```js
const white = normalizeShortsCardTemplate({
  id: "white-article",
  canvas: { width: 1080, height: 1920 },
  mediaBox: { x: 90, y: 820, width: 900, height: 506 },
  titleBox: { x: 100, y: 210, width: 880, height: 250 },
  ctaBox: { x: 190, y: 1620, width: 700, height: 92 }
});
assert.equal(white.version, 1);
assert.throws(() => normalizeShortsCardTemplate({
  id: "unsafe",
  canvas: { width: 1080, height: 1920 },
  ctaBox: { x: 900, y: 1750, width: 300, height: 120 }
}), /CARD_TEMPLATE_SAFE_AREA/);
```

- [ ] **Step 2: 검사가 올바른 이유로 실패하는지 확인한다**

Run: `node scripts/check-shorts-card-template-schema.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 최소 정규화와 검증을 구현한다**

허용 ID, 1080×1920 캔버스, 양수 크기, 캔버스 경계, 텍스트 상자 겹침, 우측 120px 및 하단 250px UI 회피 규칙을 검사한다. 오류 코드는 `CARD_TEMPLATE_ID_INVALID`, `CARD_TEMPLATE_BOX_OUT_OF_BOUNDS`, `CARD_TEMPLATE_SAFE_AREA`로 고정한다.

- [ ] **Step 4: 계약 검사를 통과시킨다**

Run: `node scripts/check-shorts-card-template-schema.mjs`
Expected: `SHORTS_CARD_TEMPLATE_SCHEMA_OK`

- [ ] **Step 5: 커밋한다**

```powershell
git add electron/services/shorts-card-template-schema.mjs scripts/check-shorts-card-template-schema.mjs
git commit -m "feat: define shorts card template contract"
```

### Task 2: 두 프리셋과 공통 렌더 계획

**Files:**
- Create: `electron/services/shorts-card-template-presets.mjs`
- Create: `electron/services/shorts-card-template-plan.mjs`
- Test: `scripts/check-shorts-card-template-plan.mjs`

**Interfaces:**
- Consumes: `normalizeShortsCardTemplate(input)`
- Produces: `getShortsCardTemplate(id)`
- Produces: `buildShortsCardTemplatePlan({ derivativeManifest, templateId, copy, mediaProbe })`

- [ ] **Step 1: 두 프리셋의 실제 좌표를 고정하는 실패 검사를 작성한다**

```js
assert.deepEqual(getShortsCardTemplate("white-article").mediaBox,
  { x: 90, y: 820, width: 900, height: 506 });
assert.deepEqual(getShortsCardTemplate("black-immersive").mediaBox,
  { x: 0, y: 600, width: 1080, height: 608 });
const plan = buildShortsCardTemplatePlan({
  derivativeManifest: fixture,
  templateId: "white-article",
  copy: {
    title: "에펠탑을 미워한 남자",
    deck: "그가 매일 탑 안에서 밥을 먹은 이유",
    cta: "본편에서 전체 이야기 보기"
  },
  mediaProbe: { width: 1080, height: 1920, hasBurnedCaptions: true }
});
assert.equal(plan.captionTrack, null);
assert.equal(plan.layers[0].role, "background");
assert.ok(plan.layers.some((layer) => layer.role === "media"));
```

- [ ] **Step 2: 검사가 실패하는지 확인한다**

Run: `node scripts/check-shorts-card-template-plan.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 검증된 프로토타입 좌표로 두 프리셋을 구현한다**

`white-article`은 `#FAF8F2` 배경, 높이 160의 `#F0D87A` 헤더, 900×506 미디어 창을 사용한다. `black-immersive`는 검정 배경, 흰색/`#FFE13B` 2색 제목, 1080×608 미디어 창을 사용한다. 입력이 1080×1920 blur-background 합성본이면 중앙 실제 영상 영역 `crop(0,656,1080,608)`을 우선 추출한다.

- [ ] **Step 4: 제목 길이와 자막 중복 검사를 추가한다**

한글 제목은 줄당 공백 제외 18자, 최대 2줄로 제한한다. `hasBurnedCaptions=true`이면 `captionTrack=null`, 그렇지 않으면 SRT 경로를 요구하고 없을 때 `CARD_TEMPLATE_CAPTIONS_REQUIRED`를 반환한다.

- [ ] **Step 5: 계획 검사를 통과시킨다**

Run: `node scripts/check-shorts-card-template-plan.mjs`
Expected: `SHORTS_CARD_TEMPLATE_PLAN_OK`

- [ ] **Step 6: 커밋한다**

```powershell
git add electron/services/shorts-card-template-presets.mjs electron/services/shorts-card-template-plan.mjs scripts/check-shorts-card-template-plan.mjs
git commit -m "feat: add article and immersive shorts presets"
```

### Task 3: 재현 가능한 MP4 렌더러

**Files:**
- Create: `scripts/render-short-card-template.mjs`
- Test: `scripts/check-shorts-card-template-render.mjs`

**Interfaces:**
- Consumes: `buildShortsCardTemplatePlan(...)`
- Produces CLI: `node scripts/render-short-card-template.mjs --manifest <path> --template <id> --output <path>`
- Produces: `{ ok, outputPath, probe, qaFrames, templateId }`

- [ ] **Step 1: 3초 fixture 렌더가 없어서 실패하는 검사를 작성한다**

검사는 두 프리셋을 각각 렌더하고 `1080×1920`, `SAR 1:1`, H.264, AAC, 오디오 1개 이상, 영상 길이 `3.0±0.1초`를 단언한다. 1초 프레임의 평균 밝기를 비교해 `white-article > black-immersive`도 확인한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `node scripts/check-shorts-card-template-render.mjs`
Expected: FAIL because `render-short-card-template.mjs` does not exist

- [ ] **Step 3: FFmpeg 렌더 CLI를 구현한다**

번들 `ffmpeg-static`과 `@derhuerst/ffprobe-static`만 사용한다. 텍스트는 `NotoSansKR-VF.ttf` 또는 기존 Hermes 폰트 resolver를 사용하고, `libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart`로 출력한다.

- [ ] **Step 4: 렌더·프레임 검사를 통과시킨다**

Run: `node scripts/check-shorts-card-template-render.mjs`
Expected: `SHORTS_CARD_TEMPLATE_RENDER_OK`

- [ ] **Step 5: 커밋한다**

```powershell
git add scripts/render-short-card-template.mjs scripts/check-shorts-card-template-render.mjs
git commit -m "feat: render reusable shorts card templates"
```

### Task 4: 편집 가능한 CapCut 트랙

**Files:**
- Modify: `electron/services/capcut-handoff-package.mjs`
- Modify: `scripts/capcut/build_hermes_editable_draft.py`
- Test: `scripts/check-shorts-card-template-capcut.mjs`

**Interfaces:**
- Consumes: 카드 템플릿 plan의 `layers[]`
- Produces: CapCut tracks `background`, `media`, `fixed-copy`, `captions?`, `cta`

- [ ] **Step 1: 트랙 분리를 요구하는 실패 검사를 작성한다**

```js
assert.deepEqual(draft.trackRoles,
  ["background", "media", "fixed-copy", "captions", "cta"]);
assert.equal(draft.materials.media[0].crop.width, 1080);
assert.ok(draft.materials.text.every((item) => item.editable === true));
```

자막이 이미 구워진 fixture에서는 `captions`가 빠지고 나머지 네 트랙만 존재하는 별도 단언을 둔다.

- [ ] **Step 2: 기존 빌더가 카드 레이어를 지원하지 않아 실패하는지 확인한다**

Run: `node scripts/check-shorts-card-template-capcut.mjs`
Expected: FAIL with `CARD_TEMPLATE_LAYER_UNSUPPORTED`

- [ ] **Step 3: 카드 레이어를 pycapcut 트랙으로 변환한다**

배경은 전체 길이 color clip, 미디어는 crop/scale된 video clip, 제목·설명·CTA는 각각 편집 가능한 text material로 만든다. 동적 자막이 필요할 때만 기존 SRT cue를 caption track에 배치한다.

- [ ] **Step 4: CapCut 초안 계약을 통과시킨다**

Run: `node scripts/check-capcut-handoff-package.mjs && node scripts/check-shorts-card-template-capcut.mjs`
Expected: `CAPCUT_HANDOFF_PACKAGE_OK` and `SHORTS_CARD_TEMPLATE_CAPCUT_OK`

- [ ] **Step 5: 커밋한다**

```powershell
git add electron/services/capcut-handoff-package.mjs scripts/capcut/build_hermes_editable_draft.py scripts/check-shorts-card-template-capcut.mjs
git commit -m "feat: build editable CapCut card shorts"
```

### Task 5: 전용 개인 스킬

**Files:**
- Create: `C:/Users/amd/.codex/skills/hermes-longform-card-short/SKILL.md`
- Create: `C:/Users/amd/.codex/skills/hermes-longform-card-short/agents/openai.yaml`
- Create: `C:/Users/amd/.codex/skills/hermes-longform-card-short/references/template-contract.md`

**Interfaces:**
- Consumes: 롱폼 job directory, 후보 번호, `white-article|black-immersive|both`
- Produces: 매니페스트, 두 MP4, 두 CapCut draft, QA 프레임, 비교 요약

- [ ] **Step 1: 스킬에 고정된 실행 순서를 작성한다**

순서는 `query source → analyze candidate → approve candidate → choose template → write copy → render 3s preview → inspect → render full → build CapCut → ffprobe/frames QA`로 고정한다. 미리보기 승인 전 전체 렌더를 금지한다.

- [ ] **Step 2: 자동 프리셋 선택 규칙을 작성한다**

정지 이미지·자료화면·역사 서사는 `white-article`, 인물 행동·스포츠·강한 사건 영상은 `black-immersive`, 판단 점수가 70 미만이면 `both` 미리보기를 생성한다.

- [ ] **Step 3: 스킬 구조를 검증한다**

Run: `python C:/Users/amd/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/amd/.codex/skills/hermes-longform-card-short`
Expected: exit code 0

- [ ] **Step 4: 커밋한다**

```powershell
git add docs/superpowers/plans/2026-07-28-longform-to-short-capcut-card-templates-plan.md
git commit -m "docs: plan reusable CapCut card shorts"
```

### Task 6: 에펠탑 수용 검사와 회귀

**Files:**
- Create: `scripts/check-eiffel-card-template-acceptance.mjs`
- Modify: `docs/superpowers/plans/2026-07-28-longform-to-short-rebirth-plan.md`

**Interfaces:**
- Consumes: 에펠탑 파생 매니페스트와 두 프리셋
- Produces: 두 113.5초 MP4, 두 CapCut 초안, 2/60/110초 QA 프레임

- [ ] **Step 1: 실제 자산 기준 수용 검사를 작성한다**

두 결과 모두 113.5±0.1초, 1080×1920, SAR 1:1, H.264/AAC여야 한다. 프레임 2/60/110초에서 미디어 창이 비어 있지 않고, 고정 제목과 CTA의 bounding box가 안전영역을 넘지 않아야 한다.

- [ ] **Step 2: 전체 검증을 실행한다**

Run:

```powershell
node scripts/check-shorts-card-template-schema.mjs
node scripts/check-shorts-card-template-plan.mjs
node scripts/check-shorts-card-template-render.mjs
node scripts/check-capcut-handoff-package.mjs
node scripts/check-shorts-card-template-capcut.mjs
node scripts/check-eiffel-card-template-acceptance.mjs
```

Expected: 모든 명령 exit code 0, 마지막 출력 `EIFFEL_CARD_TEMPLATE_ACCEPTANCE_OK`

- [ ] **Step 3: 기존 계획의 blur-background 기본값을 교체한다**

기존 계획에서 최종 전달 기본값을 `white-article`로 바꾸고, 영상 행동성이 높은 후보에는 `black-immersive` 비교 미리보기를 생성하도록 연결한다. 기존 blur-background 렌더는 카드 템플릿의 미디어 입력 생성 단계로만 유지한다.

- [ ] **Step 4: 커밋한다**

```powershell
git add scripts/check-eiffel-card-template-acceptance.mjs docs/superpowers/plans/2026-07-28-longform-to-short-rebirth-plan.md
git commit -m "test: accept reusable Eiffel card shorts"
```

## Prototype Evidence

- White article prototype: `eiffel-short-white-article-template.mp4`
- Black immersive prototype: `eiffel-short-black-immersive-template.mp4`
- Both prototypes were rendered at 1080×1920, SAR 1:1, H.264/AAC, duration 113.5 seconds.
- The 2/60/110-second frames confirmed that the source captions remain visible inside the media window and fixed copy stays outside it.

