# Hermes 범용 영상 생성 스킬·운영 체계 설계

## 목적

Hermes 영상 생성 과정에서 LLM이 매번 코드베이스와 장문의 운영 문서를 다시 읽는 비용을 줄이고, Codex·Claude·Gemini 등 서로 다른 에이전트가 동일한 검증·재개·산출물 계약을 사용하게 한다.

스킬은 판단과 명령 선택을 담당한다. 반복적인 파일 탐색, manifest 생성, 단계 실행, 상태 판정, 검증과 보고는 결정론적인 CLI가 담당한다.

## 조사 근거

Agent Skills 표준은 다음 3단계 progressive disclosure를 사용한다.

1. 세션 시작 시 `name`과 `description`만 노출한다.
2. 작업과 일치하는 스킬의 `SKILL.md`만 활성화한다.
3. 세부 reference, script, asset은 해당 작업에서 필요할 때만 사용한다.

따라서 자주 활성화되는 `SKILL.md`에는 모델이 이미 아는 일반론을 넣지 않는다. Hermes 고유 라우팅, 명령, 실패 코드와 완료 조건만 넣고, 긴 스키마와 제공자별 절차는 별도 reference에 둔다. 반복 작성되는 코드는 스킬 설명이 아니라 실행 스크립트로 제공한다.

참고 자료:

- Agent Skills specification: https://agentskills.io/specification
- Agent Skills best practices: https://agentskills.io/skill-creation/best-practices
- Agent Skills description optimization: https://agentskills.io/skill-creation/optimizing-descriptions
- OpenAI skills catalog: https://github.com/openai/skills
- OpenAI skill creator sample: https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-creator/SKILL.md
- Anthropic skills examples: https://github.com/anthropics/skills
- GitHub reusable workflows: https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations

## 현재 구조에서 확인된 문제

### 작업 진입점 분산

`scripts/run-*.mjs`, `scripts/resume-*.mjs`, `scripts/render-*.mjs`, `scripts/check-*.mjs`가 목적과 단계별로 분산되어 있다. 다른 LLM은 새 작업마다 사용할 스크립트와 실행 순서를 다시 탐색한다.

### 대형 오케스트레이터 재독해

`youtube-workflow.mjs`, `youtube-workflow-stages.mjs`, `electron/services/youtube-job-service.mjs`가 생성, 복구, 제공자 라우팅, 렌더링과 보고 책임을 폭넓게 가진다. 특정 단계만 수행해도 많은 코드를 읽게 된다.

### 문서와 런타임 규격 불일치

현재 `research.md`는 3분 이후 이미지 전환을 30~60초로 정의하지만 최근 three-tier 구현은 16~30초, 목표 20초를 사용한다. 자연어 문서를 직접 실행 규격으로 사용하면 모델마다 서로 다른 값을 선택할 수 있다.

### 재개 판단의 모델 의존성

job 디렉터리에는 여러 manifest와 결과 파일이 있지만 “어디서 실패했고 무엇만 다시 실행해야 하는가”를 반환하는 단일 명령이 없다. 모델이 로그와 파일을 직접 조합하면 토큰 소비와 오판 가능성이 커진다.

### 검증 명령 중복

집중 검사, 전체 제품 검사, live acceptance의 경계가 package script와 개별 명령에 흩어져 있다. 기존 baseline 실패와 새 회귀 실패도 자동 분류되지 않는다.

## 설계 원칙

### 하나의 실행 규격

영상 프로필의 숫자와 정책은 버전이 있는 JSON manifest로 관리한다. `research.md`는 배경, 근거와 운영 해설을 유지하지만 런타임 숫자의 원본이 되지 않는다.

예:

```json
{
  "schemaVersion": 1,
  "id": "history-longform-capcut-15m-v1",
  "durationSeconds": 900,
  "aspectRatio": "16:9",
  "deliveryMode": "capcut-editable",
  "intro": {
    "clipCount": 3,
    "clipSeconds": 10,
    "totalSeconds": 30
  },
  "visualPacing": {
    "early": { "start": 30, "end": 180, "min": 8, "target": 10, "max": 15 },
    "deep": { "start": 180, "end": 900, "min": 16, "target": 20, "max": 30 }
  }
}
```

`research.md`의 30~60초 정책은 별도 실험 프로필로 보존하거나, 실제 운영 결정을 거쳐 위 기본 프로필을 변경한다. 두 값을 같은 프로필에서 혼용하지 않는다.

### 스킬과 CLI 책임 분리

스킬이 담당하는 일:

- 사용자 의도를 작업 유형으로 분류
- 필요한 profile과 명령 선택
- 위험하거나 비용이 발생하는 단계의 실행 전 조건 확인
- CLI 결과를 짧게 해석하고 다음 단계 결정
- 사람 검수가 필요한 지점을 알림

