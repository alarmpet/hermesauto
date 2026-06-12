# Web Agent Playwright Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Hermes Studio's brittle direct Playwright control path with a provider automation engine layer that can run Webwright-first scripted recovery, Browser Use assisted recovery, Computer Use visual fallback, and an optional Stagehand bridge while preserving deterministic media-file QA.

**Architecture:** Keep Hermes' final success oracle unchanged: a provider only succeeds when it returns real local media files with content type, size, duration/dimensions, and evidence. Move direct browser control behind an adapter interface, then route Google Flow/Leonardo/Grok workflows through deterministic adapters first and AI-agent adapters only for inspection, selector discovery, and bounded recovery. Playwright may remain an internal implementation detail for some adapters during migration, but workflow code must no longer depend on Playwright-specific `page` calls directly.

**Tech Stack:** Node.js ESM, Electron, existing `automation/web-ui-provider-contract.mjs`, Webwright CLI/Python script workspace, optional Stagehand TypeScript SDK bridge, optional Browser Use Python/Rust runtime, OpenAI Computer Use API, existing ffmpeg/sharp QA, existing Google Flow/Gemini/ChatGPT media pipeline.

---

## Research Summary

### Webwright

Microsoft Webwright is a terminal-native web-agent harness. Its core idea is that the agent writes and reruns code in a local workspace, launches/discards browser sessions, and leaves durable scripts, logs, and screenshots behind. This matches Hermes' need: every failed Flow run should produce reusable scripts and evidence, not just one fragile click trace.

Use Webwright for:
- Failure diagnosis after `FLOW_PROMPT_TEXTBOX_NOT_FOCUSED`, `FLOW_GENERATION_FAILED`, `FLOW_MEDIA_URL_NOT_FOUND`, and stale failure-card states.
- Generating candidate robust selectors and reusable scripts under `diagnostics-webwright`.
- Producing patch suggestions for provider adapters, not directly declaring success.

Do not use Webwright for:
- Approving paid credit confirmations.
- Bypassing CAPTCHA/human verification.
- Final success decisions.

Sources:
- https://microsoft.github.io/Webwright/
- https://github.com/microsoft/Webwright
- https://www.microsoft.com/en-us/research/articles/webwright-a-terminal-is-all-you-need-for-web-agents/

### Browser Use

Browser Use provides an AI browser/computer action space, persistent tools, and recovery loops. Its current GitHub docs describe a Python API backed by a Rust core and browser harness. This is useful for Hermes when Flow/Leonardo/Grok UI changes and deterministic selectors need discovery or recovery.

Use Browser Use for:
- Provider-specific recovery tasks: "Find the current image model dropdown", "extract whether a failure card/rate limit/credit dialog is visible", "identify the latest generated media card".
- One-scene no-spend smoke checks where it is allowed to inspect UI but not submit generation.
- Generating structured observations for the deterministic adapter.

Do not use Browser Use for:
- Fully autonomous 30-50 scene generation.
- Success without saved media files.
- Paid or irreversible actions.

Sources:
- https://github.com/browser-use/browser-use
- https://browser-use.com/

### Computer Use

OpenAI Computer Use lets a model operate software through screenshots and returned UI actions, or through a custom harness. The official docs emphasize isolated browsers/VMs, allow-listed domains/actions, and human-in-the-loop for purchases, authenticated flows, destructive actions, or hard-to-reverse operations.

Use Computer Use for:
- Last-resort visual fallback when DOM selectors fail but the screen clearly shows a state such as `거부`, `안 함`, `1x`, `9:16`, or a visible download button.
- Cross-provider UI state extraction in a controlled browser/VM.

Do not use Computer Use for:
- Default path execution.
- Running on the user's full desktop without isolation.
- Any paid-credit approval or account/security prompt.

Sources:
- https://developers.openai.com/api/docs/guides/tools-computer-use

### Stagehand Note

Stagehand is a browser automation framework that combines code with natural-language actions and extraction. It is TypeScript-friendly and fits Hermes better than Python sidecars for some recovery tasks, but it is still Playwright-based. Because the user asked specifically to investigate Webwright, Browser Use, and Computer Use as Playwright replacement directions, Stagehand should be added as a bridge/assist engine, not as the sole replacement architecture.

Use Stagehand for:
- Short-lived `act()`, `extract()`, and `observe()` helpers inside an isolated provider adapter.
- Finding candidate controls when deterministic selectors fail.
- Generating structured state snapshots for Hermes to validate.

Do not use Stagehand for:
- Full autonomous long scene generation.
- Final success decisions.
- Paid or irreversible actions.

Source:
- https://github.com/browserbase/stagehand

## Decision

Recommended Hermes direction:

1. **Provider Engine Abstraction first.**
   - Stop calling Playwright-specific `page` helpers from workflow code.
   - All providers return `WebUiProviderResult`.

2. **Stagehand as optional bridge engine, not the default replacement.**
   - It is valuable because it is TypeScript-native and can reuse some browser automation concepts.
   - It remains Playwright-based, so it cannot be the only answer to a Playwright replacement request.

3. **Webwright as default diagnostic/recovery engine.**
   - Keep it bounded: generate scripts/evidence and suggest deterministic adapter updates.
   - Do not let it submit paid or irreversible actions.

4. **Browser Use as optional assist engine.**
   - Use for UI observation and recovery candidate extraction.
   - Keep final click/submit/media checks in Hermes.

5. **Computer Use as visual last resort.**
   - Use only for isolated, allow-listed, no-spend visual UI recovery.
   - Human-in-loop required for paid credit dialogs, login, security, upload, or account changes.

6. **Playwright migration, not instant deletion.**
   - Existing Flow path can keep Playwright internally while the public adapter interface hides it.
   - New provider work should target the adapter interface, not raw Playwright.

## Review Incorporation Notes

The review document `2026-06-12-web-agent-playwright-replacement-plan-review.md` was checked against the current codebase and current public docs. The following feedback is accepted:

