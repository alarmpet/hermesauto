import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const CONTRACT = [
  ["profiles", "scripts/check-video-profile-contract.mjs"],
  ["events", "scripts/check-video-domain-event-contract.mjs"],
  ["inspector", "scripts/check-video-job-inspector-contract.mjs"],
  ["fingerprints", "scripts/check-video-artifact-fingerprints.mjs"],
  ["cli", "scripts/check-hermes-video-cli-contract.mjs"],
  ["skills", "scripts/check-hermes-video-skill-contract.mjs"],
  ["skill-sync", "scripts/check-agent-skill-sync-contract.mjs"],
];
const OFFLINE = [
  ["measured-timeline", "scripts/check-measured-visual-timeline-contract.mjs"],
  ["measured-workflow", "scripts/check-measured-visual-workflow-contract.mjs"],
  ["longform", "scripts/check-longform-production-contract.mjs"],
  ["resume", "scripts/check-longform-scene-resume-contract.mjs"],
];

export function runVideoVerification({
  level = "contract",
  baseline = { entries: [] },
  now = new Date(),
  approvedLive = false,
  execute = executeDescriptor,
} = {}) {
  if (!["contract", "offline-e2e", "live-acceptance"].includes(level)) throw new Error(`VERIFICATION_LEVEL_INVALID: ${level}`);
  if (level === "live-acceptance" && !approvedLive) throw new Error("LIVE_APPROVAL_REQUIRED");
  const descriptors = [...CONTRACT, ...(level === "contract" ? [] : OFFLINE)]
    .map(([id, path]) => ({ id, command: process.execPath, args: [path] }));
  const expired = (baseline.entries || []).filter((entry) => new Date(`${entry.expiresOn}T23:59:59Z`) < now);
  const results = descriptors.map((descriptor) => execute(descriptor));
  const activeBaseline = (baseline.entries || []).filter((entry) => !expired.includes(entry));
  const failureCodes = expired.length ? ["BASELINE_ENTRY_EXPIRED"] : [];
  for (const result of results) {
    for (const code of result.failureCodes || (result.status === 0 ? [] : ["CHECK_FAILED"])) {
      const expected = activeBaseline.some((entry) => entry.scope === result.id && entry.code === code);
      if (!expected) failureCodes.push(code);
    }
  }
  return {
    schemaVersion: 1,
    ok: failureCodes.length === 0,
    level,
    approvedLive,
    results,
    failureCodes: [...new Set(failureCodes)],
    baselineApplied: activeBaseline.length,
    expiredBaselineEntries: expired.map((entry) => entry.code),
  };
}

function executeDescriptor(descriptor) {
  const started = performance.now();
  const result = spawnSync(descriptor.command, descriptor.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  const stdout = tail(result.stdout);
  const stderr = tail(result.stderr);
  return {
    id: descriptor.id,
    status: result.status ?? 1,
    stdout,
    stderr,
    durationMs: Math.round(performance.now() - started),
    failureCodes: result.status === 0 ? [] : extractCodes(stdout, stderr),
  };
}

function tail(value = "", limit = 4000) {
  return String(value).slice(-limit);
}

function extractCodes(stdout, stderr) {
  const found = [...`${stdout}\n${stderr}`.matchAll(/\b[A-Z][A-Z0-9_]{4,}\b/gu)].map((match) => match[0]);
  return found.length ? [...new Set(found)] : ["CHECK_FAILED"];
}

export const verificationRegistry = Object.freeze({ contract: CONTRACT, offline: OFFLINE });
