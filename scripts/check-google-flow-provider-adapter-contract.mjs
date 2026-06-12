#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createGoogleFlowProviderAdapter, GoogleFlowProviderAdapter } from "../automation/google-flow-provider-adapter.mjs";

const adapter = createGoogleFlowProviderAdapter({
  session: {
    page: {
      url() {
        return "https://labs.google/fx/tools/flow";
      },
      locator() {
        return {
          async textContent() {
            return "fixture Flow page text";
          },
        };
      },
      async screenshot() {},
    },
    async getAuthCookies(urls) {
      return urls.map((url) => ({ name: "fixture", value: "secret", url }));
    },
  },
});

assert.ok(adapter instanceof GoogleFlowProviderAdapter);
for (const method of [
  "configureSettings",
  "verifySettings",
  "uploadIngredients",
  "focusPrompt",
  "fillPrompt",
  "submitGeneration",
  "handleConfirmation",
  "waitForMedia",
  "getAuthCookies",
  "downloadMedia",
  "generateMedia",
  "writeEvidence",
  "classifyFailure",
  "inspectWithWebAgent",
]) {
  assert.equal(typeof adapter[method], "function", `adapter should expose ${method}`);
}

const settings = await adapter.configureSettings();
assert.equal(settings.providerOrigin, "web-ui");
assert.equal(settings.ok, false);

const cookies = await adapter.getAuthCookies(["https://labs.google"]);
assert.equal(cookies.length, 1);

const downloaded = await adapter.downloadMedia({
  mediaUrl: "https://example.test/asset.png",
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    headers: new Map([["content-type", "image/png"]]),
    async arrayBuffer() {
      return new Uint8Array([9, 8, 7]).buffer;
    },
  }),
});
assert.equal(downloaded.contentType, "image/png");
assert.equal(downloaded.buffer.length, 3);

const evidenceDir = await mkdtemp(join(tmpdir(), "hermes-flow-adapter-evidence-"));
const evidence = await adapter.writeEvidence({
  jobDir: evidenceDir,
  sceneOrder: 3,
  label: "submit_failed",
  extra: { failureCode: "FLOW_SUBMIT_DID_NOT_START" },
});
assert.match(evidence.screenshotPath, /scene_3_google-flow_submit_failed\.png$/);
assert.match(evidence.snapshotPath, /scene_3_google-flow_submit_failed_snapshot\.json$/);
const snapshot = JSON.parse(await readFile(evidence.snapshotPath, "utf8"));
assert.equal(snapshot.text, "fixture Flow page text");
assert.equal(snapshot.extra.failureCode, "FLOW_SUBMIT_DID_NOT_START");

const evidenceFailure = await createGoogleFlowProviderAdapter().writeEvidence({
  jobDir: evidenceDir,
  sceneOrder: 4,
});
assert.equal(evidenceFailure.ok, false);
assert.equal(evidenceFailure.providerOrigin, "web-ui");
assert.equal(evidenceFailure.failureCode, "GOOGLE_FLOW_PROVIDER_SESSION_REQUIRED");

const classified = await adapter.classifyFailure({
  text: "너무 빨리 요청하고 있습니다. 잠시 후 다시 시도하세요.",
});
assert.equal(classified.failureCode, "FLOW_RATE_LIMITED");
assert.equal(classified.actionRequired, true);
assert.equal(classified.retryable, false);

let directInput = null;
const bridged = await adapter.generateMedia({
  prompt: "fixture prompt",
  outputMode: "image",
  directGenerate: async (input) => {
    directInput = input;
    return { path: "scene_1.png", contentType: "image/png", bytes: 123 };
  },
});
assert.equal(bridged.providerAdapter, "google-flow");
assert.equal(bridged.providerAdapterMode, "direct-bridge");
assert.equal(directInput.prompt, "fixture prompt");
assert.equal(directInput.directGenerate, undefined);

await assert.rejects(
  () => adapter.handleConfirmation({ action: "승인 15 credits", url: "https://labs.google/fx/tools/flow" }),
  /WEB_AGENT_HIGH_IMPACT_ACTION_BLOCKED|WEB_AGENT_SPEND_ACTION_BLOCKED/,
);

const observation = await adapter.inspectWithWebAgent();
assert.equal(observation.type, "web-agent-observation");
assert.equal(observation.mediaAccepted, false);

console.log(JSON.stringify({ ok: true, checked: "google-flow-provider-adapter-contract" }));
