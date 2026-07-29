import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inspectVideoJob } from "../../scripts/lib/video-job-inspector.mjs";
import { listVideoProfiles, loadVideoProfile } from "../../scripts/lib/video-profile-loader.mjs";
import { normalizeVideoEvent } from "./video-domain-events.mjs";

export function createVideoOperationService({
  emit = () => {},
  dependencies = {},
} = {}) {
  const activeWrites = new Set();
  const emitEvent = (event) => emit(normalizeVideoEvent(event));

  return {
    async profiles({ profileId = "" } = {}) {
      const artifacts = profileId ? [loadVideoProfile(profileId)] : listVideoProfiles();
      return envelope("profiles list", { artifacts });
    },

    async inspect({ jobDir } = {}) {
      const inspection = await inspectVideoJob(jobDir, dependencies);
      return envelope("inspect", inspection);
    },

    async createJob({ input, profileId = "" } = {}) {
      const createJobImpl = dependencies.createJob;
      if (typeof createJobImpl !== "function") throw operationError("OPERATION_NOT_CONFIGURED", "createJob");
      const profile = profileId ? loadVideoProfile(profileId) : null;
      return runWrite("job create", input?.jobDir || input?.id || "new-job", async () => {
        const result = await createJobImpl(input, { profile, emit: emitEvent });
        return envelope("job create", normalizeResult(result));
      });
    },

    async run({ jobDir, until = "" } = {}) {
      return callWriteDependency("run", jobDir, { jobDir, until, emit: emitEvent });
    },

    async resume({ jobDir, stage = "" } = {}) {
      return callWriteDependency("resume", jobDir, { jobDir, stage, emit: emitEvent });
    },

    async verify({ jobDir, level = "contract", approvedLive = false } = {}) {
      const verifyImpl = dependencies.verify;
      if (typeof verifyImpl !== "function") {
        const inspection = await inspectVideoJob(jobDir, dependencies);
        return envelope("verify", {
          ...inspection,
          level,
          failureCodes: inspection.failureCodes,
          nextActions: inspection.nextActions,
        });
      }
      const result = await verifyImpl({ jobDir, level, approvedLive, emit: emitEvent });
      return envelope("verify", normalizeResult(result));
    },

    async report({ jobDir, format = "json" } = {}) {
      const inspection = await inspectVideoJob(jobDir, dependencies);
      if (format === "markdown") {
        return envelope("report", {
          ...inspection,
          markdown: renderInspectionMarkdown(inspection),
        });
      }
      return envelope("report", inspection);
    },

    async readInput(path) {
      return JSON.parse(await readFile(resolve(path), "utf8"));
    },
  };

  async function callWriteDependency(name, jobDir, args) {
    const implementation = dependencies[name];
    if (typeof implementation !== "function") throw operationError("OPERATION_NOT_CONFIGURED", name);
    return runWrite(name, jobDir, async () => envelope(name, normalizeResult(await implementation(args))));
  }

  async function runWrite(command, lockTarget, operation) {
    const lockKey = resolve(String(lockTarget || "."));
    if (activeWrites.has(lockKey)) throw operationError("JOB_OPERATION_ALREADY_RUNNING", lockKey);
    activeWrites.add(lockKey);
    try {
      return await operation();
    } finally {
      activeWrites.delete(lockKey);
    }
  }
}

export function envelope(command, value = {}) {
  return {
    schemaVersion: 1,
    ok: value.ok !== false,
    command,
    jobId: String(value.jobId || value.job?.id || ""),
    state: String(value.state || ""),
    artifacts: Array.isArray(value.artifacts) ? value.artifacts : [],
    failureCodes: Array.isArray(value.failureCodes) ? [...new Set(value.failureCodes)] : [],
    nextActions: Array.isArray(value.nextActions) ? value.nextActions : [],
    ...value,
  };
}

function normalizeResult(result) {
  if (!result || typeof result !== "object") return { result };
  return result;
}

function renderInspectionMarkdown(inspection) {
  return [
    `# Hermes Video Job ${inspection.jobId || ""}`.trim(),
    "",
    `- State: ${inspection.state}`,
    `- Profile: ${inspection.profileId || "none"}`,
    `- Failures: ${inspection.failureCodes.join(", ") || "none"}`,
    `- Resume from: ${inspection.resumeFrom || "none"}`,
  ].join("\n");
}

function operationError(code, value) {
  const error = new Error(`${code}: ${value}`);
  error.code = code;
  return error;
}
