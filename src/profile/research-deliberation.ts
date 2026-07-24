import { defineProfileRole, type DeliberationProfile, type ProfileRole } from "./types.js";

const publicRole = (id: string, title: string, purpose: string): ProfileRole =>
  defineProfileRole({
    id,
    title,
    purpose,
    kind: "public-research",
    dataVisibility: "evidence-packs-only",
    contextVisibility: "research-brief-and-evidence",
    capabilities: ["external-research"],
  });

export const researchDeliberationProfile: DeliberationProfile = Object.freeze({
  id: "research-deliberation",
  title: "Evidence-aware research deliberation",
  roles: Object.freeze([
    publicRole("fact-investigator", "Fact Investigator", "Verify feasibility claims and return cited evidence."),
    publicRole("positive-reviewer", "Positive Reviewer", "Find credible upside, analogous cases, and success conditions."),
    publicRole("neutral-reviewer", "Neutral Reviewer", "Evaluate claims from cited evidence without a directional preference."),
    publicRole("negative-reviewer", "Negative Reviewer", "Identify failure modes and evidence required before confidence."),
    publicRole("timeline-planner", "Timeline Planner", "Assess whether the work fits the supplied time and resource limits."),
    publicRole("current-experiment-designer", "Current Experiment Designer", "Design controls using only the current experimental context."),
    publicRole("future-experiment-designer", "Future Experiment Designer", "Propose incremental experiments enabled by future instruments."),
    publicRole("publication-editor", "Publication Editor", "Assess novelty, evidence threshold, and publication positioning from sources."),
    publicRole("science-journalist", "Science Journalist", "Assess public-facing significance without overstating claims."),
    publicRole("peer-researcher", "Peer Researcher", "Assess field relevance, reproducibility, and likely specialist response."),
    publicRole("conversation-editor", "Conversation Editor", "Turn role opinions into a readable evidence brief while preserving sources, uncertainty, disagreement, and next actions."),
    defineProfileRole({
      id: "blind-data-analyst",
      title: "Blind Internal Data Analyst",
      purpose: "Find statistical patterns in decontextualized numeric results without inferring experimental meaning.",
      kind: "blind-local-analysis",
      dataVisibility: "decontextualized-numeric-only",
      contextVisibility: "none",
      capabilities: ["local-analysis"],
    }),
  ]),
});
