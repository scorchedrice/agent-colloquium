import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = new URL("..", import.meta.url).pathname;

async function writeProblem(directory, contents) {
  const inputPath = join(directory, "problem.json");
  await writeFile(inputPath, JSON.stringify(contents), "utf8");
  return inputPath;
}

function runCli(inputPath, outputPath, extraArgs = []) {
  return spawnSync(
    "pnpm",
    ["colloquium:run", "--", "--input", inputPath, "--output", outputPath, ...extraArgs],
    { cwd: projectRoot, encoding: "utf8" },
  );
}

test("mock CLI writes a deterministic deliberation artifact and reviewable report", async () => {
  const root = await mkdtemp(join(tmpdir(), "colloquium-cli-"));
  const inputPath = await writeProblem(root, {
    question: "How should a small team evaluate a generic sensor idea?",
    goals: ["produce a safe first experiment plan"],
    constraints: ["no external provider calls"],
  });
  const firstOutput = join(root, "first");
  const secondOutput = join(root, "second");

  const first = runCli(inputPath, firstOutput);
  const second = runCli(inputPath, secondOutput);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstArtifact = await readFile(join(firstOutput, "artifact.json"), "utf8");
  const secondArtifact = await readFile(join(secondOutput, "artifact.json"), "utf8");
  const report = await readFile(join(firstOutput, "report.md"), "utf8");
  const artifact = JSON.parse(firstArtifact);

  assert.equal(firstArtifact, secondArtifact);
  assert.equal(artifact.positions.length, 4);
  assert.ok(artifact.positions.every((position) => position.isIndependent));
  assert.equal(artifact.crossExaminations.length, 4);
  assert.ok(artifact.branchDecisions.some((decision) => decision.status === "needs-evidence"));
  assert.match(report, /## Unresolved disagreement/);
});

test("mock CLI rejects invalid input without writing a completed artifact", async () => {
  const root = await mkdtemp(join(tmpdir(), "colloquium-cli-invalid-"));
  const inputPath = await writeProblem(root, { question: "" });
  const output = join(root, "output");

  const result = runCli(inputPath, output);

  assert.notEqual(result.status, 0);
  await assert.rejects(readFile(join(output, "artifact.json"), "utf8"));
});

test("mock CLI rejects an unrecognized option without writing a completed artifact", async () => {
  const root = await mkdtemp(join(tmpdir(), "colloquium-cli-unrecognized-option-"));
  const inputPath = await writeProblem(root, {
    question: "How should a team evaluate an option parser?",
    goals: ["reject unapproved inputs"],
    constraints: ["mock only"],
  });
  const output = join(root, "output");

  const result = runCli(inputPath, output, ["--unexpected", "ignored"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown option: --unexpected/);
  await assert.rejects(readFile(join(output, "artifact.json"), "utf8"));
});

test("mock CLI rejects a duplicate option without writing a completed artifact", async () => {
  const root = await mkdtemp(join(tmpdir(), "colloquium-cli-duplicate-option-"));
  const inputPath = await writeProblem(root, {
    question: "How should a team evaluate duplicate options?",
    goals: ["make one unambiguous request"],
    constraints: ["mock only"],
  });
  const output = join(root, "output");

  const result = runCli(inputPath, output, ["--provider", "mock", "--provider", "mock"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate option: --provider/);
  await assert.rejects(readFile(join(output, "artifact.json"), "utf8"));
});
