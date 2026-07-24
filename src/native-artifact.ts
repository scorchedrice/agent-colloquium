type UnknownRecord = Record<string, unknown>;
type ParsedPosition = { id: string; role: string; stageId?: string; inputPositionIds?: string[] };
type ResearchProfile = { internalDataMode: "none" | "decontextualized-numeric"; stages: readonly ResearchStage[] };
type ResearchStage = { id: string; visibility: string; roles: readonly string[] };

const genericRoles = new Set(["Domain Analyst", "Evidence Reviewer", "Feasibility Reviewer", "Contrarian"]);
const researchRoles = new Set([
  "Fact Investigator",
  "Positive Reviewer",
  "Neutral Reviewer",
  "Negative Reviewer",
  "Timeline Planner",
  "Current Experiment Designer",
  "Future Experiment Designer",
  "Publication Editor",
  "Science Journalist",
  "Peer Researcher",
  "Conversation Editor",
  "Blind Internal Data Analyst",
]);
const decisions = new Set(["survives", "needs-evidence", "deferred", "pruned"]);
const confidence = new Set(["low", "medium", "high"]);
const discoveryRoles = ["Fact Investigator", "Current Experiment Designer", "Future Experiment Designer", "Timeline Planner", "Peer Researcher", "Science Journalist"];
const reviewRoles = ["Positive Reviewer", "Neutral Reviewer", "Negative Reviewer"];
const researchStages = (internalDataMode: "none" | "decontextualized-numeric"): readonly ResearchStage[] => [
  { id: "discovery", visibility: "isolated", roles: internalDataMode === "decontextualized-numeric" ? [...discoveryRoles, "Blind Internal Data Analyst"] : discoveryRoles },
  { id: "review", visibility: "isolated", roles: reviewRoles },
  { id: "publication-gate", visibility: "normalized-review-bundle", roles: ["Publication Editor"] },
  { id: "editorial", visibility: "publication-decision", roles: ["Conversation Editor"] },
];

export function validateNativeArtifact(value: unknown): void {
  const artifact = record(value, "artifact");
  equal(artifact.protocol, "native-codex/v1", "protocol");
  equal(artifact.runtime, "codex-native-subagents", "runtime");
  if (artifact.deterministic !== false) throw new Error("deterministic must be false");
  const profile = profileContract(artifact);
  if (profile || artifact.dataIntake !== undefined || artifact.executionTargets !== undefined) dataAndExecutionContract(artifact, profile);
  const intake = record(artifact.intake, "intake");
  string(intake.question, "intake.question");
  strings(intake.goals, "intake.goals");
  strings(intake.constraints, "intake.constraints");
  const positions = array(artifact.positions, "positions");
  if (positions.length === 0) throw new Error("positions must not be empty");
  const normalizedPositions = positions.map((item, index) => position(item, index, profile ? "research-deliberation" : "generic"));
  if (profile) researchPositionContract(normalizedPositions, profile);
  array(artifact.crossExaminations, "crossExaminations").forEach((item, index) => crossExamination(item, index));
  array(artifact.decisions, "decisions").forEach((item, index) => decision(item, index));
  strings(artifact.unresolvedDisagreements, "unresolvedDisagreements");
  const synthesis = record(artifact.synthesis, "synthesis");
  strings(synthesis.supportedNextActions, "synthesis.supportedNextActions");
  if (synthesis.humanApprovalRequired !== true) throw new Error("synthesis.humanApprovalRequired must be true");
}

function dataAndExecutionContract(artifact: UnknownRecord, profile?: ResearchProfile): void {
  const dataIntake = record(artifact.dataIntake, "dataIntake");
  if (dataIntake.classification !== "none" && dataIntake.classification !== "internal" && dataIntake.classification !== "sanitized-public") {
    throw new Error("dataIntake.classification is invalid");
  }
  const files = array(dataIntake.files, "dataIntake.files");
  files.forEach((file, index) => dataInventory(file, index));
  const executionTargets = executionTargetRecord(artifact.executionTargets);
  if (executionTargets.dataClassification !== dataIntake.classification) throw new Error("executionTargets.dataClassification must match dataIntake.classification");
  if (profile?.internalDataMode === "decontextualized-numeric" && dataIntake.classification !== "internal") {
    throw new Error("blind internal analysis requires internal data classification");
  }
}

