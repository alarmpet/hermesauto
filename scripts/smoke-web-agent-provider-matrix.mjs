#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createGoogleFlowProviderAdapter } from "../automation/google-flow-provider-adapter.mjs";
import { runWebAgentEngine } from "../automation/web-agent-engines/router.mjs";

const engines = ["webwright", "stagehand", "browser-use", "computer-use"];
const jobDir = await mkdtemp(join(tmpdir(), "hermes-web-agent-matrix-"));
const adapter = createGoogleFlowProviderAdapter({
  webAgentInspector: (options) => runWebAgentEngine({
    preferred: options.engine || "stagehand",
    fallback: "webwright",
    provider: "google-flow",
    task: "inspect smoke provider",
    jobDir,
    config: { webwrightDiagnosticsEnabled: false },
  }),
});

for (const engine of engines) {
  const observation = await adapter.inspectWithWebAgent({ engine });
  assert.equal(observation.type, "web-agent-observation");
  assert.equal(observation.mediaAccepted, false);
}

console.log(JSON.stringify({ ok: true, checked: "web-agent-provider-matrix" }));
