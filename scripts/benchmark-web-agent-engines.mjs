#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createWebAgentTelemetryEvent } from "../automation/web-agent-telemetry.mjs";
import { runWebAgentEngine } from "../automation/web-agent-engines/router.mjs";

const engines = ["webwright", "stagehand", "browser-use", "computer-use"];
const events = [];
const jobDir = await mkdtemp(join(tmpdir(), "hermes-web-agent-benchmark-"));

for (const engine of engines) {
  const startedAt = Date.now();
  const result = await runWebAgentEngine({
    preferred: engine,
    fallback: engine,
    provider: "fixture",
    task: "observe fixture provider state",
    jobDir,
    config: { webwrightDiagnosticsEnabled: false },
  });
  const event = createWebAgentTelemetryEvent({
    provider: "fixture",
    engine,
    task: "observe fixture provider state",
    startedAt,
    endedAt: Date.now(),
    success: Boolean(result.ok),
    failureCode: result.failureCode || result.extracted?.code || "",
    observationPath: result.observationPath || "",
    mediaAccepted: result.mediaAccepted,
    costUnits: 0,
    manualInterventionRequired: !result.ok,
  });
  assert.equal(event.type, "web-agent-telemetry");
  assert.equal(event.mediaAccepted, false);
  assert.equal(event.costUnits, 0);
  events.push(event);
}

assert.equal(events.length, engines.length);
assert.deepEqual(events.map((event) => event.engine), engines);

console.log(JSON.stringify({ ok: true, checked: "web-agent-engine-benchmark-contract", events }, null, 2));
