# 클래식 사이다 병 워터마크 V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부드러운 클래식 유리병 실루엣과 타원형 `역사이다` 라벨을 결합한 고품질 흑백 워터마크 캡처를 만든다.

**Architecture:** 4배 RGBA 캔버스에서 3차 베지어 곡선을 점으로 샘플링해 병 외곽을 그린다. 중앙에는 검은 타원형 라벨과 흰색 한글을 배치하고 320×130px로 축소한 뒤 완성 쇼츠 프레임에 합성한다.

**Tech Stack:** Python, Pillow, Malgun Gothic Bold

## Global Constraints

- 짧은 병목, 오목한 어깨, 완만하게 볼록한 몸통, 둥근 바닥을 사용한다.
- 병 외곽은 일정한 두께의 흰색 곡선이다.
- 병 중앙에는 검은 타원형 라벨과 굵은 흰색 `역사이다`만 배치한다.
- 기포, 주름, 반사광, 그림자, 색상 장식을 사용하지 않는다.
- 기존 `horizontal-bottle.png`는 덮어쓰지 않는다.
- 이번 단계에서는 영상을 재렌더링하지 않는다.

---

### Task 1: 클래식 병 V2 로고와 적용 캡처

**Files:**
- Create: `output/imagegen/yeoksaida-watermark/classic-bottle-v2.png`
- Create: `output/imagegen/yeoksaida-watermark/classic-bottle-v2-on-video.png`

**Interfaces:**
- Consumes: `qa-borderless/frame-110.png`
- Produces: 320×130 투명 로고와 1080×1920 적용 캡처

- [ ] **Step 1: 버전 파일 부재를 확인한다**

```powershell
@'
from pathlib import Path
p = Path("output/imagegen/yeoksaida-watermark/classic-bottle-v2.png")
assert not p.exists(), "Increment the version instead of overwriting"
print("PASS: V2 filename is available")
'@ | python -
```

- [ ] **Step 2: 병 외곽 곡선을 생성한다**

좌우 대칭이 아니라 가로로 누운 병의 상·하단 윤곽을 각각 3차 베지어 구간으로 만든다. 각 구간을 24점으로 샘플링하고 닫힌 외곽선에 7px 흰 선을 적용한다. 병목은 왼쪽, 둥근 바닥은 오른쪽에 둔다.

- [ ] **Step 3: 타원형 라벨과 한글을 추가한다**

병 몸통 중앙에 검은 타원형 라벨을 배치하고 3px 흰색 테두리를 적용한다. `C:\Windows\Fonts\malgunbd.ttf`와 `\uc5ed\uc0ac\uc774\ub2e4`를 사용해 흰색 글자를 중앙에 배치한다.

- [ ] **Step 4: 쇼츠 프레임에 합성한다**

로고를 82% 불투명도로 만들고 `x = 1080 - 320 - 95`, `y = 1920 - 130 - 260`에 배치해 새 캡처 파일로 저장한다.

- [ ] **Step 5: 결과를 검증한다**

```powershell
@'
from PIL import Image
from pathlib import Path
base = Path("output/imagegen/yeoksaida-watermark")
logo = Image.open(base / "classic-bottle-v2.png")
capture = Image.open(base / "classic-bottle-v2-on-video.png")
assert logo.mode == "RGBA"
assert logo.size == (320, 130)
assert logo.getchannel("A").getextrema() == (0, 255)
assert capture.size == (1080, 1920)
assert capture.getpixel((500, 700)) != (0, 0, 0)
print("PASS: classic bottle V2 validated")
'@ | python -
```

Expected: `PASS: classic bottle V2 validated`

- [ ] **Step 6: 시각 검사한다**

병의 어깨와 바닥이 꺾이지 않고 연속적인 곡선인지, 라벨이 병 외곽과 충분히 분리되는지, `역사이다`가 작은 화면에서 읽히는지 확인한다.
