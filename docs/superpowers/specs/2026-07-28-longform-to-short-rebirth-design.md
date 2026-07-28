# Longform-to-Short Rebirth Design

## 목적

Hermes에서 완성된 모든 본편 작업을 입력으로 받아, 원본 대본·나레이션·자막·장면 자산을 재사용해 1~2분 분량의 세로형 쇼츠 1개와 편집 가능한 CapCut 초안을 생성한다. 에펠탑 본편을 최초 수용 테스트로 사용하되 이야기나 인물에 종속되지 않는 범용 기능으로 만든다.

## 조사 근거

- YouTube는 본편 재활용 시 핵심 순간 선별, 독립적으로 이해되는 짧은 구성, 9:16 크롭, 자막·텍스트 오버레이, 본편 CTA를 권장한다.
  - https://blog.youtube/creator-and-artist-stories/transitioning-your-long-form-content-to-youtube-shorts/
- 세로 또는 정사각형 영상은 최대 3분까지 Shorts로 분류될 수 있다. 단, 1분을 넘는 Short에 활성 Content ID 주장이 있으면 전 세계 차단될 수 있다.
  - https://support.google.com/youtube/answer/15424877?hl=en
- PySceneDetect는 영상 장면 경계 검출에 참고할 수 있다.
  - https://github.com/Breakthrough/PySceneDetect
- WhisperX는 단어 단위 타임스탬프와 음성 정렬에 참고할 수 있다.
  - https://github.com/m-bain/whisperX
- LosslessCut은 시간 구간 기반 비파괴 추출·재배열 모델에 참고할 수 있다.
  - https://github.com/mifi/lossless-cut
- Auto-Editor는 음성·정적 구간 분석에 따른 자동 압축 방식에 참고할 수 있다.
  - https://github.com/wyattblue/auto-editor

외부 프로젝트를 직접 의존성으로 추가하지 않는다. Hermes가 이미 보유한 SRT, 장면 매니페스트, FFmpeg, CapCut 파이프라인으로 1차 구현하고 필요성이 입증될 때만 별도 의존성을 검토한다.

## 결정한 접근법

### Hermes 엔진과 개인 스킬의 조합

- Hermes 엔진은 작업 폴더 검사, 구간 분석, 자산 매핑, 음성 절단, 세로 재프레이밍, 렌더링, CapCut 초안 생성을 담당한다.
- `hermes-longform-to-short` 스킬은 작업 순서, 승인 지점, 품질 기준, 재생성 판단과 결과 보고를 담당한다.
- 스킬 내부에 영상 처리 로직을 중복 구현하지 않는다. 스킬은 Hermes CLI/서비스를 호출하고 생성된 매니페스트를 검토한다.

이 구조를 선택한 이유는 UI 사용성과 자동화 재사용성을 함께 확보하면서 렌더링 규칙의 단일 출처를 Hermes에 유지할 수 있기 때문이다.

## 사용자 흐름

1. 사용자가 완료된 본편 작업을 선택하고 `쇼츠로 재탄생`을 실행한다.
2. Hermes가 본편 대본, SRT, 음성, 장면 매니페스트와 미디어 존재 여부를 검사한다.
3. 분석기가 60~120초 후보를 최대 3개 만들고 점수와 선택 이유를 표시한다.
4. 기본값으로 최고 점수 후보 1개를 선택하되 사용자가 다른 후보나 시간 범위를 선택할 수 있다.
5. Hermes가 쇼츠용 훅·연결문·결말·CTA를 포함한 파생 편집 매니페스트를 생성한다.
6. 각 장면에 `crop`, `blur-background`, `regenerate-vertical` 중 하나를 지정한다.
7. 사용자가 세로 재생성 목록과 프롬프트를 승인한다.
8. Hermes가 1080×1920 MP4와 편집 가능한 CapCut 초안을 생성하고 QA 결과를 표시한다.

## 후보 선별

후보는 문장 단위가 아니라 SRT 큐와 원본 장면 경계를 함께 사용한다. 각 후보는 다음 조건을 만족해야 한다.

- 길이: 기본 90초, 허용 범위 60~120초
- 첫 3초 안에 질문, 모순, 놀라운 사실 또는 강한 결과 제시
- 인물·사건·대상이 사전 맥락 없이 식별됨
- 갈등 또는 궁금증과 그에 대한 보상이 모두 포함됨
- 문장 중간에서 시작하거나 끝나지 않음
- 같은 내용을 반복하는 큐는 제거 가능
- 사실관계는 원본 대본을 벗어나지 않음

점수는 `hook 30 + payoff 25 + standalone 20 + visual 15 + compression 10`의 100점 척도를 사용한다. 70점 미만이면 자동 선택하지 않고 수동 범위 선택을 요구한다.

## 파생 편집 매니페스트

작업 폴더 아래 `shorts-rebirth/<derivativeId>/shorts-derivative-manifest.json`을 단일 계약으로 사용한다.

