import assert from "node:assert/strict";
import test from "node:test";
import { validateLocalLlmConfig } from "../src/local-llm.ts";

const valid = {
  protocol: "local-llm/manual-export/v1",
  transport: "manual-export",
  model: "my-local-model",
};

test("accepts the networkless manual-export local LLM configuration", () => {
  assert.deepEqual(validateLocalLlmConfig(valid), valid);
});

test("rejects endpoint, command, credential, and unknown local LLM settings", () => {
  for (const extra of [
    { endpoint: "http://127.0.0.1:11434/v1" },
    { command: "ollama run my-local-model" },
    { apiKey: "secret" },
    { allowNetwork: false },
  ]) {
    assert.throws(() => validateLocalLlmConfig({ ...valid, ...extra }), /local LLM config has unsupported key/);
  }
});
