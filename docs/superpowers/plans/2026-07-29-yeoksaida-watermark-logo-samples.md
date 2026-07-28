# ‘역사이다’ 워터마크 로고 샘플 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 검정 몰입형 쇼츠 우측 하단에 사용할 ‘역사이다’ 워터마크 로고 시안 3개를 생성하고 비교 가능한 투명 PNG로 정리한다.

**Architecture:** 각 시안은 독립된 이미지 생성 프롬프트로 만들고, 균일한 크로마키 배경을 로컬 후처리로 제거한다. 원본·투명본·축소 미리보기를 분리 저장하고 실제 검정 쇼츠 프레임 위 합성본으로 가독성을 검증한다.

**Tech Stack:** OpenAI built-in ImageGen, Python/Pillow, `remove_chroma_key.py`, FFmpeg

## Global Constraints

- 정확한 한글 표기는 `역사이다`로 고정한다.
- 정사각형 로고와 충분한 내부 여백을 사용한다.
- 굵고 단순한 글자 형태와 제한된 색상을 사용한다.
- 다른 워터마크, 영문 문구, 가는 글씨, 복잡한 배경은 금지한다.
- 최초 생성 배경은 완전히 균일한 `#00FF00` 크로마키로 한다.
- 선정 전 시안 모두 원본과 투명 PNG를 보존한다.

---

### Task 1: 도장형 로고 시안 생성

**Files:**
- Create: `output/imagegen/yeoksaida-watermark/seal-source.png`

**Interfaces:**
- Consumes: 승인된 디자인 명세의 시안 A
- Produces: `#00FF00` 배경의 정사각 도장형 원본 PNG

- [ ] **Step 1: 이미지 생성 프롬프트를 실행한다**

```text
Use case: logo-brand
Asset type: Korean YouTube Shorts watermark logo
Primary request: Create a compact modern Korean seal logo for a history storytelling channel.
Subject: A simple red traditional stamp shape with the exact Korean text “역사이다” as the dominant element.
Style/medium: flat vector-friendly logo, bold geometric Korean lettering, crisp edges.
Composition/framing: centered square emblem, generous padding, readable at 100 pixels.
Color palette: vermilion red, warm ivory, small black accent.
Text (verbatim): "역사이다"
Constraints: perfectly flat solid #00FF00 chroma-key background; one uniform color; no shadow, gradient, texture, reflection, or floor; no #00FF00 in the logo.
Avoid: English, extra Korean text, thin strokes, detailed scenery, mockup presentation, watermark.
```

- [ ] **Step 2: 생성 결과를 시각 검사한다**

한글이 정확히 `역사이다`인지, 글자가 잘리지 않았는지, 작은 크기에서 도장 외곽과 글자를 구별할 수 있는지 확인한다. 실패하면 오류 하나만 지정해 한 번 재생성한다.

- [ ] **Step 3: 원본을 지정 경로에 저장한다**

ImageGen 결과를 `output/imagegen/yeoksaida-watermark/seal-source.png`로 복사하고 기존 파일이 있으면 `seal-source-v2.png`처럼 버전명으로 보존한다.

### Task 2: 역사 아이콘형 로고 시안 생성

**Files:**
- Create: `output/imagegen/yeoksaida-watermark/history-icon-source.png`

**Interfaces:**
- Consumes: 승인된 디자인 명세의 시안 B
- Produces: `#00FF00` 배경의 정사각 역사 아이콘형 원본 PNG

- [ ] **Step 1: 이미지 생성 프롬프트를 실행한다**

```text
Use case: logo-brand
Asset type: Korean YouTube Shorts watermark logo
Primary request: Create a refined broadcast-style history channel logo.
Subject: One simple gold ancient scroll icon combined with the exact Korean text “역사이다”.
Style/medium: flat vector-friendly emblem, bold Korean sans-serif lettering, crisp silhouette.
Composition/framing: centered compact square lockup, icon above or beside the text, generous padding, readable at 100 pixels.
Color palette: antique gold, white, small charcoal accent.
Text (verbatim): "역사이다"
Constraints: perfectly flat solid #00FF00 chroma-key background; one uniform color; no shadow, gradient, texture, reflection, or floor; no #00FF00 in the logo.
Avoid: multiple historical objects, English, extra Korean text, thin ornamental lines, scenery, mockup presentation, watermark.
```

- [ ] **Step 2: 생성 결과를 시각 검사한다**

아이콘이 하나의 역사 상징으로 읽히는지, `역사이다`가 정확한지, 금색과 흰색 윤곽이 검정 배경에서도 분리될지 확인한다.

- [ ] **Step 3: 원본을 지정 경로에 저장한다**

ImageGen 결과를 `output/imagegen/yeoksaida-watermark/history-icon-source.png`로 복사하고 기존 파일은 덮어쓰지 않는다.