```json
{
  "version": 1,
  "derivativeId": "eiffel-maupassant-reversal",
  "parentJobDir": "C:/.../youtube-capcut-eiffel-15m-production-run",
  "target": {
    "durationSeconds": 105,
    "aspectRatio": "9:16",
    "width": 1080,
    "height": 1920
  },
  "candidate": {
    "sourceStartSeconds": 461.841,
    "sourceEndSeconds": 591.101,
    "score": 91,
    "reasonCodes": ["strong-contradiction", "clear-payoff", "standalone"]
  },
  "segments": [
    {
      "id": "hook",
      "role": "hook",
      "sourceSceneIds": ["scene_35"],
      "sourceStartSeconds": 461.841,
      "sourceEndSeconds": 475.0,
      "narrationMode": "source-slice",
      "visualStrategy": "regenerate-vertical",
      "focalPoint": {"x": 0.68, "y": 0.48},
      "prompt": "9:16 vertical cinematic historical scene..."
    }
  ],
  "musicPolicy": "owned-or-youtube-audio-library-only",
  "cta": {"type": "watch-full-video", "durationSeconds": 4}
}
```

원본 경로와 타임스탬프를 보존해 파생 결과의 출처를 추적할 수 있게 한다. 원본 파일은 수정하지 않는다.

## 오디오와 자막

- 기본 음성은 본편 나레이션을 SRT/장면 타임라인에 맞춰 잘라 재사용한다.
- 비연속 구간 사이에는 최대 200ms 크로스페이드를 적용한다.
- 연결문이 꼭 필요할 때만 기존 음성 프리셋으로 짧게 합성하고 매니페스트에 `generated-bridge`로 기록한다.
- 최종 음성은 -16 LUFS 부근으로 정규화하고 피크는 -1 dBTP 이하로 제한한다.
- 자막은 세로 안전영역 안에 최대 2줄, 한국어 한 줄 약 8~12자를 기본으로 한다.
- 제목·자막을 원본 영상에 구워진 상태로 크롭하지 않고 파생 타임라인에서 다시 렌더링한다.

## 세로 화면 전략

각 세그먼트는 다음 우선순위를 따른다.

1. `crop`: 중심 피사체가 9:16 안전영역에 유지될 때 원본을 재프레이밍한다.
2. `blur-background`: 가로 구도가 중요한 장면은 흐린 배경 위에 원본 프레임을 유지한다.
3. `regenerate-vertical`: 첫 훅, 반전 공개, 핵심 인물·건축물이 잘리는 장면만 Google Flow용 9:16 프롬프트를 만든다.

전 장면 재생성은 비용과 캐릭터 일관성 문제 때문에 기본값으로 사용하지 않는다. 자동 얼굴 추적은 삽화·건축물 중심 본편에서 오탐 가능성이 있으므로 최초 버전에서는 장면별 초점 좌표와 미리보기 승인을 사용한다.

## 에펠탑 수용 테스트

첫 쇼츠는 약 90~110초로 구성한다.

- 0~3초: “에펠탑을 가장 싫어한 남자가 매일 그 안에서 밥을 먹었습니다.”
- 3~25초: 모파상과 예술가들이 철탑에 반대한 배경
- 25~55초: 완공 후에도 탑을 증오했던 상황
- 55~85초: 탑 안 식당을 매일 찾는 행동
- 85~100초: 탑이 보이지 않는 곳이 탑 안이라는 반전
- 마지막 4~6초: 오늘날 파리의 상징이 된 역설과 본편 CTA

모파상의 식사 일화는 널리 전해지는 이야기라는 표현을 유지하고, 검증되지 않은 직접 인용문을 사실처럼 새로 만들지 않는다.

## UI와 실행 상태

- 완료된 본편 상세 화면에 `쇼츠로 재탄생` 버튼을 추가한다.
- 후보 분석, 구성 검토, 세로 자산 검토, 렌더링의 네 상태를 표시한다.
- 원본 작업과 파생 작업을 별도 ID로 저장한다.
- 실패 후 재실행은 완료된 음성 절단·자산 정규화를 재사용한다.
- 결과 화면에서 MP4 폴더, CapCut 초안, 매니페스트를 각각 열 수 있게 한다.

## 품질 게이트

- 출력 해상도 1080×1920, SAR 1:1
- 길이 60~120초
- 음성·자막 오차 100ms 이내
- 자막과 핵심 피사체가 UI 안전영역 밖으로 나가지 않음
- 누락 미디어 0개
- 검은 프레임·정지 고착·무음 공백 없음
- 모든 세그먼트에 원본 출처 또는 생성 출처가 기록됨
- 1분 초과 시 외부 Content ID 위험 음원을 허용하지 않음
- CTA가 본편 시청을 유도하되 이야기의 결말을 가리지 않음

## 비범위

- 업로드 시간 자동 결정
- YouTube 계정에 Related Video를 자동 지정하는 기능
- 한 본편에서 여러 쇼츠를 일괄 생성하는 기능
- 조회수 예측 모델
- 완전 자동 얼굴 추적
- PySceneDetect, WhisperX 등 신규 대형 의존성 도입

## 성공 기준

- 에펠탑 작업 폴더에서 원본 수정 없이 쇼츠 MP4와 CapCut 초안이 생성된다.
- 동일한 인터페이스가 다른 완성 본편 fixture에서도 후보 분석과 매니페스트 생성을 수행한다.
- 사용자는 재생성이 필요한 장면만 확인하고 교체할 수 있다.
- 실패 시 어느 입력·구간·자산이 원인인지 구조화된 오류로 확인할 수 있다.
