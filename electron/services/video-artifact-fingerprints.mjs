import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";

export function hashFileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function createGenerationKey({
  profileVersion,
  provider,
  model,
  normalizedPrompt,
  settings = {},
} = {}) {
  return hashCanonical({
    fingerprintVersion: 1,
    profileVersion,
    provider,
    model,
    normalizedPrompt,
    settings,
  });
}

export function createRenderKey({
  sourceContentHash,
  timelineSlice,
  motion,
  crop,
  overlays = {},
  rendererVersion,
} = {}) {
  return hashCanonical({
    fingerprintVersion: 1,
    sourceContentHash,
    timelineSlice,
    motion,
    crop,
    overlays,
    rendererVersion,
  });
}

function hashCanonical(value) {
  assertFingerprintSafe(value);
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function assertFingerprintSafe(value, path = "") {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    throw fingerprintError(path);
  }
  if (typeof value === "string") {
    if (isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value)) throw fingerprintError(path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFingerprintSafe(item, `${path}/${index}`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (/secret|token|password|api.?key/i.test(key)) throw fingerprintError(`${path}/${key}`);
      assertFingerprintSafe(item, `${path}/${key}`);
    }
  }
}

function fingerprintError(path) {
  const error = new Error(`FINGERPRINT_INPUT_INVALID: ${path || "/"}`);
  error.code = "FINGERPRINT_INPUT_INVALID";
  return error;
}