- Add Stagehand as an optional TypeScript bridge because it fits the Node/Electron stack better than Python sidecars.
- Do not make Stagehand the only primary path because it still depends on Playwright and does not fully satisfy a replacement goal.
- Add an inventory task for all current browser automation surfaces, not only Google Flow.
- Split the large Google Flow migration task into smaller state-machine tasks.
- Explicitly handle `context.cookies()`, file upload via `setInputFiles()`, CDP window bounds, and browser-injected classifier code.
- Reuse or wrap the existing `electron/services/webwright-diagnostics-service.mjs` instead of creating a parallel Webwright path.
- Expand safety tokens and add domain/amount checks.
- Add runtime contract tests in addition to source-string checks.
- Add benchmark, rollback, and feature-flag requirements.

The following feedback is not accepted as written:

- "Stagehand must become the first-priority engine." Hermes can add it as first-priority TypeScript assist for selector recovery, but the default replacement architecture should remain provider-adapter based with deterministic success checks.
- "Browser Use should be excluded." It remains useful as an optional external recovery engine, but it must be disabled unless installed/configured and must fail softly.

## Files

- Modify: `automation/web-ui-provider-contract.mjs`
- Modify: `automation/web-ui-provider-harness.mjs`
- Create: `automation/web-agent-engine-router.mjs`
- Create: `automation/web-agent-engines/stagehand-engine.mjs`
- Create: `automation/web-agent-engines/webwright-engine.mjs`
- Create: `automation/web-agent-engines/browser-use-engine.mjs`
- Create: `automation/web-agent-engines/computer-use-engine.mjs`
- Create: `automation/web-agent-telemetry.mjs`
- Create: `automation/providers/google-flow-provider.mjs`
- Create: `automation/providers/provider-browser-session.mjs`
- Modify: `automation/google-flow-media.mjs`
- Modify: `automation/google-flow-output-mode.mjs`
- Modify: `automation/google-flow-chip-classifier.mjs`
- Modify: `automation/google-flow-ingredients.mjs`
- Modify: `automation/chatgpt-thumbnail-source.mjs`
- Modify: `automation/gemini-research-draft.mjs`
- Modify: `automation/chromium-window-bounds.mjs`
- Modify: `electron/services/webwright-diagnostics-service.mjs`
- Modify: `electron/services/config-store.mjs`
- Modify: `electron/renderer/index.html`
- Modify: `electron/renderer/app.js`
- Create: `scripts/check-web-agent-engine-router.mjs`
- Create: `scripts/check-web-agent-safety-contract.mjs`
- Create: `scripts/check-google-flow-provider-adapter-contract.mjs`
- Create: `scripts/check-browser-automation-inventory.mjs`
- Create: `scripts/check-web-agent-runtime-contract.mjs`
- Create: `scripts/benchmark-web-agent-engines.mjs`
- Modify: `package.json`

## Current Browser Automation Inventory

This plan must cover all browser automation currently present in Hermes, not only `automation/google-flow-media.mjs`.

| File | Current Browser Dependency | Migration Treatment |
| --- | --- | --- |
| `automation/web-ui-provider-harness.mjs` | `chromium.launchPersistentContext`, persistent profile, trace, screenshots | Keep temporarily as the low-level session adapter; hide behind `provider-browser-session.mjs`. |
| `automation/google-flow-media.mjs` | Large Playwright state machine for prompt, submit, confirmations, media collection, downloads | Migrate first, in smaller state-machine phases. |
| `automation/google-flow-output-mode.mjs` | Playwright DOM scanning, click candidates, settings panel | Migrate with Flow settings provider methods and agent-assisted observation. |
| `automation/google-flow-ingredients.mjs` | `page.locator`, `setInputFiles()` | Move to provider method `uploadIngredients(filePaths)`. |
| `automation/google-flow-chip-classifier.mjs` | Stringified browser-source injection into `page.evaluate()` | Keep as pure Node classifier, add Stagehand/agent extraction replacement task. |
| `automation/chatgpt-thumbnail-source.mjs` | Playwright browser control for ChatGPT thumbnail path | Phase after Google Flow, because it affects thumbnails, not core scene media. |
| `automation/gemini-research-draft.mjs` | Playwright browser control for Gemini draft/research | Phase after Google Flow and ChatGPT; preserve direct-script offline path. |
| `automation/chromium-window-bounds.mjs` | CDP window management | Isolate as optional session capability; do not leak CDP calls into provider logic. |
| `scripts/run-*-ui-workflow.mjs` | Playwright Electron smoke scripts | Keep as developer tests until replacement smoke coverage exists. |

## Task 1: Add Provider Engine Types

**Files:**
- Modify: `automation/web-ui-provider-contract.mjs`
- Create: `scripts/check-web-agent-engine-router.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing contract test**

Create `scripts/check-web-agent-engine-router.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const contract = readFileSync(resolve(root, "automation/web-ui-provider-contract.mjs"), "utf8");
const router = readFileSync(resolve(root, "automation/web-agent-engine-router.mjs"), "utf8");

assert.match(contract, /createWebAgentObservation/, "contract should create structured web-agent observations");
assert.match(contract, /assertWebAgentSafeAction/, "contract should reject unsafe web-agent actions");
assert.match(router, /selectWebAgentEngine/, "router should expose engine selection");
assert.match(router, /stagehand/, "router should support stagehand as an optional TypeScript bridge");
assert.match(router, /webwright/, "router should support webwright");
assert.match(router, /browser-use/, "router should support browser-use");
assert.match(router, /computer-use/, "router should support computer-use");

