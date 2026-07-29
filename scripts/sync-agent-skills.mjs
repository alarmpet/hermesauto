#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export async function syncAgentSkills({
  repositoryRoot = process.cwd(),
  sourceDir = resolve(repositoryRoot, ".agents", "skills"),
  targets,
  dryRun = false,
  check = false,
  commitSha = "",
} = {}) {
  const root = resolve(repositoryRoot);
  const source = assertContained(root, sourceDir, "SOURCE_OUTSIDE_REPOSITORY");
  const files = await collectFiles(source);
  const hashes = Object.fromEntries(await Promise.all(files.map(async (path) => {
    const relativePath = relative(source, path).replaceAll("\\", "/");
    return [relativePath, sha256(await readFile(path))];
  })));
  const canonicalCommit = commitSha || currentCommit(root);
  const mismatches = [];
  let filesCopied = 0;

  for (const [targetName, configuredTarget] of Object.entries(targets || {})) {
    const targetRoot = assertContained(root, configuredTarget, "TARGET_OUTSIDE_REPOSITORY");
    for (const sourcePath of files) {
      const relativePath = relative(source, sourcePath).replaceAll("\\", "/");
      const destination = assertContained(targetRoot, resolve(targetRoot, relativePath), "TARGET_PATH_INVALID");
      const content = await readFile(sourcePath);
      filesCopied += 1;
      if (check) {
        const actual = await readFile(destination).catch(() => null);
        if (!actual || sha256(actual) !== hashes[relativePath]) mismatches.push(`${targetName}:${relativePath}`);
      } else if (!dryRun) {
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, content);
      }
    }
    const manifest = { schemaVersion: 1, target: targetName, canonicalCommit, files: hashes };
    const manifestPath = resolve(targetRoot, "skill-sync-manifest.json");
    if (check) {
      const actualManifest = JSON.parse(await readFile(manifestPath, "utf8").catch(() => "{}"));
      if (actualManifest.canonicalCommit !== canonicalCommit) mismatches.push(`${targetName}:canonicalCommit`);
    } else if (!dryRun) {
      await mkdir(targetRoot, { recursive: true });
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  }
  return { schemaVersion: 1, ok: mismatches.length === 0, filesCopied, mismatches, canonicalCommit };
}

async function collectFiles(root) {
  const result = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) throw new Error(`SYMLINK_NOT_ALLOWED: ${path}`);
      if (stat.isDirectory()) await visit(path);
      else if (stat.isFile()) result.push(path);
    }
  }
  await visit(root);
  return result.sort();
}

function assertContained(root, candidate, code) {
  const resolved = resolve(candidate);
  const pathFromRoot = relative(root, resolved);
  if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) throw new Error(`${code}: ${resolved}`);
  return resolved;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function currentCommit(cwd) {
  return spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8", windowsHide: true }).stdout.trim() || "unknown";
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(await readFile(resolve(".agent-skill-targets.json"), "utf8"));
  const selected = option("--target") || "all";
  const targetEntries = Object.entries(config.targets)
    .filter(([name]) => selected === "all" || name === selected)
    .map(([name, path]) => [name, resolve(path)]);
  if (targetEntries.length === 0) {
    process.stderr.write(`Unknown target: ${selected}\n`);
    process.exitCode = 2;
  } else {
    const result = await syncAgentSkills({
      targets: Object.fromEntries(targetEntries),
      dryRun: process.argv.includes("--dry-run"),
      check: process.argv.includes("--check"),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.ok) process.exitCode = 1;
  }
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}