### Task 3: 사이다 브랜드형 로고 시안 생성

**Files:**
- Create: `output/imagegen/yeoksaida-watermark/cider-badge-source.png`

**Interfaces:**
- Consumes: 승인된 디자인 명세의 시안 C
- Produces: `#00FF00` 배경의 정사각 사이다 브랜드형 원본 PNG

- [ ] **Step 1: 이미지 생성 프롬프트를 실행한다**

```text
Use case: logo-brand
Asset type: Korean YouTube Shorts watermark logo
Primary request: Create a memorable Korean history channel badge that subtly combines history and sparkling soda.
Subject: A circular bottle-cap badge with three simple bubbles and one restrained historical laurel motif, containing the exact Korean text “역사이다”.
Style/medium: premium flat vector-friendly brand mark, bold Korean lettering, crisp high-contrast edges, mature rather than childish.
Composition/framing: centered square badge, generous padding, readable at 100 pixels.
Color palette: deep teal, white, antique gold.
Text (verbatim): "역사이다"
Constraints: perfectly flat solid #00FF00 chroma-key background; one uniform color; no shadow, gradient, texture, reflection, or floor; no #00FF00 in the logo.
Avoid: mascot face, beverage photography, English, extra Korean text, thin lines, scenery, mockup presentation, watermark.
```

- [ ] **Step 2: 생성 결과를 시각 검사한다**

병뚜껑·기포·역사 문양이 복잡하게 겹치지 않는지, 성인 역사 채널의 절제된 인상을 유지하는지, 한글 표기가 정확한지 확인한다.

- [ ] **Step 3: 원본을 지정 경로에 저장한다**

ImageGen 결과를 `output/imagegen/yeoksaida-watermark/cider-badge-source.png`로 복사하고 기존 파일은 덮어쓰지 않는다.

### Task 4: 투명 PNG 후처리 및 검증

**Files:**
- Create: `output/imagegen/yeoksaida-watermark/seal.png`
- Create: `output/imagegen/yeoksaida-watermark/history-icon.png`
- Create: `output/imagegen/yeoksaida-watermark/cider-badge.png`

**Interfaces:**
- Consumes: Task 1~3의 `*-source.png`
- Produces: 알파 채널이 있는 투명 PNG 3개

- [ ] **Step 1: 크로마키 배경을 제거한다**

```powershell
$helper = 'C:\Users\amd\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py'
python $helper --input output/imagegen/yeoksaida-watermark/seal-source.png --out output/imagegen/yeoksaida-watermark/seal.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
python $helper --input output/imagegen/yeoksaida-watermark/history-icon-source.png --out output/imagegen/yeoksaida-watermark/history-icon.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
python $helper --input output/imagegen/yeoksaida-watermark/cider-badge-source.png --out output/imagegen/yeoksaida-watermark/cider-badge.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

- [ ] **Step 2: 알파 채널과 투명 모서리를 검증한다**

```powershell
@'
from PIL import Image
from pathlib import Path
for p in Path("output/imagegen/yeoksaida-watermark").glob("*.png"):
    if p.name.endswith("-source.png"):
        continue
    im = Image.open(p).convert("RGBA")
    assert im.getchannel("A").getextrema()[0] == 0, f"{p}: no transparent pixels"
    assert all(im.getpixel(xy)[3] == 0 for xy in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)])
    print(p, im.size, im.getchannel("A").getextrema())
'@ | python -
```

Expected: 세 파일 모두 최소 알파값 `0`, 네 모서리 알파값 `0`.

### Task 5: 실제 영상 프레임 비교본 생성

**Files:**
- Create: `output/imagegen/yeoksaida-watermark/comparison-on-video.png`

**Interfaces:**
- Consumes: 투명 PNG 3개와 검정 몰입형 쇼츠 QA 프레임
- Produces: 동일한 크기로 우측 하단에 배치한 3분할 비교 이미지

- [ ] **Step 1: 3분할 합성본을 만든다**

Pillow로 동일한 영상 프레임을 세 칸에 복제하고 각 로고를 폭 120px로 축소해 프레임 우측 90px, 하단 310px 안전영역에 배치한다. 각 칸 상단에는 `A 도장형`, `B 역사 아이콘형`, `C 사이다 브랜드형` 라벨을 추가한다.

- [ ] **Step 2: 최종 시각 검사를 수행한다**

세 로고가 모두 100~120px 크기에서 읽히는지, 자막과 겹치지 않는지, 투명 가장자리에 녹색 번짐이 없는지 확인한다. 실패한 시안만 한 번 수정한다.

- [ ] **Step 3: 결과물을 보고한다**

원본 3개, 투명 PNG 3개, 실제 프레임 비교본의 절대 경로를 제공하고 사용한 최종 프롬프트를 함께 기록한다.
