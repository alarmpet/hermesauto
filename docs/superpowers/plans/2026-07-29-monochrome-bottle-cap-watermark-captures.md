# 흑백 병뚜껑 워터마크 캡처 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 완성 쇼츠 프레임에 흑백 병뚜껑 워터마크 A·B·C를 동일 조건으로 적용한 비교 캡처 3장을 만든다.

**Architecture:** Pillow로 225×225px 투명 로고를 결정론적으로 그려 한글 오타를 방지한다. 동일한 110초 QA 프레임에 같은 위치로 합성하고 개별 캡처와 3분할 비교본을 출력한다.

**Tech Stack:** Python, Pillow, Malgun Gothic Bold

## Global Constraints

- 로고 요소는 병뚜껑 실루엣과 정확한 한글 `역사이다`만 허용한다.
- 검정과 흰색 이외의 색은 사용하지 않는다.
- 기포, 월계수, 역사 아이콘, 그림자와 질감을 사용하지 않는다.
- 세 시안은 모두 225×225px이며 같은 우측·하단 기준점에 배치한다.
- 이번 작업에서는 영상을 재렌더링하지 않고 PNG 캡처만 생성한다.

---

### Task 1: 흑백 로고 3종과 적용 캡처 생성

**Files:**
- Create: `output/imagegen/yeoksaida-watermark/mono-a-black-cap.png`
- Create: `output/imagegen/yeoksaida-watermark/mono-b-white-cap.png`
- Create: `output/imagegen/yeoksaida-watermark/mono-c-outline-cap.png`
- Create: `output/imagegen/yeoksaida-watermark/mono-a-on-video.png`
- Create: `output/imagegen/yeoksaida-watermark/mono-b-on-video.png`
- Create: `output/imagegen/yeoksaida-watermark/mono-c-on-video.png`
- Create: `output/imagegen/yeoksaida-watermark/mono-comparison-on-video.png`

**Interfaces:**
- Consumes: `qa-watermarked-225/frame-110.png`의 워터마크 없는 원본에 해당하는 `qa-borderless/frame-110.png`
- Produces: 투명 로고 3개, 적용 캡처 3개, 3분할 비교본 1개

- [ ] **Step 1: 로고 생성 전 실패 검사를 실행한다**

```powershell
@'
from pathlib import Path
base = Path("output/imagegen/yeoksaida-watermark")
expected = ["mono-a-black-cap.png", "mono-b-white-cap.png", "mono-c-outline-cap.png"]
assert not all((base / name).exists() for name in expected), "Expected new assets to be absent before generation"
'@ | python -
```

Expected: PASS because at least one new asset is absent.

- [ ] **Step 2: Pillow로 세 로고를 그린다**

225×225 투명 RGBA 캔버스에 32개의 교대 반지름 점으로 병뚜껑 외곽을 만들고 `C:\Windows\Fonts\malgunbd.ttf`를 사용해 `역사이다`를 중앙 정렬한다.

- A: 검은 채움, 6px 흰 외곽선, 흰 글자
- B: 흰 채움, 검은 글자
- C: 투명 채움, 9px 흰 외곽선, 흰 글자

- [ ] **Step 3: 동일 프레임에 합성한다**

`qa-borderless/frame-110.png`에 각 로고를 225×225px로 합성한다. 좌표는 `x = 1080 - 225 - 95`, `y = 1920 - 225 - 260`으로 고정한다.

- [ ] **Step 4: 결과를 검증한다**

```powershell
@'
from PIL import Image
from pathlib import Path
base = Path("output/imagegen/yeoksaida-watermark")
logos = ["mono-a-black-cap.png", "mono-b-white-cap.png", "mono-c-outline-cap.png"]
captures = ["mono-a-on-video.png", "mono-b-on-video.png", "mono-c-on-video.png"]
for name in logos:
    im = Image.open(base / name)
    assert im.mode == "RGBA"
    assert im.size == (225, 225)
    assert im.getchannel("A").getextrema() == (0, 255)
for name in captures:
    im = Image.open(base / name)
    assert im.size == (1080, 1920)
print("PASS: 3 logos and 3 captures validated")
'@ | python -
```

Expected: `PASS: 3 logos and 3 captures validated`

- [ ] **Step 5: 3분할 비교본을 만든다**

세 캡처를 각각 360×640으로 축소해 가로로 연결한 1080×640 PNG를 만들고 좌상단에 A, B, C만 표시한다.
