# native-codex/v1 protocol

## Intake

```json
{
  "question": "string",
  "goals": ["string"],
  "constraints": ["string"]
}
```

## Position

```json
{
  "id": "role-stable-id",
  "role": "Domain Analyst | Evidence Reviewer | Feasibility Reviewer | Contrarian",
  "claim": "A falsifiable statement or proposed action.",
  "evidence": [
    {
      "source": "user-provided context | citation | measurement",
      "locator": "optional precise location",
      "status": "provided | missing"
    }
  ],
  "assumptions": ["Unverified premise"],
  "unknowns": ["Question not answered by the supplied material"],
  "counterarguments": ["Specific alternative explanation or failure condition"],
  "proposedNextStep": "Reversible, non-side-effecting next action",
  "confidence": "low | medium | high"
}
```

## Cross-examination

```json
{
  "reviewerRole": "string",
  "targetPositionId": "string",
  "challenge": "Question about evidence, control, constraint, or alternative explanation"
}
```

## Artifact

```json
{
  "protocol": "native-codex/v1",
  "runtime": "codex-native-subagents",
  "deterministic": false,
  "intake": {
    "question": "string",
    "goals": ["string"],
    "constraints": ["string"]
  },
  "positions": [],
  "crossExaminations": [],
  "decisions": [
    {
      "positionId": "string",
      "status": "survives | needs-evidence | deferred | pruned",
      "reason": "string"
    }
  ],
  "unresolvedDisagreements": ["string"],
  "synthesis": {
    "supportedNextActions": ["string"],
    "humanApprovalRequired": true
  }
}
```

## Data-first artifact extension

When the data-first gate is used in any flow, add `dataIntake` and `executionTargets`. They are required when the research profile is selected. The research stage array is ordered and records the allowed handoff boundary; it is not a transcript of hidden reasoning.

```json
{
  "profileId": "research-deliberation",
  "internalDataMode": "none | decontextualized-numeric",
  "dataIntake": {
    "classification": "none | internal | sanitized-public",
    "files": [{"name": "string", "format": "csv | tsv | json", "bytes": 0, "rows": 0, "columns": ["string"]}]
  },
  "executionTargets": {
    "dataClassification": "none | internal | sanitized-public",
    "internalDataApproval": "not-applicable | local-only | codex-approved",
    "defaultTarget": "codex | AGENT-COLLOQUIUM:LOCAL-LLM",
    "roleTargets": {"optional-role-id": "codex | AGENT-COLLOQUIUM:LOCAL-LLM"}
  },
  "stages": [
    {
      "id": "discovery",
      "visibility": "isolated",
      "roles": ["Fact Investigator", "Current Experiment Designer", "Future Experiment Designer", "Timeline Planner", "Peer Researcher", "Science Journalist", "Blind Internal Data Analyst"]
    },
    {
      "id": "review",
      "visibility": "isolated",
      "roles": ["Positive Reviewer", "Neutral Reviewer", "Negative Reviewer"]
    },
    {
      "id": "publication-gate",
      "visibility": "normalized-review-bundle",
      "roles": ["Publication Editor"]
    },
    {
      "id": "editorial",
      "visibility": "publication-decision",
      "roles": ["Conversation Editor"]
    }
  ]
}
```

For `dataClassification: "internal"`, `internalDataApproval` must be `local-only` or `codex-approved`. `local-only` requires every role to use `AGENT-COLLOQUIUM:LOCAL-LLM`. `codex-approved` is valid only after explicit user confirmation; it must never be inferred from `defaultTarget` or a role override. For `none` and `sanitized-public`, use `not-applicable`.

Every research-profile `Position` adds the stage and the normalized position IDs it was allowed to receive:

```json
{
  "stageId": "discovery | review | publication-gate | editorial",
  "inputPositionIds": []
}
```

Discovery positions receive no other position. Every reviewer receives the complete normalized discovery set, never another reviewer's output. The Publication Editor receives exactly the normalized review set. The Conversation Editor receives exactly the publication decision. When `internalDataMode` is `none`, omit the Blind Internal Data Analyst from the discovery stage and positions; when it is `decontextualized-numeric`, include it.
