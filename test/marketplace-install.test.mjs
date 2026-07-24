import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;

test("GitHub marketplace install stays private and resolves the shipped plugin", async () => {
  const [readme, marketplaceText, manifestText] = await Promise.all([
    readFile(join(root, "README.md"), "utf8"),
    readFile(join(root, ".agents", "plugins", "marketplace.json"), "utf8"),
    readFile(join(root, "plugins", "agent-colloquium", ".codex-plugin", "plugin.json"), "utf8"),
  ]);
  const marketplace = JSON.parse(marketplaceText);
  const manifest = JSON.parse(manifestText);

  assert.equal(marketplace.name, "agent-colloquium");
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, "agent-colloquium");
  assert.equal(marketplace.plugins[0].source.source, "local");
  assert.equal(marketplace.plugins[0].source.path, "./plugins/agent-colloquium");
  assert.equal(manifest.author.name, "scorchedrice");
  assert.match(readme, /codex plugin marketplace add https:\/\/github\.com\/scorchedrice\/agent-colloquium/);
  assert.match(readme, /codex plugin install agent-colloquium@agent-colloquium/);
  assert.match(readme, /not an official marketplace listing/i);
});
