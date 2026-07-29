#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGenerationKey,
  createRenderKey,
  hashFileSha256,
} from "../electron/services/video-artifact-fingerprints.mjs";

const tempDir = mkdtempSync(join(tmpdir(), "hermes-fingerprint-"));
const sourcePath = join(tempDir, "source.fixture");
writeFileSync(sourcePath, "same bytes");
const sourceContentHash = hashFileSha256(sourcePath);
assert.match(sourceContentHash, /^[a-f0-9]{64}$/);

const generationA = createGenerationKey({
  profileVersion: 1,
  provider: "google-flow",
  model: "imagen",
  normalizedPrompt: "historical street",
  settings: { quality: "high", aspectRatio: "16:9" },
});
const generationB = createGenerationKey({
  settings: { aspectRatio: "16:9", quality: "high" },
  normalizedPrompt: "historical street",
  model: "imagen",
  provider: "google-flow",
  profileVersion: 1,
});
assert.equal(generationA, generationB, "property insertion order must not change generation keys");
assert.notEqual(generationA, createGenerationKey({
  profileVersion: 1,
  provider: "grok",
  model: "imagen",
  normalizedPrompt: "historical street",
  settings: { quality: "high", aspectRatio: "16:9" },
}));

const renderA = createRenderKey({
  sourceContentHash,
  timelineSlice: { startSeconds: 30, endSeconds: 40 },
  motion: "slow-zoom-in",
  crop: "center",
  overlays: { caption: "first caption" },
  rendererVersion: 1,
});
const renderB = createRenderKey({
  sourceContentHash,
  timelineSlice: { startSeconds: 30, endSeconds: 41 },
  motion: "slow-zoom-in",
  crop: "center",
  overlays: { caption: "first caption" },
  rendererVersion: 1,
});
assert.notEqual(renderA, renderB, "timeline changes must invalidate derived renders");
assert.equal(hashFileSha256(sourcePath), sourceContentHash, "render changes must not affect source content hashes");
assert.throws(
  () => createGenerationKey({
    profileVersion: 1,
    provider: "google-flow",
    model: "imagen",
    normalizedPrompt: "x",
    settings: { sourcePath: "C:\\secret\\source.png" },
  }),
  /FINGERPRINT_INPUT_INVALID/,
);

console.log(JSON.stringify({ ok: true, checked: "video-artifact-fingerprints" }));
