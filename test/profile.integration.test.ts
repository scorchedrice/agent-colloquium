import assert from "node:assert/strict";
import test from "node:test";
import { defineProfileRole } from "../src/profile/types.ts";
import { researchDeliberationProfile } from "../src/profile/research-deliberation.ts";

const publicRoleIds = [
  "fact-investigator",
  "positive-reviewer",
  "neutral-reviewer",
  "negative-reviewer",
  "timeline-planner",
  "current-experiment-designer",
  "future-experiment-designer",
  "publication-editor",
  "science-journalist",
  "peer-researcher",
  "conversation-editor",
] as const;

test("research-deliberation profile separates public research from blind local analysis", () => {
  assert.equal(researchDeliberationProfile.id, "research-deliberation");
  assert.equal(researchDeliberationProfile.roles.length, 12);

  for (const id of publicRoleIds) {
    const role = researchDeliberationProfile.roles.find((candidate) => candidate.id === id);
    assert.ok(role, `missing ${id}`);
    assert.equal(role.dataVisibility, "evidence-packs-only");
    assert.deepEqual(role.capabilities, ["external-research"]);
  }

  const editor = researchDeliberationProfile.roles.find((role) => role.id === "conversation-editor");
  assert.deepEqual(editor, {
    id: "conversation-editor",
    title: "Conversation Editor",
    purpose: "Turn role opinions into a readable evidence brief while preserving sources, uncertainty, disagreement, and next actions.",
    kind: "public-research",
    dataVisibility: "evidence-packs-only",
    contextVisibility: "research-brief-and-evidence",
    capabilities: ["external-research"],
  });

  const analyst = researchDeliberationProfile.roles.find((role) => role.id === "blind-data-analyst");
  assert.deepEqual(analyst, {
    id: "blind-data-analyst",
    title: "Blind Internal Data Analyst",
    purpose: "Find statistical patterns in decontextualized numeric results without inferring experimental meaning.",
    kind: "blind-local-analysis",
    dataVisibility: "decontextualized-numeric-only",
    contextVisibility: "none",
    capabilities: ["local-analysis"],
  });
});

test("profile roles reject raw-data access for public research and network access for blind analysis", () => {
  assert.throws(
    () => defineProfileRole({
      id: "invalid-public",
      title: "Invalid Public Role",
      purpose: "Must not see raw data.",
      kind: "public-research",
      dataVisibility: "raw-internal-data",
      capabilities: ["external-research"],
    }),
    /public-research roles must use evidence-packs-only/,
  );

  assert.throws(
    () => defineProfileRole({
      id: "invalid-analyst",
      title: "Invalid Analyst",
      purpose: "Must not use the network.",
      kind: "blind-local-analysis",
      dataVisibility: "decontextualized-numeric-only",
      contextVisibility: "none",
      capabilities: ["external-research"],
    }),
    /blind-local-analysis roles must use local-analysis only/,
  );
});

test("profile declarations reject extra capabilities and declare blind context isolation", () => {
  assert.throws(
    () => defineProfileRole({
      id: "networked-analyst",
      title: "Networked Analyst",
      purpose: "Must be rejected.",
      kind: "blind-local-analysis",
      dataVisibility: "decontextualized-numeric-only",
      contextVisibility: "none",
      capabilities: ["local-analysis", "external-research"],
    }),
    /role capabilities must contain exactly one recognized capability/,
  );

  assert.throws(
    () => defineProfileRole({
      id: "unknown-kind",
      title: "Unknown Kind",
      purpose: "Must be rejected.",
      kind: "unrecognized",
      dataVisibility: "evidence-packs-only",
      capabilities: ["external-research"],
    }),
    /role kind is invalid/,
  );

  const analyst = researchDeliberationProfile.roles.find((role) => role.id === "blind-data-analyst");
  assert.equal(analyst?.contextVisibility, "none");
});
