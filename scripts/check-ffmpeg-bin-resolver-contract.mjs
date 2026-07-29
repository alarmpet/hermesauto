#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { resolveFfmpegBin } from "../electron/services/ffmpeg-bin-resolver.mjs";

const previousPath = process.env.PATH;
const previousFfmpegPath = process.env.FFMPEG_PATH;
process.env.PATH = "";
delete process.env.FFMPEG_PATH;

try {
  assert.equal(
    resolve(resolveFfmpegBin()),
    resolve(ffmpegPath),
    "resolver must discover this checkout's ffmpeg-static binary without machine-specific paths",
  );
} finally {
  process.env.PATH = previousPath;
  if (previousFfmpegPath === undefined) delete process.env.FFMPEG_PATH;
  else process.env.FFMPEG_PATH = previousFfmpegPath;
}

console.log(JSON.stringify({ ok: true, checked: "ffmpeg-bin-resolver-contract" }));
