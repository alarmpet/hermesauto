# Easy Sunbi Generic Narrative Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `genreMode: "yadam"` a reusable Easy Sunbi narrative mode whose Korean storytelling voice is independent from each story's period, place, people, and visual style.

**Architecture:** Introduce three explicit contracts: narrative mode rules, normalized historical context, and visual style. The Yadam draft builder consumes narrative rules and emits structured historical context; the longform planner composes that context with the caller-selected style without injecting Paris, France, Maupassant, Joseon, or Korean clothing on its own.

**Tech Stack:** Node.js 24 ESM, JavaScript `.mjs`, `node:assert/strict` contract tests, existing Hermes YouTube workflow and Google Flow prompt pipeline.

## Global Constraints

- Preserve the existing `ship-sunbi-yadam` ID for saved-job and UI compatibility.
- Keep `historical-paris-yadam` as an explicitly selected Paris-only visual preset.
- Do not rewrite direct-input scripts.
- Do not infer a specific country, ethnicity, real person, wardrobe, or architecture when historical context is unknown.
- Explicit user historical context takes precedence over researched or draft-emitted context.
- Explicit/custom visual style takes precedence over any genre default.
- No external LLM or browser call is allowed in deterministic contract tests.
- Do not modify raw source files under `AI-Sessions/raw/`.
- Never persist secrets, tokens, OAuth secrets, or API keys.
- Preserve unrelated changes in the already-dirty worktree.

## File Structure

### New files

- `electron/services/narrative-modes.mjs`: Returns deterministic narrative-writing rules for `documentary` and `yadam`.
- `electron/services/historical-context.mjs`: Normalizes, merges, validates, and renders structured historical context for prompts.
- `scripts/check-narrative-modes.mjs`: Verifies Easy Sunbi rules are generic and contain the required four-beat structure.
- `scripts/check-historical-context-contract.mjs`: Verifies normalization, precedence, unknown behavior, and conflict warnings.
- `scripts/check-easy-sunbi-generic-mode.mjs`: Cross-topic integration regression for Rome, Joseon, Paris, and unknown settings.

### Modified files

- `scripts/youtube-draft-duration.mjs`: Restore the missing `isLongform` local used by duration bounds.
- `scripts/check-draft-duration-contract.mjs`: Add longform/non-longform coverage for the restored duration branch.
- `youtube-job-schema.mjs`: Normalize `options.historicalContext`.
- `electron/services/youtube-job-service.mjs`: Carry desktop `historicalContext` into normalized job options.
- `electron/services/longform-research-brief.mjs`: Preserve normalized `historicalContext` in `research_brief.json`.
- `youtube-workflow-stages.mjs`: Carry researched historical context into the draft job.
- `youtube-workflow.mjs`: Resolve one effective historical context and pass it to longform and direct-script scene planning.
- `automation/yadam-workflow-builder.mjs`: Replace Korea-specific prompt rules with Easy Sunbi narrative rules and require structured `historical_context` output.
- `electron/services/style-presets.mjs`: Make `ship-sunbi-yadam` geographically neutral and add an exact lookup API.
- `electron/services/longform-planner.mjs`: Remove automatic Paris mapping and compose normalized historical context into every scene prompt.
- `electron/services/script-planner.mjs`: Apply the same historical-context composer to non-longform/direct-script scene prompts.
- `scripts/check-yadam-workflow.mjs`: Replace the Korean-name-bank assertions with generic narrative and prompt-contract assertions.
- `scripts/check-longform-production-contract.mjs`: Assert context preservation and non-contamination in persisted longform media plans.
- `package.json`: Add focused checks to the aggregate `check` command.
- `README.md`: Document the distinction between narrative mode, historical context, and visual style.
- `timeline.md`: Record implementation and verification results.

---

### Task 1: Restore the Existing Duration Contract Baseline

**Files:**
- Modify: `scripts/youtube-draft-duration.mjs:70-100`
- Modify: `scripts/check-draft-duration-contract.mjs`

**Interfaces:**
- Consumes: `job.options.videoFormat`
- Produces: local `isLongform: boolean` used by `validateDraftDurationContract()`

- [ ] **Step 1: Add a failing longform duration regression**

Add this case to `scripts/check-draft-duration-contract.mjs`:

```js
const longformDurationResult = validateDraftDurationContract({
  job: {
    sourceType: "keyword",
    options: {
      videoFormat: "longform",
      scriptLengthMode: "custom",
      customDurationSeconds: 600,
      speechSpeed: 1,
      genreMode: "documentary",
    },
  },
  draft: {
    script: "역사적 사건의 배경과 결과를 설명하는 문장입니다. ".repeat(900),
  },
  stage: "unit-longform-duration",
});
assert.equal(typeof longformDurationResult.ok, "boolean");
assert.equal(longformDurationResult.targetSeconds, 600);
```

