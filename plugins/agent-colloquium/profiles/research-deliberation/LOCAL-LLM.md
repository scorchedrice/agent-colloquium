# Manual local LLM selection

Use this optional configuration to select a manual local model for **any profile role**. It is intentionally **manual-export only**: Agent Colloquium validates the configuration but never opens an endpoint, invokes a provider SDK, runs a command, uploads a file, or sends data over the network.

Set a role (or the default) to `AGENT-COLLOQUIUM:LOCAL-LLM` in `execution-targets.json`. For internal data, this is the recommended route and is recorded as `internalDataApproval: "local-only"`. A user may explicitly approve an internal-to-Codex route instead, recorded as `internalDataApproval: "codex-approved"`; never infer that approval from the target alone. The Blind Internal Data Analyst keeps its stricter boundary: it receives only decontextualized numeric data, not the experiment or lab context.

## Configure

1. Copy `local-llm.example.json` to `.agent-colloquium/local-llm.json` in the working repository.
2. Replace the `model` label with the name you use locally.
3. Validate the file:

```bash
pnpm colloquium:validate-local-llm -- \
  --config .agent-colloquium/local-llm.json
```

Only these three keys are permitted:

```json
{
  "protocol": "local-llm/manual-export/v1",
  "transport": "manual-export",
  "model": "your-local-model-label"
}
```

An endpoint URL, shell command, credential, raw-data path, or any other key is rejected. Keep `.agent-colloquium/local-llm.json` local; it is ignored by Git.

## Manual handoff

When a role is routed to the local target, inspect its request first and manually provide it to the configured local model. Return only the structured result required by that role. For the Blind Internal Data Analyst, provide only a decontextualized numeric request; do not add an experiment name, sample identity, lab context, external source, or hidden agent reasoning.

This configuration is not a transport adapter. A future loopback adapter requires a separate security-reviewed implementation and explicit user approval.
