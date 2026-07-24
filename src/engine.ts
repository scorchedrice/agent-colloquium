export type ResearchProblem = {
  question: string;
  goals: string[];
  constraints: string[];
};

type Position = {
  role: string;
  isIndependent: true;
  claim: string;
  evidence: string[];
  assumptions: string[];
  unknowns: string[];
  proposedNextStep: string;
};

type CrossExamination = {
  reviewerRole: string;
  targetRole: string;
  challenge: string;
};

type BranchDecision = {
  claim: string;
  status: "survives" | "needs-evidence";
  reason: string;
};

export type ColloquiumArtifact = {
  protocol: "agent-colloquium/mock-v1";
  problem: ResearchProblem;
  positions: Position[];
  crossExaminations: CrossExamination[];
  branchDecisions: BranchDecision[];
  unresolvedDisagreement: string;
  synthesis: string;
};

export function validateProblem(value: unknown): ResearchProblem {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("input must be a JSON object");
  }

  const input = value as Record<string, unknown>;
  if (typeof input.question !== "string" || input.question.trim() === "") {
    throw new Error("input.question must be a non-empty string");
  }
  if (!isStringArray(input.goals) || !isStringArray(input.constraints)) {
    throw new Error("input.goals and input.constraints must be arrays of strings");
  }

  return {
    question: input.question.trim(),
    goals: input.goals,
    constraints: input.constraints,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function runMockColloquium(problem: ResearchProblem): ColloquiumArtifact {
  const positions: Position[] = [
    {
      role: "Domain Analyst",
      isIndependent: true,
      claim: `Frame “${problem.question}” as one falsifiable pilot hypothesis before choosing a solution.`,
      evidence: ["User-provided research question"],
      assumptions: ["A pilot can be scoped within the stated constraints."],
      unknowns: ["Which measurable outcome best represents success?"],
      proposedNextStep: "Define one outcome metric and one control condition.",
    },
    {
      role: "Evidence Reviewer",
      isIndependent: true,
      claim: "No external evidence is available yet, so no causal conclusion should be accepted.",
      evidence: ["The input contains no source references."],
      assumptions: ["The supplied input is the complete evidence set for this run."],
      unknowns: ["Which source or measurement would support the pilot hypothesis?"],
      proposedNextStep: "Create an evidence-acquisition checklist before interpreting a result.",
    },
    {
      role: "Feasibility Reviewer",
      isIndependent: true,
      claim: "A minimal pilot is preferable to a broad implementation under the supplied constraints.",
      evidence: ["User-provided constraints"],
      assumptions: ["A smaller pilot consumes fewer resources than a full rollout."],
      unknowns: ["What resources and time budget are actually available?"],
      proposedNextStep: "List the smallest reversible pilot and its required resources.",
    },
    {
      role: "Contrarian",
      isIndependent: true,
      claim: "An apparent positive result may come from an uncontrolled confounder rather than the proposed intervention.",
      evidence: ["No control condition or measurement protocol was supplied."],
      assumptions: ["At least one plausible confounder exists."],
      unknowns: ["Which confounder is most likely to invalidate the result?"],
      proposedNextStep: "Name one alternative explanation and a control that could falsify it.",
    },
  ];

  return {
    protocol: "agent-colloquium/mock-v1",
    problem,
    positions,
    crossExaminations: [
      {
        reviewerRole: "Evidence Reviewer",
        targetRole: "Domain Analyst",
        challenge: "What evidence would distinguish the pilot hypothesis from an attractive but unsupported explanation?",
      },
      {
        reviewerRole: "Contrarian",
        targetRole: "Feasibility Reviewer",
        challenge: "Could the smallest pilot omit the control needed to interpret its result?",
      },
      {
        reviewerRole: "Feasibility Reviewer",
        targetRole: "Evidence Reviewer",
        challenge: "Which evidence request is essential now rather than deferrable?",
      },
      {
        reviewerRole: "Domain Analyst",
        targetRole: "Contrarian",
        challenge: "Which alternative explanation can be tested with the least additional effort?",
      },
    ],
    branchDecisions: [
      {
        claim: positions[0].claim,
        status: "survives",
        reason: "A falsifiable pilot is compatible with the supplied constraints.",
      },
      {
        claim: positions[1].claim,
        status: "needs-evidence",
        reason: "The mock input includes no external source or measurement evidence.",
      },
      {
        claim: positions[2].claim,
        status: "survives",
        reason: "A reversible pilot limits commitment while resource details remain unknown.",
      },
      {
        claim: positions[3].claim,
        status: "needs-evidence",
        reason: "A specific confounder must be identified before it can be controlled.",
      },
    ],
    unresolvedDisagreement:
      "The panel agrees to prepare a pilot, but does not yet know whether evidence acquisition or resource discovery is the first limiting step.",
    synthesis:
      "Prepare one reversible pilot with a success metric, control condition, and evidence-acquisition checklist. Do not infer causality until the identified alternative explanation has a corresponding control.",
  };
}

export function renderReport(artifact: ColloquiumArtifact): string {
  const positions = artifact.positions
    .map((position) => `### ${position.role}\n\n- Claim: ${position.claim}\n- Evidence: ${position.evidence.join("; ")}\n- Unknowns: ${position.unknowns.join("; ")}\n- Next step: ${position.proposedNextStep}`)
    .join("\n\n");
  const decisions = artifact.branchDecisions
    .map((decision) => `- ${decision.status}: ${decision.reason}`)
    .join("\n");

  return `# Agent Colloquium Mock Report\n\n## Problem\n\n${artifact.problem.question}\n\n## Independent positions\n\n${positions}\n\n## Branch decisions\n\n${decisions}\n\n## Unresolved disagreement\n\n${artifact.unresolvedDisagreement}\n\n## Synthesis\n\n${artifact.synthesis}\n`;
}
