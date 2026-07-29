# 에이전트 가이드

## 지식 운영

- `save`, `ingest`, `query`/`reference`, `lint` 요청은 프로젝트 위키 규칙을 따른다.
- raw 원본, secret, token, OAuth secret, API key는 수정하거나 저장하지 않는다.
- 위키 명령 기록은 `log.md`, 코드 변경과 검증 결과는 `timeline.md`에 기록한다.

## Hermes 영상 작업

- 영상 생성, 재개, CapCut, Flow/Grok media, render 또는 영상 QA 요청은 먼저 `.agents/skills/hermes-video-router/SKILL.md`를 사용한다.
- job 디렉터리가 있으면 소스 파일을 읽기 전에 `npm run hermes:video -- inspect "<jobDir>" --json`을 실행한다.
- provider 비용 발생, 계정 인증, 업로드 또는 live CapCut acceptance는 명시적 승인 없이 실행하지 않는다.