console.log(JSON.stringify({ ok: true, checked: "web-agent-engine-router" }));
```

Add it to `package.json`:

```json
"check:web-ui-automation": "node scripts/check-web-ui-provider-harness-contract.mjs && node scripts/check-web-ui-provider-media-required.mjs && node scripts/check-web-ui-provider-manifest-contract.mjs && node scripts/check-web-ui-provider-smoke-fixture.mjs && node scripts/check-web-agent-engine-router.mjs"
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
node scripts/check-web-agent-engine-router.mjs
```

Expected: fails because `automation/web-agent-engine-router.mjs` and new contract functions do not exist.

- [ ] **Step 3: Add contract helpers**

Append to `automation/web-ui-provider-contract.mjs`:

```js
export function createWebAgentObservation({
  engine,
  provider,
  sceneOrder = 0,
  url = "",
  screenshotPath = "",
  snapshotPath = "",
  text = "",
  extracted = {},
  suggestedActions = [],
  evidence = {},
} = {}) {
  return {
    ok: true,
    type: "web-agent-observation",
    engine,
    provider,
    sceneOrder,
    url,
    screenshotPath,
    snapshotPath,
    text,
    extracted,
    suggestedActions,
    evidence,
    updatedAt: new Date().toISOString(),
  };
}

export function assertWebAgentSafeAction(action = {}) {
  const text = JSON.stringify(action).toLowerCase();
  const blocked = [
    "approve",
    "승인",
    "확인",
    "동의",
    "purchase",
    "pay",
    "payment",
    "billing",
    "credit card",
    "subscribe",
    "결제",
    "login",
    "sign in",
    "oauth",
    "authorize",
    "account",
    "계정",
    "password",
    "captcha",
    "upload",
    "delete",
    "remove",
    "삭제",
  ];
  const matched = blocked.find((token) => text.includes(token));
  if (matched) {
    throw new Error(`WEB_AGENT_UNSAFE_ACTION: ${matched}`);
  }
  if (/\$[\d,.]+|₩[\d,.]+|[\d,.]+\s*credits?/i.test(text)) {
    throw new Error("WEB_AGENT_UNSAFE_ACTION: monetary_amount_detected");
  }
  if (action.url && !isAllowedWebAgentDomain(action.url)) {
    throw new Error("WEB_AGENT_UNSAFE_ACTION: domain_not_allowed");
  }
  return true;
}

export function isAllowedWebAgentDomain(url = "") {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return [
      "labs.google",
      "flow.google",
      "gemini.google.com",
      "chatgpt.com",
      "chat.openai.com",
    ].some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Add engine router**

Create `automation/web-agent-engine-router.mjs`:

```js
import { runWebwrightEngine } from "./web-agent-engines/webwright-engine.mjs";
import { runStagehandEngine } from "./web-agent-engines/stagehand-engine.mjs";
import { runBrowserUseEngine } from "./web-agent-engines/browser-use-engine.mjs";
import { runComputerUseEngine } from "./web-agent-engines/computer-use-engine.mjs";

const ENGINES = new Map([
  ["stagehand", runStagehandEngine],
  ["webwright", runWebwrightEngine],
  ["browser-use", runBrowserUseEngine],
  ["computer-use", runComputerUseEngine],
]);

export function selectWebAgentEngine({ preferred = "webwright", fallback = "webwright", task = "" } = {}) {
  if (/diagnos|script|reusable/i.test(task) && ENGINES.has("webwright")) {
    return { id: "webwright", run: ENGINES.get("webwright") };
  }
  if (ENGINES.has(preferred)) return { id: preferred, run: ENGINES.get(preferred) };
  if (ENGINES.has(fallback)) return { id: fallback, run: ENGINES.get(fallback) };
  return { id: "none", run: async () => ({ ok: false, skipped: true, reason: "web-agent-engine-disabled" }) };
}

export async function runWebAgentEngine(input = {}) {
  const selected = selectWebAgentEngine(input);
  return selected.run({ ...input, engine: selected.id });
}
```

- [ ] **Step 5: Run and verify GREEN**

Run:

```powershell
node scripts/check-web-agent-engine-router.mjs
```

Expected: passes.

## Task 2: Add Safe Stub Engines

**Files:**
- Create: `automation/web-agent-engines/stagehand-engine.mjs`
- Create: `automation/web-agent-engines/webwright-engine.mjs`
- Create: `automation/web-agent-engines/browser-use-engine.mjs`
- Create: `automation/web-agent-engines/computer-use-engine.mjs`
- Create: `scripts/check-web-agent-safety-contract.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing safety test**

Create `scripts/check-web-agent-safety-contract.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { assertWebAgentSafeAction } from "../automation/web-ui-provider-contract.mjs";
import { runWebAgentEngine } from "../automation/web-agent-engine-router.mjs";

assert.throws(() => assertWebAgentSafeAction({ label: "승인" }), /WEB_AGENT_UNSAFE_ACTION/);
assert.throws(() => assertWebAgentSafeAction({ label: "approve paid credits" }), /WEB_AGENT_UNSAFE_ACTION/);
assert.throws(() => assertWebAgentSafeAction({ label: "15 credits" }), /WEB_AGENT_UNSAFE_ACTION/);
assert.throws(() => assertWebAgentSafeAction({ url: "https://evil.example" }), /WEB_AGENT_UNSAFE_ACTION/);
assert.equal(assertWebAgentSafeAction({ label: "extract visible aspect ratio" }), true);
assert.equal(assertWebAgentSafeAction({ url: "https://labs.google/fx/tools/flow" }), true);

const result = await runWebAgentEngine({
  preferred: "webwright",
  provider: "google-flow",
  task: "Inspect state only. Do not submit.",
});

assert.equal(result.provider, "google-flow");
assert.equal(result.engine, "webwright");
assert.equal(result.actionPolicy?.noSpend, true);
assert.equal(result.actionPolicy?.noSubmit, true);

const stagehand = await runWebAgentEngine({
  preferred: "stagehand",
  provider: "google-flow",
  task: "Extract visible Flow settings only.",
});
assert.equal(stagehand.engine, "stagehand");
assert.equal(stagehand.actionPolicy?.noSpend, true);

console.log(JSON.stringify({ ok: true, checked: "web-agent-safety-contract" }));
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
node scripts/check-web-agent-safety-contract.mjs
```

Expected: fails because engines are not implemented.

- [ ] **Step 3: Implement Stagehand stub**

Create `automation/web-agent-engines/stagehand-engine.mjs`:

```js
import { createWebAgentObservation } from "../web-ui-provider-contract.mjs";

export async function runStagehandEngine({
  provider,
  sceneOrder = 0,
  task = "",
  engine = "stagehand",
} = {}) {
  return createWebAgentObservation({
    engine,
    provider,
    sceneOrder,
    extracted: { task },
    suggestedActions: [],
    actionPolicy: { noSpend: true, noSubmit: true, humanForSensitive: true },
  });
}
```

- [ ] **Step 4: Implement Webwright stub**

Create `automation/web-agent-engines/webwright-engine.mjs`:

```js
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createWebAgentObservation } from "../web-ui-provider-contract.mjs";

