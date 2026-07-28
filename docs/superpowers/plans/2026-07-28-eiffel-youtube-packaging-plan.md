# Eiffel YouTube Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce two distinct landscape YouTube thumbnails and a complete Korean title, description, and tag package for the Eiffel Tower and Maupassant longform video.

**Architecture:** Generate each thumbnail independently with a prompt tailored to a different CTR hypothesis, inspect the bitmap output, and persist approved files under the Eiffel job directory. Build the metadata from the approved content angle and official YouTube guidance, then save one reusable UTF-8 Markdown handoff.

**Tech Stack:** OpenAI built-in image generation, local image inspection, Markdown, official YouTube creator guidance.

## Global Constraints

- Job directory: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run`
- Asset directory: `youtube-packaging`
- Thumbnail format: 16:9 landscape PNG.
- Thumbnail A exact text: `에펠탑이 꼴 보기 싫어서`
- Thumbnail B exact text: `에펠탑을 가장 싫어한 남자`
- Deliver exactly three titles, two descriptions, and ten tags.
- Metadata must accurately represent the video's Eiffel Tower and Guy de Maupassant story.

---

### Task 1: Generate and Validate Thumbnail A

**Files:**
- Create: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run\youtube-packaging\thumbnail-a-curiosity.png`

**Interfaces:**
- Consumes: Thumbnail A requirements from the approved design.
- Produces: One landscape curiosity-led thumbnail.

- [ ] Generate a cinematic late-1880s Paris composition with angry Maupassant, the Eiffel Tower, and exact Korean text.
- [ ] Inspect subject hierarchy, text spelling, mobile readability, landmark recognizability, and prohibited elements.
- [ ] Save the accepted output to the exact asset path without overwriting unrelated files.

### Task 2: Generate and Validate Thumbnail B

**Files:**
- Create: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run\youtube-packaging\thumbnail-b-character.png`

**Interfaces:**
- Consumes: Thumbnail B requirements from the approved design.
- Produces: One visually distinct character-led thumbnail.

- [ ] Generate Maupassant dining inside the Eiffel Tower restaurant with exact Korean text and a palette distinct from Thumbnail A.
- [ ] Inspect subject hierarchy, text spelling, mobile readability, period accuracy, and visual distinction from Thumbnail A.
- [ ] Save the accepted output to the exact asset path.

### Task 3: Write and Verify Metadata

**Files:**
- Create: `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run\youtube-packaging\youtube-metadata.md`

**Interfaces:**
- Consumes: Approved content angle and official YouTube title, thumbnail, and description guidance.
- Produces: Three titles, two descriptions, ten tags, and an A/B testing recommendation.

- [ ] Write one search-led, one curiosity-led, and one hybrid title with important terms near the beginning.
- [ ] Write search-led and story-led descriptions with opening keywords, comment CTA, subscription CTA, and three relevant hashtags.
- [ ] Write exactly ten focused tags without keyword stuffing.
- [ ] Verify counts, keyword presence, unique descriptions, CTA presence, and consistency with the video.

### Task 4: Final Package Verification

**Files:**
- Verify: both PNG files and `youtube-metadata.md`.

**Interfaces:**
- Consumes: All generated deliverables.
- Produces: A shareable packaging folder ready for YouTube Studio.

- [ ] Confirm both images exist, decode successfully, and have landscape dimensions.
- [ ] Confirm the metadata file is UTF-8 and contains all requested deliverables.
- [ ] Report exact paths, recommended title/thumbnail pairing, and official source-backed A/B testing guidance.
