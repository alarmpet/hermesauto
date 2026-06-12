#!/usr/bin/env node
import assert from "node:assert/strict";
import { createGoogleFlowProviderAdapter } from "../automation/google-flow-provider-adapter.mjs";

let received = null;
const adapter = createGoogleFlowProviderAdapter({
  directGenerate: async (input) => {
    received = input;
    return {
      outputMode: input.outputMode,
      path: "C:/tmp/scene_1.png",
      contentType: "image/png",
      bytes: 1024,
      evidence: { source: "fixture" },
    };
  },
});

const result = await adapter.generateMedia({
  prompt: "scene prompt",
  outputMode: "image",
  sceneOrder: 1,
  jobOptions: { rejectPaidFlowCredits: true },
  directGenerate: undefined,
});

assert.equal(received.prompt, "scene prompt");
assert.equal(received.sceneOrder, 1);
assert.equal(received.outputMode, "image");
assert.equal(received.jobOptions.rejectPaidFlowCredits, true);
assert.equal(Object.hasOwn(received, "directGenerate"), false);
assert.equal(result.providerAdapter, "google-flow");
assert.equal(result.providerAdapterMode, "direct-bridge");
assert.equal(result.outputMode, "image");

const missing = await createGoogleFlowProviderAdapter().generateMedia({ sceneOrder: 7 });
assert.equal(missing.ok, false);
assert.equal(missing.providerOrigin, "web-ui");
assert.equal(missing.failureCode, "GOOGLE_FLOW_DIRECT_GENERATOR_REQUIRED");

console.log(JSON.stringify({ ok: true, checked: "provider-adapter-direct-bridge-contract" }));
