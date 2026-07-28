# Eiffel Opening Video Replacement Design

## Goal

Replace the image-derived motion clips used by scenes 1, 2, and 3 of
`youtube-capcut-eiffel-15m-production-run` with three user-generated Google
Flow Omni videos. Each replacement video is approximately 10 seconds, so the
opening 30 seconds use native generated motion while the existing narration,
captions, and following scenes remain unchanged.

## Source Job

- Job directory:
  `C:\Users\amd\AppData\Roaming\hermes\outputs\desktop\youtube-capcut-eiffel-15m-production-run`
- Format: 16:9 horizontal longform
- Period and location: Paris, France, 1889, Belle Époque
- Replacement scope: scenes 1–3 only
- User supplies the three generated video paths after generation.

## Generation Rules

- Generate one approximately 10-second video per scene.
- Use 16:9 horizontal framing.
- Generate visuals only; generated speech, music, captions, and sound effects
  are not used.
- Keep all people and architecture Western European/French and appropriate to
  the late 1880s.
- Do not render readable text, signs, subtitles, logos, or watermarks.
- Do not include Korean, Asian, modern, fantasy, or anachronistic elements.
- Maintain warm sepia, aged ivory, cobblestone grey, and wrought-iron black
  across all three clips for continuity.

## Google Flow Omni Prompts

### Scene 1 — Paris Establishing Shot, 0–10 Seconds

```text
Create a 10-second, 16:9 horizontal photorealistic cinematic establishing shot of Paris, France in 1889 during the Belle Époque. Begin high above the Seine at warm golden hour, then make one slow, smooth forward aerial glide toward central Paris. Reveal Haussmann stone apartment buildings, wrought-iron balconies, gas street lamps, cobblestone boulevards, horse-drawn carriages, and small groups of French artists and writers in authentic late-1880s frock coats, top hats, bustle dresses, and period clothing. The city should feel elegant, artistic, prosperous, and alive, with subtle carriage movement, pedestrians walking, chimney smoke drifting, tree leaves moving gently, and sunlight reflecting on the river. Keep the camera motion continuous and stable, with realistic depth and cinematic grain. Historically accurate Western European French setting only. No modern buildings, no cars, no electric signs, no Asian people, no Korean clothing, no fantasy elements, no readable text, no captions, no logos, no watermarks.
```

### Scene 2 — Parisian Pride in the City, 10–20 Seconds

```text
Create a 10-second, 16:9 horizontal photorealistic cinematic street-level tracking shot in Paris, France in 1889. The camera moves slowly and smoothly along an elegant Haussmann boulevard, passing finely carved pale stone façades, wrought-iron balconies, mansard roofs, warm café terraces, gas lamps, manicured roadside trees, and clean cobblestones. Authentic French citizens in late-1880s clothing stroll with visible pride and quietly admire their beautiful city; a well-dressed couple pauses to look up at the ornate architecture while a horse-drawn carriage crosses naturally in the middle distance. Use one continuous camera move with layered foreground and background motion, warm sepia and aged-ivory colors, soft golden light, and restrained cinematic grain. Historically accurate Belle Époque Paris only. No Eiffel Tower in this shot, no modern objects, no automobiles, no Asian or Korean elements, no tiled East Asian roofs, no readable shop signs, no subtitles, no logos, no watermarks.
```

### Scene 3 — The Seine Reveals Maupassant, 20–30 Seconds

```text
Create a 10-second, 16:9 horizontal photorealistic cinematic shot in Paris, France in 1889 that introduces the Seine and French writer Guy de Maupassant. Begin with a calm tracking shot beside the Seine: sunlight glimmers on the moving water, leafy trees sway gently, a small period riverboat passes, and Belle Époque Paris buildings line the far bank. Continue the same smooth camera movement toward a riverside café terrace, ending on a medium three-quarter view of Guy de Maupassant, a distinguished Western European French man in his late thirties with short dark hair, a dark moustache and neatly trimmed beard, wearing an authentic dark Victorian frock coat. He sits alone at a café table and writes thoughtfully with a fountain pen on paper, then briefly raises his eyes toward the Paris skyline. Natural human movement, stable facial identity, subtle breeze, warm golden-hour light, sepia-ivory palette, realistic cinematic grain. Historically accurate 1889 France only. No speaking to camera, no exaggerated gestures, no modern objects, no Asian or Korean elements, no readable writing, no subtitles, no logos, no watermarks.
```

## Replacement Workflow

1. The user generates the three clips in Google Flow Omni and provides their
   exact filesystem paths in scene order.
2. Validate that each file is readable video, close to 10 seconds, 16:9, and
   contains no unwanted generated audio that would interfere with the edit.
3. Back up the existing scene 1–3 media and the current editable CapCut draft.
4. Replace only the first 30 seconds of visual media, preserving narration,
   captions, timing after 30 seconds, transitions, and all later scenes.
5. Rebuild the editable CapCut draft and verify media links, total duration,
   first-30-second coverage, audio synchronization, and scene 4 continuity.

## Acceptance Criteria

- The first 30 seconds contain the three supplied videos in scene order.
- Each supplied clip occupies approximately 10 seconds without looping.
- Existing narration and captions remain synchronized.
- Scene 4 and every later scene retain their original timing and media.
- The original draft and scene 1–3 media remain recoverable from backup.
- The rebuilt CapCut draft opens without missing-media warnings.
