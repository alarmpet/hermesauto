#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const run = (...args) => spawnSync(process.execPath, ["scripts/hermes-video.mjs", ...args], {
  cwd: process.cwd(),
  encoding: "utf8",
  windowsHide: true,
});

const profiles = run("profiles", "list", "--json");
assert.equal(profiles.status, 0, profiles.stderr);
assert.doesNotMatch(profiles.stdout, /\x1b\[/u);
const profileResult = JSON.parse(profiles.stdout);
assert.equal(profileResult.schemaVersion, 1);
assert.equal(profileResult.ok, true);
assert.equal(profileResult.command, "profiles list");
assert.ok(profileResult.artifacts.some((item) => item.id === "history-longform-capcut-15m-v1"));

const invalid = run("unknown", "--json");
assert.equal(invalid.status, 2);
const invalidResult = JSON.parse(invalid.stdout);
assert.equal(invalidResult.ok, false);
assert.deepEqual(invalidResult.failureCodes, ["COMMAND_INVALID"]);

const stream = run("profiles", "list", "--json-stream");
assert.equal(stream.status, 0, stream.stderr);
const streamLines = stream.stdout.trim().split(/\r?\n/u).map((line) => JSON.parse(line));
assert.equal(streamLines.at(-1).type, "result");
assert.equal(streamLines.at(-1).ok, true);

const electronMain = readFileSync("electron/main.mjs", "utf8");
assert.match(electronMain, /createVideoOperationService/u);
assert.match(electronMain, /videoOperations\.createJob/u);
assert.doesNotMatch(electronMain, /spawn(?:Sync)?\([^)]*hermes-video/u);

console.log(JSON.stringify({ ok: true, checked: "hermes-video-cli-contract" }));