function dataInventory(value: unknown, index: number): void {
  const inventory = record(value, `dataIntake.files[${index}]`);
  const keys = Object.keys(inventory);
  if (keys.length !== 5 || keys.some((key) => !["name", "format", "bytes", "rows", "columns"].includes(key))) throw new Error(`dataIntake.files[${index}] must contain inventory metadata only`);
  string(inventory.name, `dataIntake.files[${index}].name`);
  if (inventory.format !== "csv" && inventory.format !== "tsv" && inventory.format !== "json") throw new Error(`dataIntake.files[${index}].format is invalid`);
  ["bytes", "rows"].forEach((key) => { if (typeof inventory[key] !== "number" || inventory[key] < 0) throw new Error(`dataIntake.files[${index}].${key} is invalid`); });
  strings(inventory.columns, `dataIntake.files[${index}].columns`);
}

function executionTargetRecord(value: unknown): { dataClassification: string; internalDataApproval: string; defaultTarget: string; roleTargets: Record<string, unknown> } {
  const targets = record(value, "executionTargets");
  const keys = Object.keys(targets);
  if (keys.length !== 4 || keys.some((key) => !["dataClassification", "internalDataApproval", "defaultTarget", "roleTargets"].includes(key))) throw new Error("executionTargets has unsupported key");
  if (targets.dataClassification !== "none" && targets.dataClassification !== "internal" && targets.dataClassification !== "sanitized-public") throw new Error("executionTargets.dataClassification is invalid");
  if (targets.internalDataApproval !== "not-applicable" && targets.internalDataApproval !== "local-only" && targets.internalDataApproval !== "codex-approved") throw new Error("executionTargets.internalDataApproval is invalid");
  if (targets.defaultTarget !== "codex" && targets.defaultTarget !== "AGENT-COLLOQUIUM:LOCAL-LLM") throw new Error("executionTargets.defaultTarget is invalid");
  const roleTargets = record(targets.roleTargets, "executionTargets.roleTargets");
  Object.entries(roleTargets).forEach(([role, target]) => {
    string(role, "executionTargets.roleTargets key");
    if (target !== "codex" && target !== "AGENT-COLLOQUIUM:LOCAL-LLM") throw new Error(`executionTargets.roleTargets.${role} is invalid`);
  });
  if (targets.dataClassification !== "internal" && targets.internalDataApproval !== "not-applicable") throw new Error("non-internal data requires internalDataApproval to be not-applicable");
  if (targets.dataClassification === "internal" && targets.internalDataApproval === "not-applicable") throw new Error("internal data requires an explicit internalDataApproval");
  if (targets.dataClassification === "internal" && targets.internalDataApproval !== "codex-approved" && (targets.defaultTarget !== "AGENT-COLLOQUIUM:LOCAL-LLM" || Object.values(roleTargets).some((target) => target !== "AGENT-COLLOQUIUM:LOCAL-LLM"))) {
    throw new Error("internal Codex routing requires explicit codex-approved approval");
  }
  return { dataClassification: targets.dataClassification, internalDataApproval: targets.internalDataApproval, defaultTarget: targets.defaultTarget, roleTargets };
}

function profileContract(artifact: UnknownRecord): ResearchProfile | undefined {
  if (artifact.profileId === undefined) return undefined;
  if (artifact.profileId !== "research-deliberation") throw new Error("profileId is invalid");
  if (artifact.internalDataMode !== "none" && artifact.internalDataMode !== "decontextualized-numeric") throw new Error("internalDataMode is invalid");
  const stages = researchStageContract(artifact.stages, artifact.internalDataMode);
  return { internalDataMode: artifact.internalDataMode, stages };
}

function researchStageContract(value: unknown, internalDataMode: "none" | "decontextualized-numeric"): readonly ResearchStage[] {
  const stages = array(value, "stages");
  const expectedStages = researchStages(internalDataMode);
  if (stages.length !== expectedStages.length) throw new Error("stages must contain the research-deliberation flow");
  stages.forEach((value, index) => {
    const stage = record(value, `stages[${index}]`);
    const expected = expectedStages[index];
    equal(stage.id, expected.id, `stages[${index}].id`);
    equal(stage.visibility, expected.visibility, `stages[${index}].visibility`);
    const roles = array(stage.roles, `stages[${index}].roles`);
    if (roles.length !== expected.roles.length || roles.some((role, roleIndex) => role !== expected.roles[roleIndex])) {
      throw new Error(`stages[${index}].roles must match the research-deliberation profile`);
    }
  });
  return expectedStages;
}

