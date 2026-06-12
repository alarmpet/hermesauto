#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { findChromeExecutable } from "../electron/services/browser-profile-service.mjs";
import { ensureFlowProject, waitForFlowGeneratorReady } from "../automation/google-flow-media.mjs";
import { configureFlowOutputMode, verifyFlowOutputMode } from "../automation/google-flow-output-mode.mjs";
import { createWebUiProviderContext, writeWebUiEvidence } from "../automation/web-ui-provider-harness.mjs";

const appData = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
const hermesRoot = join(appData, "hermes");
const requestedAspectRatio = process.env.HERMES_FLOW_SMOKE_ASPECT_RATIO === "9:16" ? "9:16" : "16:9";
const requestedOutputMode = process.env.HERMES_FLOW_SMOKE_OUTPUT_MODE || "image";
const requestedImageModel = process.env.HERMES_FLOW_SMOKE_IMAGE_MODEL || "nano-banana-pro";
const jobDir = join(hermesRoot, "outputs", "desktop", `flow-settings-no-spend-${requestedAspectRatio.replace(":", "x")}-${Date.now()}`);
const profileDir = process.env.HERMES_FLOW_PROFILE_DIR || join(hermesRoot, "browser-profiles", "flow-profile");
const chromePath = process.env.HERMES_CHROME_PATH || findChromeExecutable();

if (!chromePath) {
  throw new Error("Chrome executable was not found. Set HERMES_CHROME_PATH or install Chrome.");
}

await mkdir(jobDir, { recursive: true });

const contextState = await createWebUiProviderContext({
  provider: "flow",
  profileDir,
  chromePath,
  jobOptions: { enableWebUiTracing: false },
});

const { context, page } = contextState;
let report = null;

try {
  await ensureFlowProject(page);
  await waitForFlowGeneratorReady(page, jobDir, 1);
  const modeSwitchResult = await configureFlowOutputMode(page, requestedOutputMode, requestedAspectRatio, {
    flowImageModel: requestedImageModel,
  });
  const modeVerification = await verifyFlowOutputMode(page, requestedOutputMode, requestedAspectRatio);
  const evidence = await writeWebUiEvidence({
    page,
    jobDir,
    provider: "flow",
    sceneOrder: 1,
    label: "settings_no_spend",
    extra: { modeSwitchResult, modeVerification },
  });

  const selectedModel = modeSwitchResult.selectedImageModelLabel || modeVerification.selectedImageModel || "";
  const selectedAspect = modeSwitchResult.selectedAspectLabel || modeVerification.selectedAspectRatio || "";
  const selectedCount = modeSwitchResult.selectedCountLabel || modeVerification.selectedCountLabel || "";

  const checks = {
    modeSwitchOk: modeSwitchResult.ok === true,
    agentOff: requestedOutputMode === "video" || modeSwitchResult.results?.some((item) => item.agentModeOff === true) || false,
    imageMode: modeVerification.selectedOutputMode === requestedOutputMode || modeSwitchResult.selectedOutputMode === requestedOutputMode,

    requestedModel: requestedOutputMode === "video"
      ? (modeSwitchResult.results?.some((item) => item.ok && /Veo/i.test(item.text || ""))
         || /Veo/i.test(selectedModel)
         || false)
      : (requestedImageModel === "nano-banana-pro"
        ? /Nano Banana Pro/i.test(selectedModel)
        : requestedImageModel === "nano-banana-2"
          ? /Nano Banana 2/i.test(selectedModel)
          : /Imagen/i.test(selectedModel)),
    aspectMatches: requestedAspectRatio === "16:9"
      ? /16:9|crop_16_9|crop_landscape/i.test(selectedAspect)
      : /9:16|crop_9_16|crop_portrait/i.test(selectedAspect),
    oneImage: /\b1x\b|^1$/i.test(selectedCount) || requestedOutputMode === "video",

  };

  report = {
    ok: Object.values(checks).every(Boolean),
    checks,
    requestedAspectRatio,
    requestedOutputMode,
    requestedImageModel,
    profileDir,
    jobDir,
    modeSwitchResult,
    modeVerification,
    evidence,
    submitted: false,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(join(jobDir, "flow_settings_no_spend_report.json"), JSON.stringify(report, null, 2), "utf8");
  if (!report.ok) {
    throw new Error(`FLOW_SETTINGS_NO_SPEND_CHECK_FAILED: ${JSON.stringify(checks)}`);
  }
  console.log(JSON.stringify({ ok: true, jobDir, requestedAspectRatio, requestedOutputMode, requestedImageModel, checks }, null, 2));
} catch (error) {
  const failure = {
    ok: false,
    error: error?.message || String(error),
    stack: error?.stack || "",
    profileDir,
    jobDir,
    report,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(join(jobDir, "flow_settings_no_spend_failure.json"), JSON.stringify(failure, null, 2), "utf8").catch(() => {});
  await page.screenshot({ path: join(jobDir, "flow_settings_no_spend_failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await context.close().catch(() => {});
}