CLI가 담당하는 일:

- 코드와 job 파일 탐색
- job manifest 정규화 및 검증
- 단계 실행과 재개
- 파일 해시, 길이, 화면비, 오디오와 자막 검사
- 실패 코드와 다음 실행 명령 생성
- JSON 형식의 기계 판독 결과 출력

### 공용 application service와 실행 표면 분리

CLI를 Electron에서 다시 subprocess로 실행하지 않는다. `scripts/hermes-video.mjs`와 Electron IPC handler가 동일한 application service를 호출한다. application service는 현재 `emitJobProgress()`와 호환되는 event sink를 인자로 받으며, CLI는 이를 NDJSON 또는 최종 JSON으로 직렬화하고 Electron은 `youtube:event`로 전달한다.

이 구조는 다음을 보장한다.

- Electron과 CLI가 job 상태 판정 코드를 공유한다.
- Desktop 작업에서 별도 CLI 프로세스가 동일 job을 중복 실행하지 않는다.
- 로그인, CAPTCHA, 수동 업로드와 CapCut 사람 검수 상태가 UI와 CLI에서 동일 failure/action 계약을 사용한다.
- 기존 BrowserWindow, CDP와 persistent profile의 소유권은 Electron/automation service에 유지한다.

### 실패 시 닫힘

지원되지 않는 profile, 누락된 입력, 불일치한 해시, 자격 없는 CapCut 런타임은 임의의 다른 경로로 폴백하지 않는다. CLI는 안정된 오류 코드와 `nextActions`를 반환한다.

### 2단계 pacing

1차 scene plan은 대본과 예상 발화 길이로 prompt와 필요한 생성 자산을 계획한다. CapCut 편집 경로는 기존처럼 `prepareCapcutNarration()`을 미디어 생성 전에 실행한 뒤, 측정된 narration segment를 사용해 adaptive visual timeline을 다시 만든다. 미디어 생성과 CapCut handoff는 이 measured timeline을 소비한다.

일반 Hermes render 경로의 기존 순서는 이번 변경으로 강제 전환하지 않는다. measured narration을 요구하는 profile만 `MEASURED_TTS_REQUIRED`로 fail closed 한다.

### 계층별 캐시 키

원본 생성 자산과 타임라인에 종속되는 파생 렌더를 같은 키로 캐시하지 않는다.

- `sourceContentHash = SHA256(raw file bytes)`
- `generationKey = SHA256(profile version + provider + model + normalized prompt + generation settings)`
- `renderKey = SHA256(sourceContentHash + measured timeline slice + motion/crop + overlays + renderer version)`

resume은 manifest에 기록된 실제 `sourceContentHash`와 현재 파일을 비교한다. prompt나 provider가 달라지면 생성 자산을 재생성하고, TTS 길이·자막·타이틀·모션만 달라지면 원본 자산은 유지하면서 파생 렌더만 무효화한다.

### 모델 독립성

`.agents/skills/`를 canonical source로 사용한다. Codex, Claude, Gemini 전용 위치에는 복사본을 직접 편집하지 않고 동기화 도구로 생성한다. 공통 본문에는 특정 모델의 전용 tool 이름을 넣지 않는다. 모델별 차이는 adapter reference에만 둔다.

## 구성

```text
.agents/
  skills/
    hermes-video-router/
      SKILL.md
      references/
        intent-map.md
    creating-hermes-video-job/
      SKILL.md
      references/
        job-contract.md
    generating-hermes-draft/
      SKILL.md
      references/
        research-and-script.md
    generating-hermes-media/
      SKILL.md
      references/
        provider-routing.md
    assembling-hermes-capcut/
      SKILL.md
      references/
        capcut-contract.md
    resuming-hermes-video-job/
      SKILL.md
      references/
        recovery-codes.md
    validating-hermes-video/
      SKILL.md
      references/
        acceptance-levels.md
  rules/
    hermes-video-safety.md
config/
  video-profiles/
    history-longform-capcut-15m-v1.json
scripts/
  hermes-video.mjs
  lib/
    video-command-router.mjs
    video-job-inspector.mjs
    video-profile-loader.mjs
  video-verification-runner.mjs
    video-operation-service.mjs
    video-domain-events.mjs
  sync-agent-skills.mjs
  check-hermes-video-skill-contract.mjs
  check-hermes-video-cli-contract.mjs
```

## 스킬 경계

### `hermes-video-router`

영상 생성, 재개, 자산 교체, 렌더링, CapCut, 검증 요청의 단일 진입점이다. 다른 스킬의 내용을 대신 포함하지 않고 해당 스킬과 CLI 명령만 선택한다. 전체 본문은 200단어 이내를 목표로 한다.

