import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PROFILE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function listVideoProfiles({ rootDir = ROOT } = {}) {
  const profileDir = resolve(rootDir, "config", "video-profiles");
  if (!existsSync(profileDir)) return [];
  return readdirSync(profileDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "profile-schema.v1.json")
    .map((entry) => {
      const path = join(profileDir, entry.name);
      const profile = readJson(path);
      return { id: profile.id, schemaVersion: profile.schemaVersion, path };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function loadVideoProfile(profileId, { rootDir = ROOT } = {}) {
  const id = String(profileId || "");
  if (!PROFILE_ID_PATTERN.test(id)) throw profileError("PROFILE_ID_INVALID", id);
  const profileDir = resolve(rootDir, "config", "video-profiles");
  const profilePath = resolve(profileDir, `${id}.json`);
  if (dirname(profilePath) !== profileDir) throw profileError("PROFILE_ID_INVALID", id);
  if (!existsSync(profilePath)) throw profileError("PROFILE_NOT_FOUND", id);
  const profile = readJson(profilePath);
  const validation = validateVideoProfile(profile);
  if (!validation.ok) {
    const error = profileError("PROFILE_SCHEMA_INVALID", id);
    error.details = validation.errors;
    throw error;
  }
  return profile;
}

export function validateVideoProfile(profile) {
  const errors = [];
  const add = (path, code, message) => errors.push({ path, code, message });
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    add("/", "TYPE", "profile must be an object");
    return { ok: false, errors };
  }
  if (profile.schemaVersion !== 1) add("/schemaVersion", "CONST", "schemaVersion must equal 1");
  if (!PROFILE_ID_PATTERN.test(String(profile.id || ""))) add("/id", "PATTERN", "id must use lowercase kebab-case");
  if (!(Number(profile.durationSeconds) > 0)) add("/durationSeconds", "RANGE", "durationSeconds must be greater than zero");
  if (!["16:9", "9:16"].includes(profile.aspectRatio)) add("/aspectRatio", "ENUM", "unsupported aspect ratio");
  if (!["capcut-editable", "hermes-render"].includes(profile.deliveryMode)) add("/deliveryMode", "ENUM", "unsupported delivery mode");

  const intro = profile.intro || {};
  if (!Number.isInteger(intro.clipCount) || intro.clipCount < 0) add("/intro/clipCount", "RANGE", "clipCount must be a non-negative integer");
  if (!(Number(intro.clipSeconds) >= 0)) add("/intro/clipSeconds", "RANGE", "clipSeconds must be non-negative");
  if (!(Number(intro.totalSeconds) >= 0)) add("/intro/totalSeconds", "RANGE", "totalSeconds must be non-negative");
  if (Number(intro.clipCount) * Number(intro.clipSeconds) !== Number(intro.totalSeconds)) {
    add("/intro/totalSeconds", "INTRO_TOTAL_MISMATCH", "totalSeconds must equal clipCount * clipSeconds");
  }

  const early = validatePacingRange(profile.visualPacing?.early, "/visualPacing/early", add);
  const deep = validatePacingRange(profile.visualPacing?.deep, "/visualPacing/deep", add);
  if (early && Number(early.start) !== Number(intro.totalSeconds)) {
    add("/visualPacing/early/start", "BOUNDARY_MISMATCH", "early pacing must start when intro ends");
  }
  if (early && deep && Number(early.end) !== Number(deep.start)) {
    add("/visualPacing/deep/start", "BOUNDARY_MISMATCH", "deep pacing must start when early pacing ends");
  }
  if (deep && Number(deep.end) !== Number(profile.durationSeconds)) {
    add("/visualPacing/deep/end", "BOUNDARY_MISMATCH", "deep pacing must end at profile duration");
  }

  if (!profile.tts?.engine) add("/tts/engine", "REQUIRED", "tts engine is required");
  if (!profile.tts?.voice) add("/tts/voice", "REQUIRED", "tts voice is required");
  if (!(Number(profile.tts?.speed) > 0)) add("/tts/speed", "RANGE", "tts speed must be greater than zero");
  if (!Number.isInteger(profile.captions?.maxCharactersPerLine) || profile.captions.maxCharactersPerLine < 1) {
    add("/captions/maxCharactersPerLine", "RANGE", "caption line limit must be a positive integer");
  }
  if (profile.cachePolicy?.sourceHash !== "sha256") add("/cachePolicy/sourceHash", "CONST", "sourceHash must be sha256");
  if (!Number.isInteger(profile.cachePolicy?.maxSourceReuse) || profile.cachePolicy.maxSourceReuse < 1) {
    add("/cachePolicy/maxSourceReuse", "RANGE", "maxSourceReuse must be a positive integer");
  }
  if (typeof profile.requiresMeasuredTimeline !== "boolean") {
    add("/requiresMeasuredTimeline", "TYPE", "requiresMeasuredTimeline must be boolean");
  }
  return { ok: errors.length === 0, errors };
}

function validatePacingRange(range, path, add) {
  if (!range || typeof range !== "object") {
    add(path, "REQUIRED", "pacing range is required");
    return null;
  }
  const { start, end, min, target, max } = range;
  if (!(Number(start) >= 0 && Number(end) > Number(start))) add(path, "RANGE", "pacing end must be greater than start");
  if (!(Number(min) > 0 && Number(min) <= Number(target) && Number(target) <= Number(max))) {
    add(path, "PACING_ORDER_INVALID", "pacing must satisfy 0 < min <= target <= max");
  }
  return range;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (cause) {
    const error = profileError("PROFILE_JSON_INVALID", path);
    error.cause = cause;
    throw error;
  }
}

function profileError(code, value) {
  const error = new Error(`${code}: ${value}`);
  error.code = code;
  return error;
}