- [ ] **Step 2: Run the focused test and verify the baseline failure**

Run:

```powershell
node scripts/check-draft-duration-contract.mjs
```

Expected: FAIL with `ReferenceError: isLongform is not defined`.

- [ ] **Step 3: Define the missing local**

In `validateDraftDurationContract()` immediately after `isScriptAutoDuration`, add:

```js
const isLongform = String(job?.options?.videoFormat || "") === "longform";
```

Do not change the existing Yadam and provider-soft tolerance percentages in this task.

- [ ] **Step 4: Run duration and longform baseline checks**

Run:

```powershell
node scripts/check-draft-duration-contract.mjs
node scripts/check-longform-production-contract.mjs
```

Expected: both commands exit `0`; no `ReferenceError` remains.

- [ ] **Step 5: Commit the isolated baseline repair**

```powershell
git add -- scripts/youtube-draft-duration.mjs scripts/check-draft-duration-contract.mjs
git commit -m "fix: restore longform draft duration contract"
```

---

### Task 2: Add the Generic Narrative Mode Contract

**Files:**
- Create: `electron/services/narrative-modes.mjs`
- Create: `scripts/check-narrative-modes.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `getNarrativeMode(id?: string): NarrativeMode`
- Produces: `buildNarrativeModePrompt(id?: string): string`
- `NarrativeMode` shape:

```js
{
  id: "documentary" | "yadam",
  label: string,
  beats: Array<{ id: "hook" | "context" | "climax" | "outro", instruction: string }>,
  voiceRules: string[],
  factualRules: string[],
}
```

- [ ] **Step 1: Write the failing narrative-mode test**

Create `scripts/check-narrative-modes.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildNarrativeModePrompt,
  getNarrativeMode,
} from "../electron/services/narrative-modes.mjs";

const yadam = getNarrativeMode("yadam");
assert.equal(yadam.id, "yadam");
assert.deepEqual(yadam.beats.map((beat) => beat.id), ["hook", "context", "climax", "outro"]);

const prompt = buildNarrativeModePrompt("yadam");
assert.match(prompt, /Easy Sunbi|쉽선비/);
assert.match(prompt, /Hook[\s\S]*Context[\s\S]*Climax[\s\S]*Outro/i);
assert.match(prompt, /fact[\s\S]*(interpretation|inference)|사실[\s\S]*(해석|추론)/i);
assert.match(prompt, /analogy|비유/i);
assert.doesNotMatch(prompt, /Paris|France|Maupassant|한복|조선|traditional Korean clothing/i);

assert.equal(getNarrativeMode("missing-mode").id, "documentary");
console.log(JSON.stringify({ ok: true, checked: "narrative-modes" }));
```

- [ ] **Step 2: Run the new test and verify the missing-module failure**

Run:

```powershell
node scripts/check-narrative-modes.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the narrative registry**

Create `electron/services/narrative-modes.mjs` with immutable mode definitions:

```js
const MODES = Object.freeze({
  documentary: Object.freeze({
    id: "documentary",
    label: "Documentary",
    beats: [],
    voiceRules: [
      "Use clear Korean documentary narration.",
    ],
    factualRules: [
      "Separate verified facts from interpretation or inference.",
      "Do not invent dialogue, motives, dates, or quantities.",
    ],
  }),
  yadam: Object.freeze({
    id: "yadam",
    label: "쉽선비 역사 야담",
    beats: [
      { id: "hook", instruction: "Hook: open with one concrete question, contradiction, or surprising verified fact." },
      { id: "context", instruction: "Context: explain the necessary period, place, people, and stakes in plain language." },
      { id: "climax", instruction: "Climax: show the strongest collision of cause, choice, and consequence." },
      { id: "outro", instruction: "Outro: resolve the event, distinguish fact from interpretation, and close without a forced moral." },
    ],
    voiceRules: [
      "Use warm, conversational Korean suitable for an Easy Sunbi neighborhood storyteller.",
      "Explain an unfamiliar institution, unit, or custom with one short modern analogy when useful.",
      "Do not repeat a fixed greeting, exclamation, or catchphrase in every paragraph.",
      "Keep humor humane; do not trivialize victims or documented harm.",
    ],
    factualRules: [
      "Separate verified facts from interpretation or inference.",
      "Do not invent dialogue, motives, dates, quantities, or historical certainty.",
      "Narrative mode must not decide country, ethnicity, wardrobe, architecture, or a real person's appearance.",
    ],
  }),
});

export function getNarrativeMode(id = "documentary") {
  return MODES[String(id || "").toLowerCase()] || MODES.documentary;
}

export function buildNarrativeModePrompt(id = "documentary") {
  const mode = getNarrativeMode(id);
  return [
    `Narrative mode: ${mode.label} (${mode.id}).`,
    ...mode.beats.map((beat) => beat.instruction),
    ...mode.voiceRules,
    ...mode.factualRules,
  ].join("\n");
}
```