export async function runWebwrightEngine({
  provider,
  sceneOrder = 0,
  jobDir = "",
  task = "",
  engine = "webwright",
} = {}) {
  const outDir = jobDir ? join(jobDir, "diagnostics-webwright") : "";
  const taskPath = outDir ? join(outDir, `scene_${sceneOrder || "job"}_task.md`) : "";
  if (outDir) {
    await mkdir(outDir, { recursive: true });
    await writeFile(taskPath, [
      `Provider: ${provider}`,
      `Scene: ${sceneOrder}`,
      "",
      task,
      "",
      "Rules:",
      "- Inspect only unless Hermes explicitly allows a deterministic safe action.",
      "- Do not approve paid credits.",
      "- Do not bypass CAPTCHA or login/security prompts.",
      "- Return reusable script suggestions and evidence.",
    ].join("\n"), "utf8");
  }
  return createWebAgentObservation({
    engine,
    provider,
    sceneOrder,
    evidence: { taskPath },
    extracted: {},
    suggestedActions: [],
    actionPolicy: { noSpend: true, noSubmit: true, humanForSensitive: true },
  });
}
```

- [ ] **Step 5: Implement Browser Use stub**

Create `automation/web-agent-engines/browser-use-engine.mjs`:

```js
import { createWebAgentObservation } from "../web-ui-provider-contract.mjs";

export async function runBrowserUseEngine({
  provider,
  sceneOrder = 0,
  task = "",
  engine = "browser-use",
} = {}) {
  return createWebAgentObservation({
    engine,
    provider,
    sceneOrder,
    extracted: { task },
    suggestedActions: [],
    actionPolicy: { noSpend: true, noSubmit: true, humanForSensitive: true },
  });
}
```

- [ ] **Step 6: Implement Computer Use stub**

Create `automation/web-agent-engines/computer-use-engine.mjs`:

```js
import { createWebAgentObservation } from "../web-ui-provider-contract.mjs";

export async function runComputerUseEngine({
  provider,
  sceneOrder = 0,
  task = "",
  engine = "computer-use",
} = {}) {
  return createWebAgentObservation({
    engine,
    provider,
    sceneOrder,
    extracted: { task },
    suggestedActions: [],
    actionPolicy: { noSpend: true, noSubmit: true, isolatedOnly: true, humanForSensitive: true },
  });
}
```

- [ ] **Step 7: Run and verify GREEN**

Run:

```powershell
node scripts/check-web-agent-safety-contract.mjs
npm.cmd run check:web-ui-automation
```

Expected: both pass.

## Task 3: Add Browser Automation Inventory Guard

**Files:**
- Create: `scripts/check-browser-automation-inventory.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing inventory test**

Create `scripts/check-browser-automation-inventory.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const plan = readFileSync(resolve(root, "docs/superpowers/plans/2026-06-12-web-agent-playwright-replacement-plan.md"), "utf8");

for (const file of [
  "automation/web-ui-provider-harness.mjs",
  "automation/google-flow-media.mjs",
  "automation/google-flow-output-mode.mjs",
  "automation/google-flow-ingredients.mjs",
  "automation/google-flow-chip-classifier.mjs",
  "automation/chatgpt-thumbnail-source.mjs",
  "automation/gemini-research-draft.mjs",
  "automation/chromium-window-bounds.mjs",
]) {
  assert.match(plan, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `plan should inventory ${file}`);
}

console.log(JSON.stringify({ ok: true, checked: "browser-automation-inventory" }));
```

- [ ] **Step 2: Run and verify GREEN**

Run:

```powershell
node scripts/check-browser-automation-inventory.mjs
```

Expected: passes once the inventory table remains in the plan.

## Task 4: Add Google Flow Provider Adapter Boundary

**Files:**
- Create: `automation/providers/google-flow-provider.mjs`
- Create: `automation/providers/provider-browser-session.mjs`
- Modify: `automation/google-flow-media.mjs`
- Create: `scripts/check-google-flow-provider-adapter-contract.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing adapter test**

Create `scripts/check-google-flow-provider-adapter-contract.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const provider = readFileSync(resolve(root, "automation/providers/google-flow-provider.mjs"), "utf8");
const flow = readFileSync(resolve(root, "automation/google-flow-media.mjs"), "utf8");

assert.match(provider, /class GoogleFlowProvider|export function createGoogleFlowProvider/, "Google Flow provider adapter should exist");
assert.match(provider, /generateSceneMedia/, "provider should expose generateSceneMedia");
assert.match(provider, /inspectWithWebAgent/, "provider should expose bounded web-agent inspection");
assert.match(provider, /getAuthCookies/, "provider should expose auth cookie access for media downloads");
assert.match(provider, /uploadIngredients/, "provider should expose ingredient upload as a provider method");
assert.match(provider, /getGeneratorState/, "provider should expose generator state inspection");
assert.match(provider, /configureSettings/, "provider should expose settings configuration");
assert.match(provider, /downloadMedia/, "provider should expose media downloads without leaking Playwright context APIs");
assert.match(flow, /createGoogleFlowProvider/, "legacy Flow media module should delegate through the provider adapter");

console.log(JSON.stringify({ ok: true, checked: "google-flow-provider-adapter-contract" }));
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
node scripts/check-google-flow-provider-adapter-contract.mjs
```

Expected: fails because adapter does not exist.

- [ ] **Step 3: Create adapter shell**

Create `automation/providers/google-flow-provider.mjs`:

```js
import { runWebAgentEngine } from "../web-agent-engine-router.mjs";

