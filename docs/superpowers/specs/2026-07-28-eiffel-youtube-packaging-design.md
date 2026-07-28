# Eiffel YouTube Packaging Design

## Goal

Create two visually distinct 16:9 YouTube thumbnails and a Korean metadata
package for the longform video about Guy de Maupassant's opposition to the
Eiffel Tower and the ironic story that he later ate inside it.

## Audience and Positioning

- Primary audience: Korean viewers interested in world history, historical
  anecdotes, famous people, Paris, and surprising reversals.
- Core search terms: 에펠탑, 모파상, 에펠탑 역사, 파리 역사.
- Core curiosity gap: the man who hated the Eiffel Tower most kept eating
  inside it because it was the one place where he could not see the tower.
- Tone: cinematic historical storytelling with wit, not sensationalized or
  misleading clickbait.

## Thumbnail A — Curiosity and Irony

- Exact text: `에펠탑이 꼴 보기 싫어서`
- Composition: angry Maupassant on the left, the towering Eiffel Tower on the
  right, and a visual path toward a restaurant table.
- Mood and color: dramatic red-orange sunset against black iron.
- CTR purpose: withhold the punchline and create an open question.

## Thumbnail B — Character Conflict

- Exact text: `에펠탑을 가장 싫어한 남자`
- Composition: Maupassant calmly dining inside the Eiffel Tower restaurant,
  with iron structure and Paris visible beyond him.
- Mood and color: warm golden restaurant interior contrasted with cool steel.
- CTR purpose: communicate the character and central conflict immediately.

## Shared Thumbnail Requirements

- 16:9 landscape, optimized for YouTube.
- Large, high-contrast Korean text in no more than two lines.
- Text remains readable at mobile thumbnail size.
- One primary face, one dominant landmark, and no clutter.
- Historically credible late-1880s French clothing and Paris setting.
- No modern objects, Asian clothing, extra captions, logos, or watermarks.
- The two thumbnails must differ in composition, palette, and emotional beat
  enough to support a meaningful YouTube A/B test.

## Metadata Package

### Titles

Provide three titles:

1. Search-led title beginning with `에펠탑`.
2. Curiosity-led title centered on the ironic meal inside the tower.
3. Hybrid title containing both `에펠탑` and `모파상`.

Each title must accurately describe the video, place important words early,
remain concise enough for mobile display, and avoid excessive capitals,
symbols, and misleading claims.

### Descriptions

Provide two unique descriptions:

1. Search-led description: state `에펠탑`, `모파상`, and `파리 역사` naturally
   in the opening lines.
2. Story-led description: open with the paradox and preserve the final answer
   long enough to encourage viewing.

Both descriptions include:

- A concise content summary.
- A viewer question encouraging comments.
- A natural subscription CTA.
- Three focused hashtags at the end.
- No unverifiable superlatives or keyword stuffing.

### Tags

Provide exactly ten focused Korean tags covering the topic, person, location,
history intent, and storytelling genre. Avoid loosely related high-volume tags.

## Quality and Testing

- Generate the two thumbnails as separate image-generation calls with separate
  prompts.
- Visually inspect text spelling, face count, Eiffel Tower recognizability,
  period accuracy, mobile readability, and lack of prohibited elements.
- Save both final image files alongside the Eiffel job assets.
- Recommend running YouTube Studio's title/thumbnail A/B testing with the two
  variants and evaluating Home/Suggested CTR after sufficient impressions.
