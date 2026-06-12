import { spawn } from "node:child_process";
import { createWebAgentObservation } from "../web-agent-safety.mjs";

function runCommand(command, args = [], { timeoutMs = 10000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ status: 124, stdout, stderr: `${stderr}\nTimed out after ${timeoutMs}ms`.trim() });
    }, timeoutMs);
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ status: 1, stdout, stderr: String(error?.message || error) });
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      resolve({ status: status ?? 1, stdout, stderr });
    });
  });
}

export async function runBrowserUseEngine({
  provider = "",
  task = "",
  engine = "browser-use",
  browserUseCommand = "python",
  noSpend = true,
} = {}) {
  const probe = await runCommand(browserUseCommand, ["-c", "import browser_use; print('browser-use-ok')"]);
  if (probe.status !== 0) {
    return createWebAgentObservation({
      engine,
      provider,
      task,
      ok: false,
      failureCode: "BROWSER_USE_NOT_AVAILABLE",
      message: "Browser Use is not installed or cannot be imported. Hermes will keep deterministic provider automation available.",
      extracted: { stdout: probe.stdout, stderr: probe.stderr },
      actionPolicy: { noSpend },
    });
  }
  return createWebAgentObservation({
    engine,
    provider,
    task,
    ok: false,
    failureCode: "BROWSER_USE_MANUAL_INTEGRATION_REQUIRED",
    message: "Browser Use is available but Hermes has not enabled autonomous provider actions.",
    extracted: { stdout: probe.stdout },
    actionPolicy: { noSpend },
  });
}