export function createGoogleFlowProvider({
  generateLegacySceneMedia,
  preferredWebAgentEngine = "webwright",
} = {}) {
  if (typeof generateLegacySceneMedia !== "function") {
    throw new Error("GOOGLE_FLOW_LEGACY_GENERATOR_REQUIRED");
  }
  return {
    id: "google-flow",
    async inspectWithWebAgent(input = {}) {
      return runWebAgentEngine({
        ...input,
        preferred: input.preferredWebAgentEngine || preferredWebAgentEngine,
        provider: "google-flow",
      });
    },
    async generateSceneMedia(input = {}) {
      return generateLegacySceneMedia(input);
    },
    async getAuthCookies(input = {}) {
      return input.getAuthCookies?.() || [];
    },
    async uploadIngredients(input = {}) {
      return input.uploadIngredients?.() || { ok: true, skipped: true };
    },
    async getGeneratorState(input = {}) {
      return input.getGeneratorState?.() || { ok: true, state: "unknown" };
    },
    async configureSettings(input = {}) {
      return input.configureSettings?.() || { ok: true, skipped: true };
    },
    async downloadMedia(input = {}) {
      return input.downloadMedia?.();
    },
  };
}
```

- [ ] **Step 4: Delegate legacy module through adapter**

In `automation/google-flow-media.mjs`, import:

```js
import { createGoogleFlowProvider } from "./providers/google-flow-provider.mjs";
```

At the public entry point, instantiate:

```js
const provider = createGoogleFlowProvider({
  generateLegacySceneMedia: generateGoogleFlowVideoFromPromptLegacy,
});
return provider.generateSceneMedia(args);
```

Rename the existing implementation body to `generateGoogleFlowVideoFromPromptLegacy`.

- [ ] **Step 5: Run and verify GREEN**

Run:

```powershell
node --check automation/providers/google-flow-provider.mjs
node --check automation/google-flow-media.mjs
node scripts/check-google-flow-provider-adapter-contract.mjs
```

Expected: all pass.

## Task 5: Wire Web-Agent Diagnostics Into Flow Failure Recovery

**Files:**
- Modify: `automation/google-flow-media.mjs`
- Modify: `electron/services/webwright-diagnostics-service.mjs`
- Test: `scripts/check-flow-output-mode-contract.mjs`
- Test: `scripts/check-webwright-diagnostics-contract.mjs`

- [ ] **Step 1: Add diagnostics trigger after browser failures**

In Flow failures with codes:

```js
[
  "FLOW_PROMPT_TEXTBOX_NOT_FOCUSED",
  "FLOW_GENERATION_FAILED",
  "FLOW_MEDIA_URL_NOT_FOUND",
  "FLOW_IMAGE_SETTINGS_MISMATCH",
  "FLOW_CREATE_NOT_STARTED",
]
```

call:

```js
await provider.inspectWithWebAgent({
  jobDir,
  sceneOrder,
  task: `Inspect Google Flow failure ${failureCode}. Do not submit. Do not approve paid credits. Return selectors, visible state, and suggested deterministic checks.`,
});
```

- [ ] **Step 2: Persist observation**

Write:

```text
scene_N_web_agent_observation.json
```

with `engine`, `provider`, `extracted`, `suggestedActions`, and evidence paths.

- [ ] **Step 3: Keep final failure semantics unchanged**

If no media file exists, still fail with the original Flow failure code.

- [ ] **Step 4: Verify**

Run:

```powershell
node scripts/check-flow-output-mode-contract.mjs
node scripts/check-webwright-diagnostics-contract.mjs
```

Expected: both pass and contract checks mention web-agent observation.

## Task 6: Add UI Engine Selection And Safe Defaults

**Files:**
- Modify: `electron/services/config-store.mjs`
- Modify: `electron/renderer/index.html`
- Modify: `electron/renderer/app.js`
- Modify: `scripts/check-studio-v2-ux.mjs`

- [ ] **Step 1: Add config defaults**

In `electron/services/config-store.mjs`, add:

```js
webAgentEngine: "webwright",
stagehandEnabled: false,
browserUseEnabled: false,
computerUseEnabled: false,
computerUseRequiresIsolation: true,
```

- [ ] **Step 2: Add Studio controls**

Add a settings panel control:

```html
<label for="webAgentEngine">Web agent recovery</label>
<select id="webAgentEngine">
  <option value="webwright" selected>Webwright diagnostics</option>
  <option value="stagehand">Stagehand selector assist</option>
  <option value="browser-use">Browser Use assist</option>
  <option value="computer-use">Computer Use visual fallback</option>
  <option value="none">Disabled</option>
</select>
```

Add a hint:

```html
<div class="preset-preview">Agent recovery can inspect UI and suggest deterministic fixes, but Hermes still requires real media files before final render.</div>
```

- [ ] **Step 3: Persist selection**

In `electron/renderer/app.js`, load/save `webAgentEngine` with existing config code.

- [ ] **Step 4: Update UX contract**

In `scripts/check-studio-v2-ux.mjs`, assert:

```js
assert.match(html, /webAgentEngine/, "Studio should expose web-agent recovery engine selection");
assert.match(app, /webAgentEngine/, "Studio should persist web-agent recovery engine selection");
```

- [ ] **Step 5: Verify**

Run:

```powershell
node scripts/check-studio-v2-ux.mjs
npm.cmd run check:studio-inputs
```

Expected: pass.

## Task 7: Add Stagehand Optional Runtime Probe

**Files:**
- Modify: `automation/web-agent-engines/stagehand-engine.mjs`
- Create: `scripts/check-stagehand-engine-contract.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write probe contract**

Create `scripts/check-stagehand-engine-contract.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const engine = readFileSync(resolve(root, "automation/web-agent-engines/stagehand-engine.mjs"), "utf8");

assert.match(engine, /@browserbase\/stagehand|stagehand/i, "Stagehand engine should probe the Stagehand SDK only when enabled");
assert.match(engine, /STAGEHAND_NOT_AVAILABLE/, "Stagehand engine should fail softly when not installed");
assert.match(engine, /noSpend/, "Stagehand engine should preserve no-spend policy");

console.log(JSON.stringify({ ok: true, checked: "stagehand-engine-contract" }));
```

