---
name: agent-colloquium
description: Run a real Codex-native structured deliberation for a research, product, or technical decision. Use when the user wants multiple independent perspectives, explicit evidence gaps and counterarguments, preserved disagreement, and a reviewable local artifact; invoke with $agent-colloquium or ask for a colloquium, panel review, or structured multi-agent deliberation.
---

# Agent Colloquium

Run the `native-codex/v1` protocol. Use Codex native subagents for the role work; do not call a provider SDK, browse the web, alter an external system, or execute a user-supplied command.

## Profile selection

For a research hypothesis, experimental plan, or paper-positioning question, use the default [`research-deliberation` profile](../../profiles/research-deliberation/PROFILE.md). Read that file before creating any role. It is shipped inside the plugin bundle and is the user-editable source for role purpose, context boundary, and handoff order.

For a non-research decision, use the four-role generic flow below. Do not claim that the generic flow executed the research profile.

## Intake

Require all three inputs before starting:

- `question`: the decision to examine;
- `goals`: what a useful result must accomplish;
- `constraints`: resources, time, safety, approval, or data limits.

If any input is absent, ask for only the missing input. Treat supplied material as unverified context, not evidence. Refuse a request to control equipment, upload data, publish, send a message, or make another external change.

Before creating positions in **any** flow, perform the data-first gate when data or files are supplied. Read the editable [`execution-targets.example.json`](../../profiles/research-deliberation/execution-targets.example.json). Inspect only CSV, TSV, or JSON metadata; never print values.

For internal data, explicitly ask: “This appears to be internal data. I recommend `AGENT-COLLOQUIUM:LOCAL-LLM` to keep it local. Should all roles use the local route, should only sanitized-public data go to Codex, or do you explicitly approve sending this internal data to Codex?” Do not choose a route on the user's behalf. Record `internalDataApproval: "local-only"` for the recommended route. Record `internalDataApproval: "codex-approved"` only after the user explicitly approves the internal-to-Codex route. If the user approves only sanitized data, use `dataClassification: "sanitized-public"` and `internalDataApproval: "not-applicable"`. Record `dataIntake` and `executionTargets` in the artifact whenever this gate is used.

Choose an explicit output directory, defaulting to `.agent-runs/agent-colloquium/<run-id>/`. Explain that the run writes only `artifact.json` and `report.md` there and that model output is non-deterministic.

## Research profile — staged deliberation

When `research-deliberation` applies, follow the profile's four stages exactly.

1. Create the discovery positions independently. Do not share a discovery output with another discovery role. The Blind Internal Data Analyst is conditional; give it decontextualized numeric data only and no research context, browsing, or network access. For a user-configured local model, read the profile's [`LOCAL-LLM.md`](../../profiles/research-deliberation/LOCAL-LLM.md); validate manual-export configuration only and never invoke that model, an endpoint, or a command.
2. Normalize the discovery positions into the `Position` contract. Create Positive Reviewer, Neutral Reviewer, and Negative Reviewer independently from the same normalized discovery bundle. A reviewer must not receive another reviewer's first-pass output.
3. Give the Publication Editor only the normalized review bundle. This is the publication gate: it decides the strongest defensible claim, evidence threshold, novelty/reproducibility risks, and decision status. Do not synthesize around this gate.
4. Give the Conversation Editor the publication decision, normalized positions, and preserved disagreements. It produces the reviewable report.

Record `profileId: "research-deliberation"` and the four stage records in `artifact.json` using the protocol reference. The profile is not a provider call and does not authorize an experiment, paper submission, equipment control, or external communication.

## Generic flow — independent positions

Create four fresh native Codex subagents in parallel. Give each only the intake, the role instruction below, and the JSON contract in [`references/protocol.md`](references/protocol.md). Do not share a role output with another role. Do not let a role browse, call an external service, or take a side effect.

| Role | Required focus |
|---|---|
| Domain Analyst | Form one or more testable interpretations of the question. |
| Evidence Reviewer | Separate supplied context from evidence; name what would make a claim supportable. |
| Feasibility Reviewer | Examine resources, reversibility, time, and practical execution. |
| Contrarian | Name alternative explanations, failure conditions, and controls. |

Each subagent returns exactly one `Position` JSON object. It must not expose private chain-of-thought. It must put unsupported statements in `assumptions` or `unknowns`, never present them as evidence.

## Round 2 — cross-examination

After all four valid positions return, construct one challenge per role against a different role. Each challenge must identify a claim, ask for the relevant evidence/control/resource constraint, and preserve the target claim ID. Do not run synthesis early.

## Round 3 — fresh synthesis context

Create a fresh synthesis context after the position and challenge sets are complete. Pass it only the normalized `Position` and `CrossExamination` objects, not any subagent's hidden reasoning. Require it to produce `Synthesis` JSON containing:

- supported next actions;
- decisions with `survives`, `needs-evidence`, `deferred`, or `pruned` status and reasons;
- at least one unresolved disagreement when the record does not justify convergence;
- a human-approval requirement before any side-effecting action.

## Artifact and report

Write `artifact.json` conforming to `native-codex/v1` and `report.md` under the selected output directory. Include the original intake, every role position, every challenge, decision reasons, unresolved disagreement, and synthesis. State clearly in the report that this is a Codex model deliberation, not verified research or an authorization to act.

If any role output is malformed, mark that role `invalid-output` in the artifact and stop before synthesis. If an external action is requested, stop and ask the user for separate explicit approval instead of adding a tool call.