function position(value: unknown, index: number, profileId: "generic" | "research-deliberation"): ParsedPosition {
  const item = record(value, `positions[${index}]`);
  string(item.id, `positions[${index}].id`);
  const allowedRoles = profileId === "research-deliberation" ? researchRoles : genericRoles;
  if (typeof item.role !== "string" || !allowedRoles.has(item.role)) throw new Error(`positions[${index}].role is invalid`);
  ["claim", "proposedNextStep"].forEach((key) => string(item[key], `positions[${index}].${key}`));
  ["assumptions", "unknowns", "counterarguments"].forEach((key) => strings(item[key], `positions[${index}].${key}`));
  array(item.evidence, `positions[${index}].evidence`).forEach((evidence, evidenceIndex) => {
    const itemEvidence = record(evidence, `positions[${index}].evidence[${evidenceIndex}]`);
    string(itemEvidence.source, `positions[${index}].evidence[${evidenceIndex}].source`);
    if (itemEvidence.locator !== undefined) string(itemEvidence.locator, `positions[${index}].evidence[${evidenceIndex}].locator`);
    if (itemEvidence.status !== "provided" && itemEvidence.status !== "missing") throw new Error(`positions[${index}].evidence[${evidenceIndex}].status is invalid`);
  });
  if (typeof item.confidence !== "string" || !confidence.has(item.confidence)) throw new Error(`positions[${index}].confidence is invalid`);
  if (profileId === "generic") return { id: item.id as string, role: item.role as string };
  string(item.stageId, `positions[${index}].stageId`);
  return {
    id: item.id as string,
    role: item.role as string,
    stageId: item.stageId as string,
    inputPositionIds: stringList(item.inputPositionIds, `positions[${index}].inputPositionIds`),
  };
}

function researchPositionContract(positions: ParsedPosition[], profile: ResearchProfile): void {
  const expectedRoles = profile.stages.flatMap((stage) => stage.roles);
  if (positions.length !== expectedRoles.length || expectedRoles.some((role) => positions.filter((position) => position.role === role).length !== 1)) {
    throw new Error("positions must include every role in the research-deliberation profile exactly once");
  }
  if (new Set(positions.map((position) => position.id)).size !== positions.length) throw new Error("positions ids must be unique");

  const byStage = new Map(profile.stages.map((stage) => [stage.id, stage]));
  positions.forEach((position, index) => {
    const stage = byStage.get(position.stageId!);
    if (!stage || !stage.roles.includes(position.role)) throw new Error(`positions[${index}].stageId is invalid for its role`);
  });

  const idsFor = (stageId: string) => positions.filter((position) => position.stageId === stageId).map((position) => position.id);
  const discoveryIds = idsFor("discovery");
  const reviewIds = idsFor("review");
  const publicationIds = idsFor("publication-gate");
  const editorialIds = idsFor("editorial");
  positions.filter((position) => position.stageId === "discovery").forEach((position) => equalLists(position.inputPositionIds!, [], `position ${position.id} inputPositionIds`));
  positions.filter((position) => position.stageId === "review").forEach((position) => equalLists(position.inputPositionIds!, discoveryIds, `position ${position.id} inputPositionIds`));
  positions.filter((position) => position.stageId === "publication-gate").forEach((position) => equalLists(position.inputPositionIds!, reviewIds, `position ${position.id} inputPositionIds`));
  positions.filter((position) => position.stageId === "editorial").forEach((position) => equalLists(position.inputPositionIds!, publicationIds, `position ${position.id} inputPositionIds`));
  if (editorialIds.length !== 1) throw new Error("editorial stage must contain one Conversation Editor position");
}

function crossExamination(value: unknown, index: number): void {
  const item = record(value, `crossExaminations[${index}]`);
  ["reviewerRole", "targetPositionId", "challenge"].forEach((key) => string(item[key], `crossExaminations[${index}].${key}`));
}

function decision(value: unknown, index: number): void {
  const item = record(value, `decisions[${index}]`);
  string(item.positionId, `decisions[${index}].positionId`);
  if (typeof item.status !== "string" || !decisions.has(item.status)) throw new Error(`decisions[${index}].status is invalid`);
  string(item.reason, `decisions[${index}].reason`);
}

function record(value: unknown, label: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as UnknownRecord;
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}
function strings(value: unknown, label: string): void { array(value, label).forEach((item, index) => string(item, `${label}[${index}]`)); }
function stringList(value: unknown, label: string): string[] { return array(value, label).map((item, index) => { string(item, `${label}[${index}]`); return item as string; }); }
function string(value: unknown, label: string): void { if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`); }
function equal(value: unknown, expected: string, label: string): void { if (value !== expected) throw new Error(`${label} must be ${expected}`); }
function equalLists(actual: readonly string[], expected: readonly string[], label: string): void {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) throw new Error(`${label} must match its allowed handoff`);
}
