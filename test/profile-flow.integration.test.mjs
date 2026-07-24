import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { validateNativeArtifact } from "../src/native-artifact.ts";

const root = new URL("..", import.meta.url).pathname;
const profilePath = join(root, "plugins", "agent-colloquium", "profiles", "research-deliberation", "PROFILE.md");
const skillPath = join(root, "plugins", "agent-colloquium", "skills", "agent-colloquium", "SKILL.md");
const protocolPath = join(root, "plugins", "agent-colloquium", "skills", "agent-colloquium", "references", "protocol.md");
const localLlmPath = join(root, "plugins", "agent-colloquium", "profiles", "research-deliberation", "LOCAL-LLM.md");

const discoveryRoles = ["Fact Investigator", "Current Experiment Designer", "Future Experiment Designer", "Timeline Planner", "Peer Researcher", "Science Journalist", "Blind Internal Data Analyst"];
const reviewRoles = ["Positive Reviewer", "Neutral Reviewer", "Negative Reviewer"];

function position(role, stageId, inputPositionIds = []) {
  return {
    id: role.toLowerCase().replaceAll(" ", "-"),
    role,
    stageId,
    inputPositionIds,
    claim: `${role} returned a bounded claim.`,
    evidence: [{ source: "user-provided context", locator: "intake", status: "provided" }],
    assumptions: ["The fixture is representative."],
    unknowns: ["Runtime quality."],
    counterarguments: ["The fixture might be too small."],
    proposedNextStep: "Run the test.",
    confidence: "medium",
  };
}

const discoveryPositions = discoveryRoles.map((role) => position(role, "discovery"));
const discoveryIds = discoveryPositions.map(({ id }) => id);
const reviewPositions = reviewRoles.map((role) => position(role, "review", discoveryIds));
const reviewIds = reviewPositions.map(({ id }) => id);
const publicationPosition = position("Publication Editor", "publication-gate", reviewIds);
const editorialPosition = position("Conversation Editor", "editorial", [publicationPosition.id]);

const researchArtifact = {
  protocol: "native-codex/v1",
  runtime: "codex-native-subagents",
  deterministic: false,
  profileId: "research-deliberation",
  internalDataMode: "decontextualized-numeric",
  dataIntake: { classification: "internal", files: [] },
  executionTargets: { dataClassification: "internal", internalDataApproval: "local-only", defaultTarget: "AGENT-COLLOQUIUM:LOCAL-LLM", roleTargets: {} },
  stages: [
    { id: "discovery", visibility: "isolated", roles: ["Fact Investigator", "Current Experiment Designer", "Future Experiment Designer", "Timeline Planner", "Peer Researcher", "Science Journalist", "Blind Internal Data Analyst"] },
    { id: "review", visibility: "isolated", roles: ["Positive Reviewer", "Neutral Reviewer", "Negative Reviewer"] },
    { id: "publication-gate", visibility: "normalized-review-bundle", roles: ["Publication Editor"] },
    { id: "editorial", visibility: "publication-decision", roles: ["Conversation Editor"] },
  ],
  intake: { question: "Can this be validated?", goals: ["test"], constraints: ["local only"] },
  positions: [...discoveryPositions, ...reviewPositions, publicationPosition, editorialPosition],
  crossExaminations: [{ reviewerRole: "Neutral Reviewer", targetPositionId: "fact-investigator", challenge: "What supports the claim?" }],
  decisions: [{ positionId: "fact-investigator", status: "needs-evidence", reason: "The publication gate needs a control." }],
  unresolvedDisagreements: ["Runtime quality remains unknown."],
  synthesis: { supportedNextActions: ["Run locally."], humanApprovalRequired: true },
};

test("research profile documents isolated discovery, review, publication, and editorial stages", async () => {
  await assert.doesNotReject(access(profilePath));
  const [profile, skill, protocol, localLlm] = await Promise.all([
    readFile(profilePath, "utf8"),
    readFile(skillPath, "utf8"),
    readFile(protocolPath, "utf8"),
    readFile(localLlmPath, "utf8"),
  ]);

  const stageOffsets = ["## 1. Discovery", "## 2. Review", "## 3. Publication gate", "## 4. Editorial output"].map((heading) => profile.indexOf(heading));
  assert.ok(stageOffsets.every((offset) => offset >= 0));
  assert.deepEqual([...stageOffsets].sort((a, b) => a - b), stageOffsets);
  assert.match(profile, /Blind Internal Data Analyst[\s\S]*decontextualized numeric data only/i);
  assert.match(profile, /Positive Reviewer[\s\S]*not receive another reviewer's first-pass output/i);
  assert.match(profile, /Publication Editor[\s\S]*normalized review bundle/i);
  assert.match(skill, /profiles\/research-deliberation\/PROFILE\.md/);
  assert.match(skill, /publication gate/i);
  assert.match(protocol, /"profileId": "research-deliberation"/);
  assert.match(protocol, /"publication-gate"/);
  assert.match(skill, /Before creating positions in \*\*any\*\* flow/);
  assert.match(localLlm, /any profile role/i);
  assert.match(profile, /explicit user confirmation/i);
});

test("research artifact rejects reviewer visibility leaks and accepts the staged profile contract", () => {
  assert.doesNotThrow(() => validateNativeArtifact(researchArtifact));

  const incomplete = structuredClone(researchArtifact);
  incomplete.positions = incomplete.positions.slice(0, -1);
  assert.throws(() => validateNativeArtifact(incomplete), /positions must include every role/);

  const leaked = structuredClone(researchArtifact);
  leaked.stages[1].visibility = "shared-reviewer-output";
  assert.throws(() => validateNativeArtifact(leaked), /stages\[1\]\.visibility/);
});
