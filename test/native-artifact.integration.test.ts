import assert from "node:assert/strict";
import test from "node:test";
import { validateNativeArtifact } from "../src/native-artifact.ts";

const validArtifact = {
  protocol: "native-codex/v1",
  runtime: "codex-native-subagents",
  deterministic: false,
  intake: { question: "Can this be validated?", goals: ["test"], constraints: ["local only"] },
  positions: [
    {
      id: "domain-analyst",
      role: "Domain Analyst",
      claim: "A local test is possible.",
      evidence: [{ source: "user-provided context", locator: "intake", status: "provided" }],
      assumptions: ["The fixture is representative."],
      unknowns: ["Runtime quality."],
      counterarguments: ["The fixture might be too small."],
      proposedNextStep: "Run the test.",
      confidence: "medium",
    },
  ],
  crossExaminations: [{ reviewerRole: "Evidence Reviewer", targetPositionId: "domain-analyst", challenge: "What supports the claim?" }],
  decisions: [{ positionId: "domain-analyst", status: "survives", reason: "The contract is valid." }],
  unresolvedDisagreements: ["Runtime quality remains unknown."],
  synthesis: { supportedNextActions: ["Run locally."], humanApprovalRequired: true },
};

test("accepts a conforming native-codex/v1 artifact", () => {
  assert.doesNotThrow(() => validateNativeArtifact(validArtifact));
});

test("rejects malformed role output before it can reach synthesis", () => {
  const malformed = structuredClone(validArtifact);
  malformed.positions[0].confidence = 0.8 as never;
  assert.throws(() => validateNativeArtifact(malformed), /positions\[0\]\.confidence/);
});

test("generic artifacts require recorded approval before routing internal data to Codex", () => {
  const localOnly = structuredClone(validArtifact);
  localOnly.dataIntake = { classification: "internal", files: [] };
  localOnly.executionTargets = {
    dataClassification: "internal",
    internalDataApproval: "local-only",
    defaultTarget: "AGENT-COLLOQUIUM:LOCAL-LLM",
    roleTargets: {},
  };
  assert.doesNotThrow(() => validateNativeArtifact(localOnly));

  const leaked = structuredClone(localOnly);
  leaked.executionTargets.defaultTarget = "codex";
  assert.throws(() => validateNativeArtifact(leaked), /internal Codex routing requires explicit codex-approved/);

  const approved = structuredClone(leaked);
  approved.executionTargets.internalDataApproval = "codex-approved";
  assert.doesNotThrow(() => validateNativeArtifact(approved));
});