- [ ] **Step 4: Register and run the focused check**

Add `"node scripts/check-narrative-modes.mjs"` to the aggregate `check` chain in `package.json`, adjacent to the current Yadam workflow check.

Run:

```powershell
node scripts/check-narrative-modes.mjs
```

Expected: PASS with `{"ok":true,"checked":"narrative-modes"}`.

- [ ] **Step 5: Commit the narrative contract**

```powershell
git add -- electron/services/narrative-modes.mjs scripts/check-narrative-modes.mjs package.json
git commit -m "feat: add generic easy sunbi narrative mode"
```

---

### Task 3: Add a Structured Historical Context Contract

**Files:**
- Create: `electron/services/historical-context.mjs`
- Create: `scripts/check-historical-context-contract.mjs`
- Modify: `youtube-job-schema.mjs`
- Modify: `electron/services/youtube-job-service.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `normalizeHistoricalContext(value?: object): HistoricalContext`
- Produces: `mergeHistoricalContexts(...values: object[]): HistoricalContext`
- Produces: `buildHistoricalContextPrompt(value?: object): string`
- Produces: `findHistoricalContextConflicts({ historicalContext, stylePreset }): string[]`
- `HistoricalContext` shape matches the approved design: `period`, `startYear`, `endYear`, `region`, `country`, `city`, `people`, `wardrobe`, `architecture`, `materialCulture`, `exclusions`, `confidence`, `sources`.

- [ ] **Step 1: Write the failing context contract**

Create `scripts/check-historical-context-contract.mjs` with these exact cases:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildHistoricalContextPrompt,
  findHistoricalContextConflicts,
  mergeHistoricalContexts,
  normalizeHistoricalContext,
} from "../electron/services/historical-context.mjs";
import { normalizeYouTubeJobRequest } from "../youtube-job-schema.mjs";

const unknown = normalizeHistoricalContext();
assert.equal(unknown.confidence, "unknown");
assert.equal(buildHistoricalContextPrompt(unknown), "");

const researched = normalizeHistoricalContext({
  period: "Roman Empire",
  country: "Roman Empire",
  city: "Rome",
  wardrobe: ["first-century Roman tunics and togas"],
  confidence: "researched",
  sources: ["research_brief.json"],
});
assert.match(buildHistoricalContextPrompt(researched), /Roman Empire/);
assert.match(buildHistoricalContextPrompt(researched), /Rome/);
assert.doesNotMatch(buildHistoricalContextPrompt(researched), /Paris|France|Maupassant/i);

const merged = mergeHistoricalContexts(
  { city: "Paris", confidence: "researched" },
  { city: "Rome", country: "Roman Empire", confidence: "explicit" },
);
assert.equal(merged.city, "Rome");
assert.equal(merged.country, "Roman Empire");
assert.equal(merged.confidence, "explicit");

const normalizedJob = normalizeYouTubeJobRequest({
  sourceType: "keyword",
  sourceValue: "고대 로마의 화재",
  options: {
    genreMode: "yadam",
    historicalContext: researched,
  },
});
assert.equal(normalizedJob.options.historicalContext.city, "Rome");

const conflicts = findHistoricalContextConflicts({
  historicalContext: researched,
  stylePreset: { id: "historical-paris-yadam", worldContinuity: "Paris 1889 France" },
});
assert.ok(conflicts.length > 0);
console.log(JSON.stringify({ ok: true, checked: "historical-context-contract" }));
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```powershell
node scripts/check-historical-context-contract.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement deterministic normalization and precedence**

Implement `electron/services/historical-context.mjs` with these rules:

- Convert scalar fields to trimmed strings.
- Convert `startYear` and `endYear` to finite integers or `null`.
- Normalize `people` to `{ name, role, appearance }` objects and drop empty entries.
- Normalize list fields with trimmed, unique strings.
- Accept only `explicit`, `researched`, or `unknown`; otherwise use `unknown`.
- In `mergeHistoricalContexts()`, sort inputs by confidence rank `unknown < researched < explicit`, then overlay non-empty scalar values and union arrays.
- `buildHistoricalContextPrompt()` returns `""` for `unknown` contexts without meaningful fields.
- When meaningful fields exist, emit only supplied values plus `Historical accuracy: do not add an unsupported country, ethnicity, real person, wardrobe, or architecture.`
- `findHistoricalContextConflicts()` returns diagnostic strings; it does not silently mutate either input.

- [ ] **Step 4: Wire context into job normalization**

In `youtube-job-schema.mjs`:

```js
import { normalizeHistoricalContext } from "./electron/services/historical-context.mjs";
```

Add `historicalContext: normalizeHistoricalContext()` to `DEFAULT_YOUTUBE_JOB_OPTIONS`, then normalize:

```js
options.historicalContext = normalizeHistoricalContext(options.historicalContext);
```

In `electron/services/youtube-job-service.mjs`, add:

```js
historicalContext: input.historicalContext || {},
```

beside `genreMode`.

- [ ] **Step 5: Register and run focused schema checks**

Add the new check to `package.json`, then run:

```powershell
node scripts/check-historical-context-contract.mjs
node scripts/check-youtube-job-schema.mjs
```

Expected: both commands exit `0`.

- [ ] **Step 6: Commit the context contract**

```powershell
git add -- electron/services/historical-context.mjs scripts/check-historical-context-contract.mjs youtube-job-schema.mjs electron/services/youtube-job-service.mjs package.json
git commit -m "feat: add structured historical context"
```

---

### Task 4: Make Style Lookup Explicit and Easy Sunbi Visuals Generic

**Files:**
- Modify: `electron/services/style-presets.mjs`
- Modify: `scripts/check-easy-sunbi-generic-mode.mjs`

**Interfaces:**
- Produces: `findStylePreset(id, options?): StylePreset | null`
- Preserves: `getStylePreset(id, options?): StylePreset`, including legacy fallback behavior

- [ ] **Step 1: Start the cross-topic test with style assertions**

Create `scripts/check-easy-sunbi-generic-mode.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { findStylePreset, getStylePreset } from "../electron/services/style-presets.mjs";

const generic = findStylePreset("ship-sunbi-yadam");
assert.equal(generic?.id, "ship-sunbi-yadam");
assert.doesNotMatch(
  [
    generic.aesthetic,
    generic.characterContinuity,
    generic.worldContinuity,
    generic.negativePrompt,
    generic.promptSuffix,
  ].join(" "),
  /Paris|France|French|Maupassant|Belle Époque|한복|조선/i,
);
assert.deepEqual(generic.preferredOutputModes, ["image", "video"]);

const paris = findStylePreset("historical-paris-yadam");
assert.match(paris.promptSuffix, /Paris|France|Belle Époque/i);
assert.equal(findStylePreset("missing-style"), null);
assert.equal(getStylePreset("missing-style").id, "cinematic-tech-news");
```

- [ ] **Step 2: Run the test and verify the missing export or contamination failure**

Run:

```powershell
node scripts/check-easy-sunbi-generic-mode.mjs
```

Expected: FAIL because `findStylePreset` does not exist or because `ship-sunbi-yadam` contains Paris-specific text.

- [ ] **Step 3: Add exact lookup without breaking legacy callers**

In `electron/services/style-presets.mjs`:

```js
export function findStylePreset(id, options = {}) {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) return null;
  return listStylePresets(options).find((item) => item.id === normalizedId) || null;
}

export function getStylePreset(id = "cinematic-tech-news", options = {}) {
  return findStylePreset(id, options) || STYLE_PRESETS[0];
}
```

- [ ] **Step 4: Redefine only the generic preset**

Keep the `ship-sunbi-yadam` ID and label, but replace its geography-specific fields with:

```js
preset(
  "ship-sunbi-yadam",
  "쉽선비 역사 야담 (Easy Sunbi)",
  "grounded historical docudrama imagery with approachable visual storytelling",
  "classical composition with slow dolly, gentle push-in, or restrained documentary movement",
  "natural period-motivated light with subtle cinematic texture",
  "earth tones derived from the supplied historical context",
  {
    characterContinuity: "keep each supplied historical person's identity, age, role, wardrobe, and appearance consistent; do not invent ethnicity or nationality",
    worldContinuity: "derive architecture, clothing, tools, landscape, and material culture only from the supplied historical context",
    negativePrompt: "no unsupported country, ethnicity, real person, wardrobe, architecture, modern object, readable text, logo, watermark, or subtitle",
    preferredOutputModes: ["image", "video"],
  },
)
```

