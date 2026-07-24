import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;
const pluginRoot = join(root, "plugins", "agent-colloquium");

test("ships an installable Codex plugin with a native deliberation runner skill", async () => {
  const [manifestText, marketplaceText, skillText, protocolText] = await Promise.all([
    readFile(join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"),
    readFile(join(root, ".agents", "plugins", "marketplace.json"), "utf8"),
    readFile(join(pluginRoot, "skills", "agent-colloquium", "SKILL.md"), "utf8"),
    readFile(join(pluginRoot, "skills", "agent-colloquium", "references", "protocol.md"), "utf8"),
  ]);

  const manifest = JSON.parse(manifestText);
  const marketplace = JSON.parse(marketplaceText);
  const entry = marketplace.plugins.find((plugin) => plugin.name === "agent-colloquium");

  assert.equal(manifest.name, "agent-colloquium");
  assert.ok(entry);
  assert.equal(
    resolve(root, entry.source.path),
    pluginRoot,
    "marketplace source path must resolve to the shipped plugin bundle",
  );
  assert.equal(entry.policy.installation, "AVAILABLE");
  assert.equal(entry.policy.authentication, "ON_INSTALL");
  assert.match(skillText, /^---\nname: agent-colloquium\ndescription: .+\n---/);
  assert.match(skillText, /native-codex\/v1/);
  assert.match(skillText, /Domain Analyst/);
  assert.match(skillText, /Evidence Reviewer/);
  assert.match(skillText, /Feasibility Reviewer/);
  assert.match(skillText, /Contrarian/);
  assert.match(skillText, /Do not share a role output with another role/);
  assert.match(skillText, /fresh synthesis context/);
  assert.match(skillText, /\.agent-runs\/agent-colloquium\//);
  assert.match(protocolText, /"protocol": "native-codex\/v1"/);
  assert.match(protocolText, /counterarguments/);
});
