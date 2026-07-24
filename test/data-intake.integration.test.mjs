import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inspectDataFiles } from "../src/data-intake.ts";
import { validateExecutionTargets } from "../src/execution-targets.ts";

test("inspects supported data files without returning raw values", async () => {
  const directory = await mkdtemp(join(tmpdir(), "agent-colloquium-data-"));
  const csvPath = join(directory, "mobility.csv");
  const jsonPath = join(directory, "summary.json");
  await writeFile(csvPath, "thickness_nm,mobility\n5,12.4\n10,8.1\n", "utf8");
  await writeFile(jsonPath, '[{"temperature_c":300,"status":"ok"}]', "utf8");

  const inventory = await inspectDataFiles([csvPath, jsonPath]);

  assert.deepEqual(inventory, [
    { name: "mobility.csv", format: "csv", bytes: 36, rows: 2, columns: ["thickness_nm", "mobility"] },
    { name: "summary.json", format: "json", bytes: 37, rows: 1, columns: ["temperature_c", "status"] },
  ]);
  assert.doesNotMatch(JSON.stringify(inventory), /12\.4|temperature_c":300|agent-colloquium-data/);
});

test("recommends local routing for internal data and requires recorded approval for Codex", async () => {
  const directory = await mkdtemp(join(tmpdir(), "agent-colloquium-data-"));
  const unsupportedPath = join(directory, "raw.xlsx");
  await writeFile(unsupportedPath, "not parsed", "utf8");
  await assert.rejects(() => inspectDataFiles([unsupportedPath]), /unsupported data file extension/);

  assert.throws(
    () => validateExecutionTargets({ dataClassification: "internal", internalDataApproval: "local-only", defaultTarget: "AGENT-COLLOQUIUM:LOCAL-LLM", roleTargets: { "fact-investigator": "codex" } }),
    /internal Codex routing requires explicit codex-approved/
  );
  assert.deepEqual(
    validateExecutionTargets({ dataClassification: "internal", internalDataApproval: "local-only", defaultTarget: "AGENT-COLLOQUIUM:LOCAL-LLM", roleTargets: {} }),
    { dataClassification: "internal", internalDataApproval: "local-only", defaultTarget: "AGENT-COLLOQUIUM:LOCAL-LLM", roleTargets: {} }
  );
  assert.deepEqual(
    validateExecutionTargets({ dataClassification: "internal", internalDataApproval: "codex-approved", defaultTarget: "codex", roleTargets: {} }),
    { dataClassification: "internal", internalDataApproval: "codex-approved", defaultTarget: "codex", roleTargets: {} }
  );
});

test("CLI failures do not expose internal values or absolute paths", async () => {
  const directory = await mkdtemp(join(tmpdir(), "agent-colloquium-secret-data-"));
  const targetsPath = join(directory, "targets.json");
  const malformedPath = join(directory, "private.json");
  const validPath = join(directory, "valid.json");
  await writeFile(targetsPath, '{"dataClassification":"internal","internalDataApproval":"local-only","defaultTarget":"AGENT-COLLOQUIUM:LOCAL-LLM","roleTargets":{}}', "utf8");
  await writeFile(malformedPath, "SECRET-7", "utf8");
  await writeFile(validPath, "{}", "utf8");

  const malformed = inspectCli(targetsPath, malformedPath);
  assert.notEqual(malformed.status, 0);
  assert.match(malformed.stderr, /JSON data is invalid/);
  assert.doesNotMatch(malformed.stderr, /SECRET-7|agent-colloquium-secret-data/);
  assert.doesNotMatch(malformed.stdout, /agent-colloquium-secret-data/);

  const missing = inspectCli(targetsPath, join(directory, "missing.csv"));
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /unable to inspect data file/);
  assert.doesNotMatch(missing.stderr, /agent-colloquium-secret-data/);
  assert.doesNotMatch(missing.stdout, /agent-colloquium-secret-data/);

  await writeFile(targetsPath, "TOP-SECRET", "utf8");
  const malformedTargets = inspectCli(targetsPath, validPath);
  assert.notEqual(malformedTargets.status, 0);
  assert.match(malformedTargets.stderr, /execution targets configuration is invalid/);
  assert.doesNotMatch(malformedTargets.stderr, /TOP-SECRET|agent-colloquium-secret-data/);

  await writeFile(targetsPath, '{"dataClassification":"none","internalDataApproval":"not-applicable","defaultTarget":"codex","roleTargets":{},"/tmp/CLI-SECRET-KEY":true}', "utf8");
  const schemaInvalidTargets = inspectCli(targetsPath, validPath);
  assert.notEqual(schemaInvalidTargets.status, 0);
  assert.match(schemaInvalidTargets.stderr, /execution targets configuration is invalid/);
  assert.doesNotMatch(schemaInvalidTargets.stderr, /CLI-SECRET-KEY|agent-colloquium-secret-data/);

  await writeFile(targetsPath, '{"dataClassification":"none","internalDataApproval":"not-applicable","defaultTarget":"codex","roleTargets":{"/tmp/CLI-SECRET-ROLE":"invalid"}}', "utf8");
  const invalidRoleTargets = inspectCli(targetsPath, validPath);
  assert.notEqual(invalidRoleTargets.status, 0);
  assert.match(invalidRoleTargets.stderr, /execution targets configuration is invalid/);
  assert.doesNotMatch(invalidRoleTargets.stderr, /CLI-SECRET-ROLE|agent-colloquium-secret-data/);
});

function inspectCli(targetsPath, filePath) {
  return spawnSync(
    "pnpm",
    ["--silent", "colloquium:inspect-data", "--", "--targets", targetsPath, "--file", filePath],
    { cwd: new URL("..", import.meta.url).pathname, encoding: "utf8" },
  );
}
