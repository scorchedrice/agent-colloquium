import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exampleDirectory = path.join(rootDirectory, "examples", "igzo-thickness-masters-decision");
const mockWalkthroughPath = path.join(rootDirectory, "docs", "codex-mock-engine-walkthrough.md");
const requiredFiles = ["conversation.md", "result.md"];

async function readExample(name) {
  return readFile(path.join(exampleDirectory, name), "utf8");
}

test("the public IGZO example records the complete bounded deliberation in chronological order", async () => {
  const files = (await readdir(exampleDirectory)).sort();
  assert.deepEqual(files, requiredFiles);

  const [conversation, result] = await Promise.all(requiredFiles.map(readExample));
  const readme = await readFile(path.join(rootDirectory, "README.md"), "utf8");
  const exampleText = `${conversation}\n${result}`;

  const stages = [
    /initial user question/i,
    /assistant.*missing practical constraints/i,
    /user response/i,
    /assistant.*run directory/i,
    /independent role outcomes/i,
    /cross-examination/i,
    /fresh synthesis/i
  ];
  let previousStage = -1;
  for (const stage of stages) {
    const stageIndex = conversation.search(stage);
    assert.notEqual(stageIndex, -1, `missing chronology stage: ${stage}`);
    assert.ok(stageIndex > previousStage, `out-of-order chronology stage: ${stage}`);
    previousStage = stageIndex;
  }

  assert.match(conversation, /undergraduate/i);
  assert.match(conversation, /IGZO/i);
  assert.match(conversation, /oxygen.*influence.*mobility/i);
  assert.match(conversation, /mobility.*degrade.*above.*below.*optimal channel thickness/i);
  assert.match(conversation, /reducing the optimal thickness.*sound master(?:'s|s) direction/i);
  assert.match(conversation, /ALD IGZO deposition/i);
  assert.match(conversation, /Hall measurement access/i);
  assert.match(conversation, /AFM\/TEM via collaborators/i);
  assert.match(conversation, /\.agent-runs\/agent-colloquium\/[a-z0-9-]+/i);
  assert.match(conversation, /non-deterministic model deliberation/i);
  assert.match(conversation, /no action (?:is|was) authorized/i);
  assert.match(conversation, /supplied context (?:is|was) unverified/i);
  for (const role of ["Domain Analyst", "Evidence Reviewer", "Feasibility Reviewer", "Contrarian"]) {
    assert.match(conversation, new RegExp(`fresh independent ${role} output`, "i"));
  }
  assert.match(conversation, /Domain Analyst[\s\S]*mechanism/i);
  assert.match(conversation, /Evidence Reviewer[\s\S]*literature verification/i);
  assert.match(conversation, /Feasibility Reviewer[\s\S]*Hall measurement/i);
  assert.match(conversation, /Contrarian[\s\S]*re-optimization/i);
  for (const reviewer of ["Domain Analyst", "Evidence Reviewer", "Feasibility Reviewer", "Contrarian"]) {
    assert.match(conversation, new RegExp(`${reviewer}.*target position.*(?:control|evidence) question`, "i"));
  }
  assert.match(conversation, /supported next actions/i);
  assert.match(conversation, /decision statuses.*reasons/i);
  assert.match(conversation, /unresolved disagreements/i);
  assert.match(conversation, /human approval required/i);

  assert.match(result, /master(?:'s|s)-level (?:direction )?is viable only if/i);
  assert.match(result, /mechanism-backed/i);
  assert.match(result, /reproducible/i);
  assert.match(result, /not (?:mere )?re-optimization/i);
  assert.match(result, /no literature verification or experiment occurred/i);
  for (const decision of [
    "needs-evidence.*causal .*mechanism.*source or measurement is absent",
    "survives.*falsifiable pilot.*compatible with the stated constraints",
    "survives.*small reversible pilot.*resource information is missing",
    "needs-evidence.*concrete confounder.*before it can be controlled"
  ]) {
    assert.match(result, new RegExp(decision, "i"));
  }
  const unresolvedSection = result.match(/## Unresolved disagreements\n\n([\s\S]*?)\n## /);
  assert.ok(unresolvedSection, "result must include an unresolved-disagreements section");
  const unresolvedEntries = [...unresolvedSection[1].matchAll(/^\d+\. \*\*([^*]+):\*\* (.+)$/gm)];
  assert.equal(unresolvedEntries.length, 3, "result must list exactly three unresolved disagreements");
  assert.equal(
    new Set(unresolvedEntries.map(([, label]) => label.trim().toLowerCase())).size,
    3,
    "unresolved disagreements must be distinct"
  );
  assert.deepEqual(
    unresolvedEntries.map(([, label]) => label.trim()),
    ["Mechanism priority", "First bottleneck", "Control threshold"]
  );
  for (const [, , question] of unresolvedEntries) {
    assert.match(question, /\?$/, "each unresolved disagreement must state a question");
  }
  assert.match(result, /supported next actions/i);
  for (const boundary of ["fabrication", "equipment", "external characterization", "data upload", "publication"]) {
    assert.match(result, new RegExp(`human approval required before ${boundary}(?: operation)?`, "i"));
  }

  assert.doesNotMatch(exampleText, /\bBACK\b/i);
  assert.doesNotMatch(exampleText, /external[- ]research[- ]group/i);
  assert.doesNotMatch(exampleText, /named partner/i);
  assert.doesNotMatch(exampleText, /[\uac00-\ud7a3]/u);

  assert.match(readme, /examples\/igzo-thickness-masters-decision\/conversation\.md/);
  assert.match(readme, /examples\/igzo-thickness-masters-decision\/result\.md/);
  assert.doesNotMatch(readme, /\bBACK\b/i);
  assert.doesNotMatch(readme, /external[- ]research[- ]group/i);
  assert.doesNotMatch(readme, /back-research-group-materials-intelligence/i);
  assert.doesNotMatch(readme, /graduate-plan-public-evidence/i);

  await assert.rejects(access(mockWalkthroughPath), { code: "ENOENT" });
});

test("tracked public text contains no Hangul", async () => {
  const trackedPaths = execFileSync("git", ["ls-files"], {
    cwd: rootDirectory,
    encoding: "utf8"
  })
    .split("\n")
    .filter(Boolean)
    .filter((file) => !file.startsWith(".agent-runs/"))
    .filter((file) => file !== "docs/codex-mock-engine-walkthrough.md");

  const files = await Promise.all(
    trackedPaths.map(async (file) => ({
      file,
      content: await readFile(path.join(rootDirectory, file), "utf8")
    }))
  );

  for (const { file, content } of files) {
    assert.doesNotMatch(content, /[\uac00-\ud7a3]/u, file);
  }
});
