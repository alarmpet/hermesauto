#!/usr/bin/env node
import { createVideoOperationService, envelope } from "../electron/services/video-operation-service.mjs";

const args = process.argv.slice(2);
const jsonStream = args.includes("--json-stream");
const service = createVideoOperationService({
  emit: (event) => {
    if (jsonStream) process.stdout.write(`${JSON.stringify(event)}\n`);
  },
});

try {
  const result = await execute(args.filter((arg) => !["--json", "--json-stream"].includes(arg)));
  writeResult(result, 0);
} catch (error) {
  const code = error.code || "OPERATION_FAILED";
  const result = envelope(args.slice(0, 2).join(" "), {
    ok: false,
    failureCodes: [code],
    error: error.message,
  });
  writeResult(result, code === "COMMAND_INVALID" ? 2 : 1);
}

async function execute(cleanArgs) {
  const [command, subcommand] = cleanArgs;
  if (command === "profiles" && subcommand === "list") return service.profiles();
  if (command === "inspect" && subcommand) return service.inspect({ jobDir: subcommand });
  if (command === "report" && subcommand) {
    return service.report({ jobDir: subcommand, format: option(cleanArgs, "--format") || "json" });
  }
  if (command === "verify" && subcommand) {
    return service.verify({
      jobDir: subcommand,
      level: option(cleanArgs, "--level") || "contract",
      approvedLive: cleanArgs.includes("--approved-live"),
    });
  }
  if (command === "job" && subcommand === "create") {
    const inputPath = option(cleanArgs, "--input");
    if (!inputPath) throw cliError("INPUT_PATH_REQUIRED");
    return service.createJob({
      input: await service.readInput(inputPath),
      profileId: option(cleanArgs, "--profile"),
    });
  }
  if (command === "run" && subcommand) {
    return service.run({ jobDir: subcommand, until: option(cleanArgs, "--until") });
  }
  if (command === "resume" && subcommand) {
    return service.resume({ jobDir: subcommand, stage: option(cleanArgs, "--stage") });
  }
  throw cliError("COMMAND_INVALID");
}

function option(values, name) {
  const index = values.indexOf(name);
  return index >= 0 ? values[index + 1] || "" : "";
}

function writeResult(result, exitCode) {
  const payload = jsonStream ? { type: "result", ...result } : result;
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exitCode = exitCode;
}

function cliError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}