### `creating-hermes-video-job`

사용자 입력을 profile과 job request로 바꾼다. profile에 없는 숫자를 임의 추론하지 않으며, `hermes-video job create --profile ...` 실행 결과를 소비한다.

### `generating-hermes-draft`

research brief, 출처, 대본, 역사적 맥락, 문자 수와 내레이션 계약을 다룬다. 제공자 공통 계약만 본문에 두고 긴 prompt 규칙은 reference 또는 프로그램 코드가 소유한다.

### `generating-hermes-media`

scene manifest를 입력으로 Flow, Grok, manual asset 경로를 선택한다. 비용 정책, 재시도, account routing과 fallback 허용 범위는 CLI 결과에 따른다.

### `assembling-hermes-capcut`

측정된 TTS, SRT, user intro, visual assets를 CapCut handoff로 조립한다. 15분·16:9·three-tier 작업은 실제 TTS 측정 후 adaptive timeline이 존재해야만 진행한다.

### `resuming-hermes-video-job`

job 디렉터리를 직접 추론하지 않고 `hermes-video inspect <jobDir>` 결과의 `resumeFrom`, `invalidArtifacts`, `nextActions`만 사용한다. 해시가 다른 자산은 완료된 것으로 취급하지 않는다.

### `validating-hermes-video`

검증을 `contract`, `offline-e2e`, `live-acceptance` 세 수준으로 구분한다. 기존 baseline 실패는 allowlist와 만료일을 가진 별도 파일에서 관리하고 새 회귀를 가리지 않는다.

## 통합 CLI 계약

주 명령은 `node scripts/hermes-video.mjs`이며 npm alias `npm run hermes:video --`를 제공한다.

```text
hermes-video profiles list
hermes-video job create --profile <id> --input <json>
hermes-video inspect <jobDir>
hermes-video run <jobDir> --until <stage>
hermes-video resume <jobDir>
hermes-video verify <jobDir> --level contract|offline-e2e|live-acceptance
hermes-video report <jobDir> --format json|markdown
hermes-video skills sync --target codex|claude|gemini|all
```

모든 명령은 stdout에 다음 envelope를 출력한다.

```json
{
  "ok": true,
  "command": "inspect",
  "jobId": "youtube-...",
  "state": "media-partial",
  "artifacts": [],
  "failureCodes": [],
  "nextActions": [
    {
      "actionId": "RETRY_FAILED_SCENES",
      "targetStage": "media",
      "uiLabel": "실패 장면 미디어 재생성",
      "command": "npm run hermes:video -- resume C:\\jobs\\youtube-...",
      "reason": "scene 18 media is missing"
    }
  ]
}
```

사람용 설명은 stderr 또는 `report --format markdown`에서 생성한다. 다른 LLM은 JSON만 읽어도 다음 행동을 결정할 수 있어야 한다. `actionId`, `targetStage`와 `uiLabel`은 CLI와 기존 Desktop 복구 버튼이 공유한다.

## 상태와 데이터 흐름

```text
user intent
  -> hermes-video-router
  -> profile selection
  -> validated job request
  -> research and draft
  -> measured TTS
  -> measured adaptive visual timeline
  -> generated/reused media
  -> CapCut handoff or Hermes render
  -> contract QA
  -> offline E2E
  -> optional live acceptance
```

각 단계는 job 디렉터리에 versioned manifest와 content hash를 기록한다. 다음 단계는 이전 단계의 완료 플래그가 아니라 manifest 버전, 입력 hash와 산출물 hash를 검증한다.

## 토큰 절감 전략

- router skill은 명령 선택만 포함하고 200단어 이내로 유지한다.
- 각 작업 스킬은 500단어 이내를 목표로 한다.
- JSON schema, 오류 코드 표, provider 세부 절차는 필요한 경우에만 reference로 읽는다.
- 파일 목록이나 로그를 LLM이 직접 요약하지 않는다. `inspect`와 `report`가 bounded JSON을 생성한다.
- job 상태 전달에는 전체 대화 대신 job ID, profile ID, 현재 stage와 failure codes만 사용한다.
- prompt는 template ID와 입력 변수로 저장하고 동일한 장문 system prompt를 매번 job manifest에 복제하지 않는다.
- 대형 파일의 관련 범위는 CLI가 symbol과 line range로 반환한다.
- 동일 원본 자산은 `generationKey`와 `sourceContentHash`로 재사용하고, timeline 종속 렌더는 별도 `renderKey`로 무효화한다.

## 오류 처리