- [ ] **Step 2: Implement soft probe**

Use dynamic import so packaged Hermes can run without Stagehand installed:

```js
let stagehand = null;
try {
  stagehand = await import("@browserbase/stagehand");
} catch {
  return createWebAgentObservation({
    engine,
    provider,
    sceneOrder,
    extracted: { failureCode: "STAGEHAND_NOT_AVAILABLE" },
    suggestedActions: [],
    actionPolicy: { noSpend: true, noSubmit: true, humanForSensitive: true },
  });
}
```

- [ ] **Step 3: Verify**

Run:

```powershell
node scripts/check-stagehand-engine-contract.mjs
```

Expected: pass whether Stagehand is installed or not.

## Task 8: Add Browser Use Optional Runtime Probe

**Files:**
- Modify: `automation/web-agent-engines/browser-use-engine.mjs`
- Create: `scripts/check-browser-use-engine-contract.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write probe contract**

Create `scripts/check-browser-use-engine-contract.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const engine = readFileSync(resolve(root, "automation/web-agent-engines/browser-use-engine.mjs"), "utf8");

assert.match(engine, /HERMES_BROWSER_USE_PYTHON/, "Browser Use engine should support explicit Python path");
assert.match(engine, /browser_use/, "Browser Use engine should call the browser_use package only when enabled");
assert.match(engine, /BROWSER_USE_NOT_AVAILABLE/, "Browser Use engine should fail softly when not installed");

console.log(JSON.stringify({ ok: true, checked: "browser-use-engine-contract" }));
```

- [ ] **Step 2: Implement soft probe**

In `browser-use-engine.mjs`, use `spawnSync` to run:

```powershell
python -c "import browser_use; print('ok')"
```

Return `BROWSER_USE_NOT_AVAILABLE` observation if the package is missing.

- [ ] **Step 3: Verify**

Run:

```powershell
node scripts/check-browser-use-engine-contract.mjs
```

Expected: pass whether Browser Use is installed or not.

## Task 9: Add Computer Use Safety Gate

**Files:**
- Modify: `automation/web-agent-engines/computer-use-engine.mjs`
- Create: `scripts/check-computer-use-safety-gate.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write safety test**

Create `scripts/check-computer-use-safety-gate.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const engine = readFileSync(resolve(root, "automation/web-agent-engines/computer-use-engine.mjs"), "utf8");

assert.match(engine, /OPENAI_API_KEY/, "Computer Use should require explicit OpenAI API credentials");
assert.match(engine, /isolatedOnly/, "Computer Use should require an isolated browser or VM");
assert.match(engine, /humanForSensitive/, "Computer Use should keep humans in the loop for sensitive actions");
assert.match(engine, /COMPUTER_USE_DISABLED/, "Computer Use should fail closed by default");

console.log(JSON.stringify({ ok: true, checked: "computer-use-safety-gate" }));
```

- [ ] **Step 2: Implement disabled-by-default gate**

In `computer-use-engine.mjs`, return:

```js
{
  ok: false,
  skipped: true,
  failureCode: "COMPUTER_USE_DISABLED",
  actionPolicy: { isolatedOnly: true, humanForSensitive: true, noSpend: true, noSubmit: true }
}
```

unless:

```text
HERMES_ENABLE_COMPUTER_USE=1
OPENAI_API_KEY is configured
HERMES_COMPUTER_USE_ISOLATED=1
```

- [ ] **Step 3: Verify**

Run:

```powershell
node scripts/check-computer-use-safety-gate.mjs
```

Expected: pass.

## Task 10: Provider-Level Live Smoke Matrix

**Files:**
- Create: `scripts/smoke-web-agent-provider-matrix.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add smoke matrix script**

Create `scripts/smoke-web-agent-provider-matrix.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runWebAgentEngine } from "../automation/web-agent-engine-router.mjs";

const jobDir = mkdtempSync(join(tmpdir(), "hermes-web-agent-matrix-"));
const engines = ["webwright", "stagehand", "browser-use", "computer-use"];
const results = [];

for (const engine of engines) {
  const result = await runWebAgentEngine({
    preferred: engine,
    provider: "google-flow",
    jobDir,
    sceneOrder: 1,
    task: "Inspect only. Do not submit. Do not approve paid credits.",
  });
  results.push(result);
  assert.equal(result.provider, "google-flow");
  assert.equal(result.actionPolicy?.noSpend, true);
}

writeFileSync(join(jobDir, "web-agent-provider-matrix.json"), JSON.stringify({ ok: true, results }, null, 2), "utf8");
console.log(JSON.stringify({ ok: true, checked: "web-agent-provider-matrix", jobDir }, null, 2));
```

- [ ] **Step 2: Verify**

Run:

```powershell
node scripts/smoke-web-agent-provider-matrix.mjs
```

Expected: pass without submitting any provider job.

## Task 11: Split Google Flow State Machine Before Migration

**Files:**
- Modify: `automation/google-flow-media.mjs`
- Create: `scripts/check-google-flow-state-machine-map.mjs`

- [ ] **Step 1: Write a state-machine map contract**

Create `scripts/check-google-flow-state-machine-map.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const plan = readFileSync(resolve(root, "docs/superpowers/plans/2026-06-12-web-agent-playwright-replacement-plan.md"), "utf8");

for (const name of [
  "Prompt focus and entry",
  "Output settings and ingredients",
  "Generation submit and confirmation",
  "Media wait and download",
  "Evidence and retry classification",
]) {
  assert.match(plan, new RegExp(name), `plan should split Flow migration phase: ${name}`);
}