Do not change `historical-paris-yadam`.

- [ ] **Step 5: Run the style assertions**

Run:

```powershell
node scripts/check-easy-sunbi-generic-mode.mjs
```

Expected: the style section passes; the script may still fail later after more assertions are added in subsequent tasks.

- [ ] **Step 6: Commit the style separation**

```powershell
git add -- electron/services/style-presets.mjs scripts/check-easy-sunbi-generic-mode.mjs
git commit -m "fix: separate easy sunbi style from Paris"
```

---

### Task 5: Make the Yadam Draft Builder Use Generic Easy Sunbi Rules

**Files:**
- Modify: `automation/yadam-workflow-builder.mjs`
- Modify: `scripts/check-yadam-workflow.mjs`
- Modify: `scripts/check-easy-sunbi-generic-mode.mjs`

**Interfaces:**
- Consumes: `buildNarrativeModePrompt("yadam")`
- Consumes: `normalizeHistoricalContext(job.options.historicalContext)`
- Produces: `buildYadamSystemPrompt({ targetMinutes, targetCharacters, historicalContext }): string`
- Produces draft field: `historical_context: HistoricalContext`

- [ ] **Step 1: Replace obsolete Korean-name assertions with generic prompt assertions**

Update `scripts/check-yadam-workflow.mjs` to import only:

```js
import { buildYadamSystemPrompt } from "../automation/yadam-workflow-builder.mjs";
```

Replace the `pickName()` checks with:

```js
const romanPrompt = buildYadamSystemPrompt({
  targetMinutes: 10,
  targetCharacters: 3800,
  historicalContext: {
    period: "Roman Empire",
    city: "Rome",
    confidence: "explicit",
  },
});
assert.match(romanPrompt, /Easy Sunbi|쉽선비/);
assert.match(romanPrompt, /Roman Empire/);
assert.match(romanPrompt, /Rome/);
assert.doesNotMatch(romanPrompt, /traditional Korean clothing|한복|조선|Paris|Maupassant/i);
assert.match(romanPrompt, /historical_context/);
```

- [ ] **Step 2: Run the Yadam check and verify it fails against the Korea-specific prompt**

Run:

```powershell
node scripts/check-yadam-workflow.mjs
```

Expected: FAIL because the current prompt identifies itself as `Traditional Korean Yadam` and requires Korean clothing.

- [ ] **Step 3: Refactor the system prompt**

Change `buildYadamSystemPrompt()` to accept one object argument and assemble:

```js
const narrativePrompt = buildNarrativeModePrompt("yadam");
const historicalPrompt = buildHistoricalContextPrompt(historicalContext);
```

The prompt must:

- retain duration, Korean-language, dialogue-ratio, Hanja, sentence-ending, conjunction, and age-consistency constraints;
- remove `Traditional Korean Yadam`, Korean clothing, Korean landscape, and Korean-name requirements;
- require output JSON fields `title`, `script`, `structure: "direct-script"`, `historical_context`, and `scenes`;
- require `historical_context.confidence` to be `explicit`, `researched`, or `unknown`;
- forbid invented location, ethnicity, wardrobe, architecture, named person, quotation, or source;
- require scene B-roll prompts to use the emitted historical context.

- [ ] **Step 4: Update `buildYadamDraft()`**

Build the prompt with:

```js
const historicalContext = normalizeHistoricalContext(job.options.historicalContext);
const sysPrompt = buildYadamSystemPrompt({
  targetMinutes,
  targetCharacters,
  historicalContext,
});
```

Change the user prompt opening to:

```js
`Create a Korean Easy Sunbi historical storytelling draft based on: ${job.sourceValue}`
```

After parsing, merge explicit job context over the model result:

```js
const effectiveHistoricalContext = mergeHistoricalContexts(
  draft?.historical_context,
  historicalContext,
);
return normalizeYouTubeDraft({
  ...draft,
  historical_context: effectiveHistoricalContext,
});
```

Keep `pickName()` exported for backward compatibility but stop using it in the generic draft path. Do not delete `module/name_bank.md`.

- [ ] **Step 5: Extend the cross-topic test**

Append to `scripts/check-easy-sunbi-generic-mode.mjs`:

```js
import { buildYadamSystemPrompt } from "../automation/yadam-workflow-builder.mjs";

const unknownPrompt = buildYadamSystemPrompt({
  targetMinutes: 10,
  targetCharacters: 3800,
  historicalContext: {},
});
assert.doesNotMatch(unknownPrompt, /Paris|France|Maupassant|한복|조선|traditional Korean clothing/i);
assert.match(unknownPrompt, /do not invent|must not invent/i);
```

