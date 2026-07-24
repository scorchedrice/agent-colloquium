# Research deliberation profile

Use this profile for a research hypothesis, experimental plan, or paper-positioning decision. This Markdown file is shipped with the plugin and is the editable operating guide for the Codex skill; change a role's scope or wording here before a run, then keep the corresponding TypeScript profile contract aligned.

## Input contract

- **Question:** the hypothesis or decision under examination.
- **Goals:** what a useful conclusion must make possible.
- **Constraints:** equipment, time, data access, safety, and approval limits.
- **Evidence mode:** supplied evidence only unless the user explicitly authorizes public research.

## Data-first gate

Before creating any role, determine whether the user supplied data files or numeric data.

1. If there is no data, set `dataClassification` to `none`, `internalDataApproval` to `not-applicable`, and select `codex` or `AGENT-COLLOQUIUM:LOCAL-LLM` as the default execution target.
2. If there is internal data, inspect only its CSV, TSV, or JSON inventory. Explain that `AGENT-COLLOQUIUM:LOCAL-LLM` is recommended, then ask the user to choose a route before creating a role.
3. Record `internalDataApproval: "local-only"` when the user chooses the recommended local route. Every role then resolves locally.
4. Record `internalDataApproval: "codex-approved"` only after explicit user confirmation that internal data may be sent to Codex. This is never inferred from a target setting.
5. If the user explicitly approves sanitized data for external processing, set `dataClassification` to `sanitized-public` and `internalDataApproval` to `not-applicable`; role targets may be selected individually.

Use [`execution-targets.example.json`](execution-targets.example.json) as the editable route policy. The local target is configured through [`LOCAL-LLM.md`](LOCAL-LLM.md). Do not expose file values in an inventory. Do not pass internal data to a Codex target without the recorded explicit user confirmation above.

## 1. Discovery

Create these positions independently. They do not receive another discovery role's output.

| Role | Input | Required output |
| --- | --- | --- |
| Fact Investigator | question, supplied evidence | feasibility facts, evidence gaps, alternative explanations |
| Current Experiment Designer | question, current equipment | minimum controls and discriminating measurements |
| Future Experiment Designer | question, future-capability allowance | incremental experiments enabled by additional instruments |
| Timeline Planner | question, constraints | reversible milestone plan and stop conditions |
| Peer Researcher | question, supplied evidence | field relevance, reproducibility, specialist objections |
| Science Journalist | question, supplied evidence | public significance without overstating the claim |
| Blind Internal Data Analyst | decontextualized numeric data only | patterns, uncertainty, and requested follow-up statistics |

The Blind Internal Data Analyst receives **decontextualized numeric data only**. It receives no experiment name, sample identity, research brief, external-research capability, or network access. Omit this role when no numeric data is supplied.

For a local model, use the manual-export-only [`LOCAL-LLM.md`](LOCAL-LLM.md). The configuration is intentionally validated without opening a local or remote endpoint.

## 2. Review

Normalize discovery positions into claim, evidence, assumption, unknown, counterargument, and proposed-next-step fields. Create these three reviews independently from that same normalized discovery bundle.

| Role | Review standard |
| --- | --- |
| Positive Reviewer | identify credible upside and the smallest path to a useful result |
| Neutral Reviewer | assess only what the supplied record supports |
| Negative Reviewer | identify failure modes, confounders, and disqualifying evidence gaps |

A Positive Reviewer, Neutral Reviewer, or Negative Reviewer must **not receive another reviewer's first-pass output**. Reviewer disagreement is an artifact, not an error to erase.

## 3. Publication gate

The Publication Editor receives the **normalized review bundle**, not hidden reasoning. It decides whether the proposed claim is publication-ready, needs evidence, should be reframed, or should be deferred. Its gate must state:

1. the strongest defensible claim;
2. the required evidence or control before submission;
3. novelty and reproducibility risks;
4. the appropriate decision status: `survives`, `needs-evidence`, `deferred`, or `pruned`.

## 4. Editorial output

The Conversation Editor receives the publication decision plus normalized positions and reviewer disagreements. It renders a readable report without turning a model opinion into verified research, institutional affiliation, or authorization to act.

## Handoff map

```text
isolated discovery positions
  → normalized discovery bundle
  → isolated positive / neutral / negative reviews
  → normalized review bundle
  → Publication Editor gate
  → Conversation Editor report
```

## Editing rules

- Keep a role's input boundary explicit when changing its purpose.
- Do not grant the blind analyst research context or external access.
- Add a new role to the TypeScript profile and staged artifact contract before asking the native skill to run it.
- Treat a profile edit as a behavior change: run the profile-flow test before relying on it.