console.log(JSON.stringify({ ok: true, checked: "google-flow-state-machine-map" }));
```

- [ ] **Step 2: Preserve the current safety interlocks**

Document these functions in the map before moving code:

```text
rejectFlowImageCreditConfirmation()
rejectFlowVideoCreditConfirmation()
probeFlowGenerationConfirmation()
classifyFlowGenerationFailureText()
verifyFlowSubmissionStarted()
retryFlowSubmitAfterIdle()
httpUrlToBuffer()
```

- [ ] **Step 3: Verify**

Run:

```powershell
node scripts/check-google-flow-state-machine-map.mjs
```

Expected: pass.

### Google Flow Migration Phases

1. **Prompt focus and entry**
   - Existing functions: `findPromptTextbox()`, `focusPromptTextboxForFlow()`, prompt insertion helpers.
   - Provider methods: `focusPrompt()`, `fillPrompt()`.
   - Preserve all failure codes around textbox focus.

2. **Output settings and ingredients**
   - Existing functions: `configureFlowOutputMode()`, `verifyFlowOutputMode()`, `attachFlowIngredients()`.
   - Provider methods: `configureSettings()`, `verifySettings()`, `uploadIngredients(filePaths)`.
   - Treat `setInputFiles()` as provider-owned, not a generic engine feature.

3. **Generation submit and confirmation**
   - Existing functions: `submitPromptToFlowAgain()`, `findCreateButtonAfterTyping()`, `verifyFlowSubmissionStarted()`, `probeFlowGenerationConfirmation()`, paid-credit rejection helpers.
   - Provider methods: `submitGeneration()`, `handleConfirmation()`.
   - Paid-credit rejection remains deterministic and cannot be delegated to AI agents.

4. **Media wait and download**
   - Existing functions: `collectMediaUrls()`, `httpUrlToBuffer()`, media save paths.
   - Provider methods: `waitForMedia()`, `getAuthCookies()`, `downloadMedia()`.
   - `context.cookies()` must not leak outside the provider session object.

5. **Evidence and retry classification**
   - Existing functions: `writeWebUiEvidence()`, `classifyFlowGenerationFailureText()`, retry loops.
   - Provider methods: `writeEvidence()`, `classifyFailure()`, `inspectWithWebAgent()`.
   - Web agents may suggest the next deterministic retry but may not mark success.

## Task 12: Add Runtime Contract Tests

**Files:**
- Create: `scripts/check-web-agent-runtime-contract.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create runtime contract test**

Create `scripts/check-web-agent-runtime-contract.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

async function mustExist(path) {
  await access(resolve(root, path), constants.R_OK);
}

for (const path of [
  "automation/web-agent-engines/router.mjs",
  "automation/web-agent-engines/webwright-engine.mjs",
  "automation/web-agent-engines/stagehand-engine.mjs",
  "automation/web-agent-engines/browser-use-engine.mjs",
  "automation/web-agent-engines/computer-use-engine.mjs",
  "automation/google-flow-provider-adapter.mjs",
  "automation/providers/provider-browser-session.mjs",
]) {
  await mustExist(path);
}

const router = await readFile(resolve(root, "automation/web-agent-engines/router.mjs"), "utf8");
assert.match(router, /fallback/, "router should preserve fallback behavior");
assert.match(router, /webwright/, "router should keep webwright as default diagnostics engine");

const adapter = await readFile(resolve(root, "automation/google-flow-provider-adapter.mjs"), "utf8");
for (const method of [
  "configureSettings",
  "uploadIngredients",
  "submitGeneration",
  "handleConfirmation",
  "waitForMedia",
  "getAuthCookies",
  "downloadMedia",
  "writeEvidence",
  "classifyFailure",
  "inspectWithWebAgent",
]) {
  assert.match(adapter, new RegExp(method), `adapter should expose ${method}`);
}

console.log(JSON.stringify({ ok: true, checked: "web-agent-runtime-contract" }));
```

- [ ] **Step 2: Register script**

Add to `package.json`:

```json
"check:web-agent-runtime-contract": "node scripts/check-web-agent-runtime-contract.mjs"
```

- [ ] **Step 3: Verify**

Run:

```powershell
node scripts/check-web-agent-runtime-contract.mjs
npm.cmd run check:web-agent-runtime-contract
```

Expected: pass.

## Task 13: Add Engine Benchmark And Telemetry

**Files:**
- Create: `automation/web-agent-telemetry.mjs`
- Create: `scripts/benchmark-web-agent-engines.mjs`
- Modify: `automation/web-agent-engines/router.mjs`
- Modify: `automation/google-flow-provider-adapter.mjs`

- [ ] **Step 1: Define telemetry schema**

Create `automation/web-agent-telemetry.mjs` with events:

```js
export function createWebAgentTelemetryEvent({
  jobId = "",
  provider = "",
  engine = "",
  task = "",
  startedAt = Date.now(),
  endedAt = Date.now(),
  success = false,
  failureCode = "",
  observationPath = "",
  mediaAccepted = false,
  costUnits = 0,
} = {}) {
  return {
    type: "web-agent-telemetry",
    jobId,
    provider,
    engine,
    task,
    durationMs: Math.max(0, endedAt - startedAt),
    success: Boolean(success),
    failureCode,
    observationPath,
    mediaAccepted: Boolean(mediaAccepted),
    costUnits: Number.isFinite(costUnits) ? costUnits : 0,
  };
}
```

- [ ] **Step 2: Add benchmark script**

Create `scripts/benchmark-web-agent-engines.mjs`:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const telemetry = readFileSync(resolve(root, "automation/web-agent-telemetry.mjs"), "utf8");
const router = readFileSync(resolve(root, "automation/web-agent-engines/router.mjs"), "utf8");

assert.match(telemetry, /durationMs/, "telemetry should record latency");
assert.match(telemetry, /costUnits/, "telemetry should record cost units");
assert.match(telemetry, /mediaAccepted/, "telemetry should separate observation from accepted media");
assert.match(router, /webwright/, "benchmark must include webwright");
assert.match(router, /stagehand/, "benchmark must include stagehand");
assert.match(router, /browser-use/, "benchmark must include browser-use");
assert.match(router, /computer-use/, "benchmark must include computer-use");

