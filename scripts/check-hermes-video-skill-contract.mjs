#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const skills = [
  "hermes-video-router",
  "creating-hermes-video-job",
  "generating-hermes-draft",
  "generating-hermes-media",
  "assembling-hermes-capcut",
  "resuming-hermes-video-job",
  "validating-hermes-video",
];

for (const name of skills) {
  const path = join(".agents", "skills", name, "SKILL.md");
  assert.equal(existsSync(path), true, `missing ${path}`);
  const source = readFileSync(path, "utf8");
  const match = source.match(/^---\r?\nname:\s*([^\r\n]+)\r?\ndescription:\s*([^\r\n]+)\r?\n---/u);
  assert.ok(match, `${name}: invalid frontmatter`);
  assert.equal(match[1].trim(), name, `${name}: folder/name mismatch`);
  assert.match(match[2], /^Use when/u, `${name}: description must start with Use when`);
  assert.ok(match[2].length <= 500, `${name}: description too long`);
  const words = source.replace(/^---[\s\S]*?---/u, "").trim().split(/\s+/u).filter(Boolean);
  assert.ok(words.length <= (name === "hermes-video-router" ? 200 : 500), `${name}: body too large`);
  assert.doesNotMatch(source, /(?:sk-[A-Za-z0-9]{12,}|api[_-]?key\s*[:=]\s*\S+)/iu, `${name}: possible secret`);
}

const router = readFileSync(".agents/skills/hermes-video-router/SKILL.md", "utf8");
for (const expected of [
  "inspect",
  "creating-hermes-video-job",
  "resuming-hermes-video-job",
  "validating-hermes-video",
  "generating-hermes-media",
]) {
  assert.match(router, new RegExp(expected, "u"), `router missing ${expected}`);
}
assert.equal(existsSync(".agents/skills/hermes-video-router/references/intent-map.md"), true);
assert.equal(existsSync(".agents/rules/hermes-video-safety.md"), true);
assert.match(readFileSync("AGENTS.md", "utf8"), /hermes-video-router/u);

console.log(JSON.stringify({ ok: true, checked: "hermes-video-skill-contract", skills: skills.length }));