- `PROFILE_NOT_FOUND`: 지원 profile 목록 반환
- `JOB_SCHEMA_INVALID`: 실패한 JSON pointer와 허용값 반환
- `PREREQUISITE_MISSING`: 누락 manifest와 생성 명령 반환
- `ARTIFACT_HASH_MISMATCH`: 손상 파일과 재생성 단계 반환
- `PROVIDER_AUTH_REQUIRED`: 인증 절차 reference만 요청
- `PROVIDER_COST_APPROVAL_REQUIRED`: 비용 발생 전 중단
- `CAPCUT_RUNTIME_UNQUALIFIED`: Hermes 폴백 없이 중단해야 하는 profile 여부 표시
- `MEASURED_TTS_REQUIRED`: adaptive timeline 생성 전 CapCut 조립 차단
- `HUMAN_ACCEPTANCE_REQUIRED`: 자동 검증과 사람 검수 항목 분리

오류별 `nextActions`는 자유 형식 문자열이 아니라 등록된 `actionId`를 사용한다. 초기 registry는 `RETRY_FAILED_SCENES`, `RENDER_EXISTING_ASSETS`, `AUTHENTICATE_PROVIDER`, `UPLOAD_MANUAL_MEDIA`, `REBUILD_CAPCUT_HANDOFF`, `RUN_LIVE_ACCEPTANCE`로 제한한다.

## 검증 전략

### 스킬 검증

각 스킬은 작성 전에 skill이 없는 fresh-context 에이전트의 실패 사례를 기록한다. 작성 후 동일 과제로 최소 5회 trigger·routing 검사를 수행한다.

검사 항목:

- 관련 요청에서 정확한 스킬이 활성화되는가
- 무관한 요청에서 활성화되지 않는가
- 전체 코드베이스를 읽지 않고 CLI를 먼저 사용하는가
- 지원되지 않는 profile 값을 추측하지 않는가
- 실패 시 올바른 복구 명령을 선택하는가

### CLI 계약 검증

fixture job을 사용해 create, inspect, resume, verify와 report의 JSON envelope를 snapshot이 아닌 의미 기반 assertion으로 검사한다.

### 워크플로 검증

- contract: schema, manifest, hash와 명령 연결
- offline-e2e: synthetic media와 실제 FFmpeg/ffprobe
- live-acceptance: 실제 제공자, TTS와 CapCut GUI가 필요한 수동 또는 승인 기반 검사

### 토큰 효율 검증

대표 과제별로 다음을 기록한다.

- 로드한 `SKILL.md`와 reference 수
- 읽은 소스 파일 수와 문자 수
- CLI 출력 크기
- 첫 유효 명령까지의 모델 입력·출력 토큰
- 재개 성공에 필요한 대화 turn 수

기존 방식 대비 중앙값 50% 이상 감소를 1차 목표로 한다. 성공률이 낮아지는 경우 토큰 절감보다 정확성을 우선한다.

## 운영과 버전 관리

- skill과 profile은 Git으로 버전 관리한다.
- profile 변경은 research 근거, 변경 사유와 acceptance 결과를 함께 기록한다.
- `research.md`는 관찰과 근거를 설명하고 profile ID를 링크한다.
- `AGENTS.md`에는 전체 영상 규칙을 복사하지 않고 router skill과 대표 검증 명령만 추가한다.
- skill 동기화 결과물에는 canonical commit SHA를 기록해 오래된 복사본을 탐지한다.
- GitHub Actions는 skill format, trigger eval, CLI contract와 offline E2E를 재사용 workflow로 묶는다.

## 범위 제외

- LLM 공급자별 프롬프트 전체를 하나의 범용 프롬프트로 통합하지 않는다.
- 실제 Flow·Grok·CapCut GUI를 승인 없이 CI에서 실행하지 않는다.
- 운영 데이터 없이 research의 전환 간격을 자동으로 최적화하지 않는다.
- 기존 모든 `run-*.mjs` 스크립트를 한 번에 삭제하지 않는다. 통합 CLI로 옮긴 뒤 usage telemetry가 없는 wrapper부터 단계적으로 폐기한다.

## 완료 조건

- 지원되는 세 LLM 환경에서 동일 canonical skill을 발견하고 동일 CLI를 선택한다.
- 새 영상 작업과 실패 job 재개가 전체 오케스트레이터 소스 파일을 읽지 않고 수행된다.
- 모든 job은 profile ID, manifest version과 artifact hash를 가진다.
- three-tier CapCut 작업은 measured TTS 기반 timeline 없이는 조립되지 않는다.
- contract와 offline E2E가 통과하며 live acceptance가 별도 상태로 표시된다.
- 대표 작업의 중앙 토큰 사용량이 기존 방식보다 50% 이상 감소하고 성공률이 저하되지 않는다.