console.log(JSON.stringify({ ok: true, checked: "web-agent-engine-benchmark-contract" }));
```

- [ ] **Step 3: Set acceptance thresholds**

Benchmark smoke tasks must record:

```text
engine
provider
task
success/failureCode
durationMs
observationPath
mediaAccepted
costUnits
manualInterventionRequired
```

Initial thresholds:

```text
No engine may mark success without provider media QA.
Computer Use costUnits must remain 0 unless an explicit user-approved API key/run mode is configured.
Browser Use and Stagehand must fail softly when dependencies are missing.
Webwright diagnostics must finish by writing a runnable/manual task artifact or an explicit failure code.
```

- [ ] **Step 4: Verify**

Run:

```powershell
node scripts/benchmark-web-agent-engines.mjs
```

Expected: pass.

## Task 14: Migration Of Google Flow Calls

**Files:**
- Modify: `automation/google-flow-media.mjs`
- Modify: `automation/google-flow-output-mode.mjs`
- Modify: `automation/google-flow-chip-classifier.mjs`
- Test: existing Flow checks

- [ ] **Step 1: Identify raw Playwright call clusters**

In `automation/google-flow-media.mjs`, group direct `page.locator`, `page.mouse`, `page.keyboard`, `page.evaluate`, and `page.screenshot` usage into helper functions:

```js
openGenerator()
configureGenerationSettings()
fillPrompt()
submitGeneration()
waitForProviderMedia()
downloadProviderMedia()
writeProviderEvidence()
```

- [ ] **Step 2: Move clusters behind provider methods**

Each method returns structured data or a `WebUiProviderFailure`; none should throw unstructured browser errors.

- [ ] **Step 3: Add web-agent inspection hooks**

Before a retry, call `inspectWithWebAgent()` and include the observation path in the retry diagnostic.

- [ ] **Step 4: Keep deterministic checks**

Do not replace:

```text
content-type check
file size check
ffprobe duration check
image dimensions check
scene-media-manifest provider check
final-output QA
```

- [ ] **Step 5: Verify**

Run:

```powershell
node --check automation/google-flow-media.mjs
npm.cmd run check:flow-output-mode
npm.cmd run check:flow-policy-safety
npm.cmd run check:web-ui-automation
```

Expected: pass.

## Safety Rules

- AI agents may inspect, extract, and suggest actions.
- Hermes performs final deterministic actions only after `assertWebAgentSafeAction`.
- Never auto-click `승인`, `확인`, `동의`, paid credit approval, login submit, OAuth authorization, upload submit, delete, account switch, billing, subscription, or security prompts.
- Require human approval for actions containing money, credits, account, password, OAuth, CAPTCHA, billing, card, subscribe, upload, delete, remove, approval, `승인`, `확인`, or `동의`.
- Web-agent actions must be allow-listed by provider domain. Google Flow actions stay under `labs.google`, `flow.google`, or the existing confirmed Flow origin set.
- A `web-agent-observation` is evidence only. It must never be treated as generated media or passed into final render.
- A provider result is successful only if `assertProviderMediaResult()` passes.
- If Stagehand, Browser Use, or Computer Use cannot run locally, Hermes must fail softly and keep Webwright/manual diagnostics available.
- `context.cookies()` or equivalent authenticated session material must stay inside the provider session object and must not be written into logs, telemetry, screenshots, or plan artifacts.

## Verification Checklist

Run before completion:

```powershell
node scripts/check-web-agent-engine-router.mjs
node scripts/check-web-agent-safety-contract.mjs
node scripts/check-stagehand-engine-contract.mjs
node scripts/check-browser-use-engine-contract.mjs
node scripts/check-computer-use-safety-gate.mjs
node scripts/check-browser-automation-inventory.mjs
node scripts/check-google-flow-provider-adapter-contract.mjs
node scripts/check-google-flow-state-machine-map.mjs
node scripts/check-web-agent-runtime-contract.mjs
node scripts/benchmark-web-agent-engines.mjs
node scripts/smoke-web-agent-provider-matrix.mjs
npm.cmd run check:web-ui-automation
npm.cmd run check:flow-output-mode
npm.cmd run check:flow-policy-safety
npm.cmd run check:final-output-qa
```

## Rollout

1. Phase 1: Add engine interface, safe stubs, safety contract, inventory guard, and source-level tests.
2. Phase 2: Add runtime contract tests and telemetry schema before migrating production calls.
3. Phase 3: Add Stagehand as optional TypeScript selector assist with dependency-gated startup.
4. Phase 4: Use the existing Webwright diagnostics service through the new observation schema.
5. Phase 5: Split Google Flow into state-machine phases and add rollback flag `useProviderAdapter: false`.
6. Phase 6: Move one Google Flow phase at a time behind the provider adapter.
7. Phase 7: Run A/B smoke jobs against the old path and compare media QA, duration, failure codes, and telemetry.
8. Phase 8: Enable Browser Use as optional observation/recovery when installed.
9. Phase 9: Enable Computer Use only in isolated no-spend visual fallback mode.
10. Phase 10: Migrate ChatGPT thumbnail and Gemini research providers to the same adapter.
11. Phase 11: Add future Leonardo/Grok providers only after the adapter is stable.

Rollback:

- Keep `useProviderAdapter: false` until at least one image-mode and one video-mode Flow smoke pass with identical final media QA.
- Keep old direct Flow path callable for one release after provider adapter rollout.
- Disable Stagehand, Browser Use, and Computer Use independently via engine feature flags.
- If telemetry shows higher media-placeholder, focus, submit, or download failure rates, revert only the affected provider phase.

## Non-Goals

- Do not remove all Playwright code in one pass.
- Do not let AI agents certify final media success.
- Do not automate paid-credit approval.
- Do not bypass CAPTCHA/human verification.
- Do not run Computer Use against the user's unrestricted desktop.

## Self-Review

- Spec coverage: Covers Webwright, Stagehand, Browser Use, Computer Use, combination strategy, browser automation inventory, runtime contracts, benchmark/telemetry, and the Playwright replacement path for Hermes.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps.
- Type consistency: Engine names are consistently `webwright`, `stagehand`, `browser-use`, `computer-use`; provider result remains `WebUiProviderResult`.