- [ ] **Step 6: Run focused draft-prompt tests**

Run:

```powershell
node scripts/check-yadam-workflow.mjs
node scripts/check-easy-sunbi-generic-mode.mjs
```

Expected: both commands exit `0`.

- [ ] **Step 7: Commit the generic draft builder**

```powershell
git add -- automation/yadam-workflow-builder.mjs scripts/check-yadam-workflow.mjs scripts/check-easy-sunbi-generic-mode.mjs
git commit -m "feat: generalize easy sunbi draft generation"
```

---

### Task 6: Preserve Researched Historical Context Through the Workflow

**Files:**
- Modify: `electron/services/longform-research-brief.mjs`
- Modify: `youtube-workflow-stages.mjs`
- Modify: `youtube-workflow.mjs`
- Modify: `scripts/check-historical-context-contract.mjs`
- Modify: `scripts/check-longform-production-contract.mjs`

**Interfaces:**
- `normalizeResearchBrief(value)` produces `historicalContext`
- `resolveEffectiveHistoricalContext({ job, researchBrief, draft })` produces one normalized context
- Precedence, lowest to highest: `draft.historical_context`, `researchBrief.historicalContext`, `job.options.historicalContext`

- [ ] **Step 1: Add failing research-brief persistence assertions**

In `scripts/check-historical-context-contract.mjs`, add a temporary-directory round trip:

```js
const brief = normalizeResearchBrief({
  provider: "fixture",
  notes: ["The event occurred in Rome."],
  historicalContext: {
    period: "Roman Empire",
    city: "Rome",
    confidence: "researched",
  },
});
assert.equal(brief.historicalContext.city, "Rome");
assert.equal(brief.historicalContext.confidence, "researched");
```

Import `normalizeResearchBrief` from `electron/services/longform-research-brief.mjs`.

- [ ] **Step 2: Run the test and verify the field is missing**

Run:

```powershell
node scripts/check-historical-context-contract.mjs
```

Expected: FAIL because `normalizeResearchBrief()` currently drops `historicalContext`.

- [ ] **Step 3: Preserve context in research briefs**

In `electron/services/longform-research-brief.mjs`, import `normalizeHistoricalContext` and return:

```js
historicalContext: normalizeHistoricalContext(
  value.historicalContext || value.historical_context,
),
```

Keep the current notes, citations, cautions, text, status, and timestamp behavior.

- [ ] **Step 4: Carry researched context into the draft job**

In `youtube-workflow-stages.mjs`, when NotebookLM research succeeds, add:

```js
historicalContext: normalizeHistoricalContext(
  notebooklmResearch.historicalContext || notebooklmResearch.historical_context,
),
```

to the draft job options only when the user has not provided a meaningful explicit context. Use `mergeHistoricalContexts(researched, explicit)` instead of a truthiness check so confidence precedence is deterministic.

- [ ] **Step 5: Resolve context once before scene planning**

In `youtube-workflow.mjs`, add and export:

```js
export function resolveEffectiveHistoricalContext({ job = {}, researchBrief = {}, draft = {} } = {}) {
  return mergeHistoricalContexts(
    draft.historical_context,
    researchBrief.historicalContext || researchBrief.historical_context,
    job.options?.historicalContext,
  );
}
```

Resolve it immediately after resolving `stylePreset`, assign it back to `draft.historical_context`, and pass `historicalContext` to:

- `planLongformScenesFromDraft()`
- `planScenesFromHpsl()`
- `planScenesFromScript()`

- [ ] **Step 6: Add persisted-plan assertions**

In `scripts/check-longform-production-contract.mjs`, give the test job:

```js
historicalContext: {
  period: "Regency era",
  country: "United Kingdom",
  city: "London",
  confidence: "explicit",
},
```

Assert:

```js
assert.ok(savedPlan.visualScenes.every((scene) => /London|United Kingdom/.test(scene.image_prompt)));
assert.ok(savedPlan.visualScenes.every((scene) => !/Paris|Maupassant/.test(scene.image_prompt)));
```

- [ ] **Step 7: Run workflow context checks**

Run:

```powershell
node scripts/check-historical-context-contract.mjs
node scripts/check-longform-production-contract.mjs
```

Expected: both commands exit `0`.

- [ ] **Step 8: Commit workflow propagation**

```powershell
git add -- electron/services/longform-research-brief.mjs youtube-workflow-stages.mjs youtube-workflow.mjs scripts/check-historical-context-contract.mjs scripts/check-longform-production-contract.mjs
git commit -m "feat: preserve historical context through workflow"
```

