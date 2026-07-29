#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const scenarios = [
  {
    scenario: "create-capcut-job",
    baseline: ["youtube-workflow.mjs", "electron/services/youtube-job-service.mjs"],
    skill: [".agents/skills/hermes-video-router/SKILL.md", ".agents/skills/creating-hermes-video-job/SKILL.md"],
  },
  {
    scenario: "resume-partial-media",
    baseline: ["youtube-workflow.mjs", "electron/services/image-scene-renderer.mjs"],
    skill: [".agents/skills/hermes-video-router/SKILL.md", ".agents/skills/resuming-hermes-video-job/SKILL.md"],
  },
  {
    scenario: "diagnose-hash-mismatch",
    baseline: ["youtube-workflow.mjs", "electron/services/video-artifact-fingerprints.mjs"],
    skill: [".agents/skills/hermes-video-router/SKILL.md", ".agents/skills/validating-hermes-video/SKILL.md"],
  },
  {
    scenario: "validate-capcut-handoff",
    baseline: ["scripts/analyze-youtube-output.mjs", "youtube-workflow.mjs"],
    skill: [".agents/skills/hermes-video-router/SKILL.md", ".agents/skills/validating-hermes-video/SKILL.md"],
  },
];

const results = [];
for (const item of scenarios) {
  const baselineCharacters = await sumCharacters(item.baseline);
  const skillCharacters = await sumCharacters(item.skill);
  const cliOutputCharacters = 800;
  const baselineTokens = estimateTokens(baselineCharacters);
  const skillTokens = estimateTokens(skillCharacters + cliOutputCharacters);
  const reductionRatio = Number((1 - skillTokens / baselineTokens).toFixed(4));
  results.push({
    scenario: item.scenario,
    tokenMeasurement: "estimated",
    tokenizer: "documented UTF-8 character heuristic: ceil(characters/4)",
    baselineCharacters,
    skillCharacters,
    cliOutputCharacters,
    baselineTokens,
    skillTokens,
    reductionRatio,
    success: reductionRatio >= 0.5,
  });
}
const medianReduction = median(results.map((item) => item.reductionRatio));
const report = {
  schemaVersion: 1,
  tokenMeasurement: "estimated",
  targetReduction: 0.5,
  medianReduction,
  targetMet: medianReduction >= 0.5,
  results,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = results.every((item) => item.success) ? 0 : 1;

async function sumCharacters(paths) {
  const sources = await Promise.all(paths.map((path) => readFile(path, "utf8")));
  return sources.reduce((sum, source) => sum + source.length, 0);
}

function estimateTokens(characters) {
  return Math.ceil(characters / 4);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return Number(((sorted[1] + sorted[2]) / 2).toFixed(4));
}
