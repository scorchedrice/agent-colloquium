import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readmePath = new URL("../README.md", import.meta.url);

test("public README describes the Codex skill without overstating the current runtime", async () => {
  const readme = await readFile(readmePath, "utf8");

  assert.match(readme, /^# Agent Colloquium$/m);
  assert.match(readme, /Codex-first/i);
  assert.match(readme, /\$agent-colloquium/);
  assert.match(readme, /`question`/);
  assert.match(readme, /`goals`/);
  assert.match(readme, /`constraints`/);
  assert.match(readme, /four independent/i);
  assert.match(readme, /deterministic mock/i);
  assert.match(readme, /plugins\/agent-colloquium\/skills\/agent-colloquium\/SKILL\.md/);
  assert.match(readme, /## Profiles/);
  assert.match(readme, /```mermaid/);
  assert.match(readme, /Publication Editor/);
  assert.match(readme, /explicit user confirmation/i);
  assert.match(readme, /internalDataApproval/);
  assert.doesNotMatch(readme, /docs\/개발-HARNESS\.md/);
  assert.match(readme, /pnpm verify/);
});
