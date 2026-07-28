# 가로형 사이다 병 워터마크 캡처 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가로로 누운 흑백 사이다 병 안에 `역사이다`를 넣은 워터마크를 만들고 완성 쇼츠 프레임 적용 캡처를 생성한다.

**Architecture:** Pillow의 고해상도 안티앨리어싱 캔버스에서 병 외곽선과 한글을 결정론적으로 그린 뒤 300×120px 투명 PNG로 축소한다. 워터마크 없는 110초 QA 프레임의 우측 하단에 합성해 개별 캡처를 만든다.

**Tech Stack:** Python, Pillow, Malgun Gothic Bold

## Global Constraints

- 병목은 왼쪽, 병 바닥은 오른쪽을 향한다.
- 병은 흰색 외곽선만 사용하고 내부는 투명하게 유지한다.
- 병 몸통 중앙에 굵은 흰색 `역사이다`를 한 줄로 배치한다.
- 검정과 흰색 이외의 색, 기포, 장식, 그림자, 질감을 사용하지 않는다.
- 출력 로고 크기는 300×120px이다.
- 이번 작업에서는 전체 영상을 재렌더링하지 않는다.

---

### Task 1: 가로형 병 로고와 적용 캡처 생성

**Files:**
- Create: `output/imagegen/yeoksaida-watermark/horizontal-bottle.png`
- Create: `output/imagegen/yeoksaida-watermark/horizontal-bottle-on-video.png`

**Interfaces:**
- Consumes: `qa-borderless/frame-110.png`
- Produces: 투명 로고 PNG와 1080×1920 적용 캡처

- [ ] **Step 1: 새 출력 파일이 아직 없는지 검사한다**

```powershell
@'
from pathlib import Path
p = Path("output/imagegen/yeoksaida-watermark/horizontal-bottle.png")
assert not p.exists(), "Use a versioned filename if the asset already exists"
print("PASS: horizontal bottle asset is new")
'@ | python -
```

- [ ] **Step 2: 4배 캔버스에서 병을 그린다**

1200×480 RGBA 캔버스에서 10px에 해당하는 흰 선으로 왼쪽 병뚜껑, 짧은 병목, 완만한 어깨, 긴 몸통, 둥근 오른쪽 바닥을 하나의 닫힌 외곽선으로 그린다. `C:\Windows\Fonts\malgunbd.ttf`와 유니코드 문자열 `\uc5ed\uc0ac\uc774\ub2e4`를 사용해 병 몸통 중앙에 글자를 놓고 300×120px로 축소한다.

- [ ] **Step 3: 완성 쇼츠 프레임에 합성한다**

300×120px 로고를 82% 불투명도로 만들고 `x = 1080 - 300 - 95`, `y = 1920 - 120 - 260`에 합성해 `horizontal-bottle-on-video.png`로 저장한다.

- [ ] **Step 4: 결과 파일을 검증한다**

```powershell
@'
from PIL import Image
from pathlib import Path
base = Path("output/imagegen/yeoksaida-watermark")
logo = Image.open(base / "horizontal-bottle.png")
capture = Image.open(base / "horizontal-bottle-on-video.png")
assert logo.mode == "RGBA"
assert logo.size == (300, 120)
assert logo.getchannel("A").getextrema() == (0, 255)
assert capture.size == (1080, 1920)
assert capture.getpixel((500, 700)) != (0, 0, 0)
print("PASS: horizontal bottle logo and capture validated")
'@ | python -
```

Expected: `PASS: horizontal bottle logo and capture validated`

- [ ] **Step 5: 시각 검사한다**

캡처에서 병 실루엣, 왼쪽 병목, `역사이다` 한글, 우측 하단 위치를 확인한다. 글자가 잘리거나 병 외곽선과 닿으면 글자 크기만 줄여 한 번 다시 생성한다.
