import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { maybeRunWebwrightDiagnostics } from "../../electron/services/webwright-diagnostics-service.mjs";
import { createWebAgentObservation } from "../web-agent-safety.mjs";

export async function runWebwrightEngine({
  config = {},
  jobDir = "",
  provider = "",
  task = "",
  failure = {},
  sourceUrl = "",
  engine = "webwright",
} = {}) {
  const effectiveConfig = { webwrightDiagnosticsEnabled: true, ...(config || {}) };
  if (!jobDir) {
    return createWebAgentObservation({
      engine,
      provider,
      task,
      ok: false,
      failureCode: "WEBWRIGHT_JOB_DIR_REQUIRED",
      message: "Webwright diagnostics require a jobDir.",
    });
  }
  const diagnostic = await maybeRunWebwrightDiagnostics({
    config: effectiveConfig,
    jobDir,
    provider,
    failure: failure?.failureCode || failure?.code ? failure : { failureCode: "FLOW_MEDIA_URL_NOT_FOUND" },
    sourceUrl,
  });
  const observationPath = diagnostic.reportPath || join(jobDir, "diagnostics-webwright", "webwright-diagnostics-result.json");
  if (!diagnostic.reportPath) {
    await mkdir(join(jobDir, "diagnostics-webwright"), { recursive: true }).catch(() => {});
    await writeFile(observationPath, JSON.stringify(diagnostic, null, 2), "utf8").catch(() => {});
  }
  return createWebAgentObservation({
    engine,
    provider,
    task,
    ok: Boolean(diagnostic.ok),
    failureCode: diagnostic.code || diagnostic.reason || "",
    message: diagnostic.message || "",
    observationPath,
    extracted: diagnostic,
  });
}
