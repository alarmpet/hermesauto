#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncAgentSkills } from "./sync-agent-skills.mjs";

const root = await mkdtemp(join(tmpdir(), "hermes-skill-sync-"));
const sourceDir = join(root, "source");
const outputDir = join(root, "generated");
await mkdir(join(sourceDir, "sample"), { recursive: true });
await writeFile(join(sourceDir, "sample", "SKILL.md"), "---\nname: sample\ndescription: Use when testing.\n---\n# Sample\n");

const result = await syncAgentSkills({
  repositoryRoot: root,
  sourceDir,
  targets: { codex: join(outputDir, "codex"), claude: join(outputDir, "claude") },
  commitSha: "abc123",
});
assert.equal(result.ok, true);
assert.equal(result.filesCopied, 2);
const manifest = JSON.parse(await readFile(join(outputDir, "codex", "skill-sync-manifest.json"), "utf8"));
assert.equal(manifest.canonicalCommit, "abc123");
assert.match(manifest.files["sample/SKILL.md"], /^[a-f0-9]{64}$/u);

const dryDir = join(root, "dry");
const dry = await syncAgentSkills({ repositoryRoot: root, sourceDir, targets: { dry: dryDir }, dryRun: true, commitSha: "abc123" });
assert.equal(dry.filesCopied, 1);
await assert.rejects(() => readFile(join(dryDir, "sample", "SKILL.md")), /ENOENT/u);

await writeFile(join(outputDir, "codex", "sample", "SKILL.md"), "edited");
const checked = await syncAgentSkills({
  repositoryRoot: root,
  sourceDir,
  targets: { codex: join(outputDir, "codex") },
  check: true,
  commitSha: "abc123",
});
assert.equal(checked.ok, false);
assert.ok(checked.mismatches.includes("codex:sample/SKILL.md"));

await assert.rejects(
  () => syncAgentSkills({ repositoryRoot: root, sourceDir: join(root, ".."), targets: { bad: outputDir } }),
  /SOURCE_OUTSIDE_REPOSITORY|SOURCE_PATH_INVALID/u,
);

console.log(JSON.stringify({ ok: true, checked: "agent-skill-sync-contract" }));