---

### Task 7: Compose Context in Longform and Direct-Script Visual Prompts

**Files:**
- Modify: `electron/services/longform-planner.mjs`
- Modify: `electron/services/script-planner.mjs`
- Modify: `scripts/check-easy-sunbi-generic-mode.mjs`
- Modify: `scripts/check-longform-production-contract.mjs`

**Interfaces:**
- `planLongformScenesFromDraft({ ..., historicalContext })`
- `planScenesFromScript({ ..., historicalContext })`
- `planScenesFromHpsl({ ..., historicalContext })`
- All planner functions consume a normalized `HistoricalContext` and do not derive geography from `genreMode`.

- [ ] **Step 1: Add the four cross-topic planner cases**

Extend `scripts/check-easy-sunbi-generic-mode.mjs` with a helper:

```js
import { planLongformScenesFromDraft } from "../electron/services/longform-planner.mjs";

function firstPrompt({ title, historicalContext, stylePresetId = "ship-sunbi-yadam" }) {
  const scenes = planLongformScenesFromDraft({
    job: {
      options: {
        videoFormat: "longform",
        genreMode: "yadam",
        flowOutputMode: "image",
        longformTargetSeconds: 600,
        aspectRatio: "16:9",
      },
    },
    draft: {
      title,
      script: `${title}의 배경과 원인과 결과를 살펴봅니다.`,
    },
    stylePreset: findStylePreset(stylePresetId),
    historicalContext,
  });
  return scenes[0].image_prompt;
}
```

Add:

```js
const rome = firstPrompt({
  title: "고대 로마의 화재",
  historicalContext: {
    period: "Roman Empire",
    city: "Rome",
    wardrobe: ["first-century Roman tunics and togas"],
    confidence: "explicit",
  },
});
assert.match(rome, /Roman Empire|Rome/);
assert.doesNotMatch(rome, /Paris|France|Maupassant/i);

const joseon = firstPrompt({
  title: "조선 시대의 환곡",
  historicalContext: {
    period: "late Joseon dynasty",
    country: "Joseon Korea",
    wardrobe: ["period-appropriate Joseon clothing"],
    confidence: "explicit",
  },
});
assert.match(joseon, /Joseon/);
assert.doesNotMatch(joseon, /Paris|France|Maupassant|French attire/i);

const parisExplicit = firstPrompt({
  title: "1889년 파리 만국박람회",
  stylePresetId: "historical-paris-yadam",
  historicalContext: {
    period: "Belle Époque",
    country: "France",
    city: "Paris",
    confidence: "explicit",
  },
});
assert.match(parisExplicit, /Paris|France|Belle Époque/i);

const unknownSetting = firstPrompt({
  title: "출처가 불분명한 옛 소문",
  historicalContext: {},
});
assert.doesNotMatch(unknownSetting, /Paris|France|Maupassant|Joseon|Roman|한복/i);
```

- [ ] **Step 2: Run the cross-topic test and capture the Paris contamination failure**

Run:

```powershell
node scripts/check-easy-sunbi-generic-mode.mjs
```

Expected: FAIL because `longform-planner.mjs` still injects the France/Paris/Maupassant prefix.

- [ ] **Step 3: Remove genre-to-geography coupling in the longform planner**

In `electron/services/longform-planner.mjs`:

- remove `getStylePreset` import;
- remove `effectiveStylePreset` and the `genreMode === "yadam"` auto-switch;
- remove `yaDamContextPrefix`;
- add `historicalContext = {}` to `planLongformScenesFromDraft()`;
- pass the caller-supplied `stylePreset` unchanged;
- add `historicalContext` to `buildLongformPrompt()`;
- insert `buildHistoricalContextPrompt(historicalContext)` after narration meaning and before style;
- call `findHistoricalContextConflicts()` and attach returned strings to each scene as `historicalContextWarnings`.

The prompt must contain no literal `Paris`, `France`, `Maupassant`, `Joseon`, or `Roman` text outside supplied context or the explicitly selected style.

- [ ] **Step 4: Apply the same composer to direct-script/HPSL planners**

In `electron/services/script-planner.mjs`:

- add `historicalContext = {}` to both public planner signatures;
- pass it to `buildVisualStoryPrompt()`;
- add `historicalContext` to that private signature;
- insert `buildHistoricalContextPrompt(historicalContext)` before `stylePreset.promptSuffix`;
- keep Stickman-specific behavior intact;
- do not rewrite narration text.

- [ ] **Step 5: Run focused planner tests**

Run:

```powershell
node scripts/check-easy-sunbi-generic-mode.mjs
node scripts/check-longform-production-contract.mjs
node scripts/check-hpsl-scene-planner.mjs
node scripts/check-narration-sentence-integrity.mjs
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit prompt composition**

```powershell
git add -- electron/services/longform-planner.mjs electron/services/script-planner.mjs scripts/check-easy-sunbi-generic-mode.mjs scripts/check-longform-production-contract.mjs
git commit -m "fix: compose historical context without geography leaks"
```

---

### Task 8: Add Aggregate Verification and Documentation

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `timeline.md`
- Reference: `docs/superpowers/specs/2026-07-28-easy-sunbi-generic-narrative-mode-design.md`

**Interfaces:**
- Produces focused command: `npm run check:easy-sunbi`

- [ ] **Step 1: Add the focused package command**

Add:

```json
"check:easy-sunbi": "node scripts/check-narrative-modes.mjs && node scripts/check-historical-context-contract.mjs && node scripts/check-yadam-workflow.mjs && node scripts/check-easy-sunbi-generic-mode.mjs && node scripts/check-longform-production-contract.mjs"
```

Ensure `npm run check:easy-sunbi` is also invoked by the aggregate `check` command exactly once.

- [ ] **Step 2: Document operator-facing behavior**

Add a concise README section:

```markdown
### 쉽선비 범용 역사 야담

- `genreMode: "yadam"`은 한국어 말투와 Hook–Context–Climax–Outro 전개만 선택합니다.
- `historicalContext`는 사건의 시대·지역·인물·복식·건축을 정의합니다.
- `stylePresetId`는 실사·삽화·스틱맨 같은 화면 표현을 선택합니다.
- `ship-sunbi-yadam`은 범용 스타일이며, `historical-paris-yadam`은 파리 소재를 명시적으로 선택할 때만 사용합니다.
- 역사 컨텍스트가 없으면 Hermes는 특정 국가·민족·복식·실존 인물을 추측하지 않습니다.
```

- [ ] **Step 3: Run the focused suite**

Run:

```powershell
npm run check:easy-sunbi
```

Expected: all five component checks pass.

- [ ] **Step 4: Run adjacent regression checks**

Run:

```powershell
node scripts/check-youtube-job-schema.mjs
node scripts/check-youtube-draft-quality.mjs
node scripts/check-research-grounding-contract.mjs
node scripts/check-hpsl-scene-planner.mjs
node scripts/check-longform-no-repeat-and-intro-duration.mjs
node scripts/check-longform-production-contract.mjs
```

Expected: every command exits `0`.

- [ ] **Step 5: Run diff and syntax hygiene checks**

Run:

```powershell
git diff --check
node --check electron/services/narrative-modes.mjs
node --check electron/services/historical-context.mjs
node --check automation/yadam-workflow-builder.mjs
node --check electron/services/longform-planner.mjs
node --check electron/services/script-planner.mjs
```

Expected: no whitespace or syntax errors.

- [ ] **Step 6: Record actual verification in the development timeline**

Append a dated entry to `timeline.md` that lists:

- removal of Korea/Paris hard-coding from the generic Yadam path;
- addition of narrative and historical-context contracts;
- the exact checks run and their observed pass/fail results;
- any unrelated pre-existing failure that remains.

Do not add a `log.md` entry because this is a development change, not a wiki `save`, `ingest`, `query`, `reference`, or `lint` command.

- [ ] **Step 7: Commit documentation and verification wiring**

```powershell
git add -- package.json README.md timeline.md
git commit -m "docs: document generic easy sunbi workflow"
```

---

## Final Review Checklist

- [ ] Map every approved design requirement to at least one task above.
- [ ] Search changed code and tests for accidental hard-coded `Paris`, `France`, `Maupassant`, `traditional Korean clothing`, `한복`, and `조선`; allow them only in the Paris preset and explicit regression fixtures.
- [ ] Confirm `ship-sunbi-yadam` remains a valid ID.
- [ ] Confirm `historical-paris-yadam` remains unchanged and opt-in.
- [ ] Confirm direct-script narration bytes are unchanged by narrative-mode selection.
- [ ] Confirm explicit visual styles are never overwritten by `genreMode`.
- [ ] Confirm `historicalContext.confidence === "unknown"` does not produce a geography prompt.
- [ ] Confirm `npm run check:easy-sunbi` passes.
- [ ] Confirm adjacent regression checks pass.
- [ ] Review `git diff --stat` and `git status --short` to ensure no unrelated user changes were staged.
