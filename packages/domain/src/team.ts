import type { AgentId, ProjectId } from "./ids";

export const agentRoles = ["tech_lead", "engineer", "qa"] as const;
export type AgentRole = (typeof agentRoles)[number];

export interface TeamMemberTemplate {
  readonly key: string;
  readonly displayName: string;
  readonly role: AgentRole;
  readonly avatarSeed: string;
  readonly persona: string;
}

export interface TeamTemplate {
  readonly id: string;
  readonly version: number;
  readonly members: readonly TeamMemberTemplate[];
}

export interface ProjectAgent extends TeamMemberTemplate {
  readonly id: AgentId;
  readonly projectId: ProjectId;
  readonly enabled: boolean;
}

export const softwareDeliveryTeamV1 = {
  id: "software_delivery",
  version: 1,
  members: [
    {
      key: "maya",
      displayName: "Maya",
      role: "tech_lead",
      avatarSeed: "maya-tech-lead",
      persona: "Plans the work, reviews changes, and keeps delivery coherent.",
    },
    {
      key: "alex",
      displayName: "Alex",
      role: "engineer",
      avatarSeed: "alex-engineer",
      persona:
        "Implements focused slices and records evidence from the codebase.",
    },
    {
      key: "sam",
      displayName: "Sam",
      role: "qa",
      avatarSeed: "sam-qa",
      persona: "Exercises finished behavior and reports specific failures.",
    },
  ],
} as const satisfies TeamTemplate;

export function instantiateTeam(
  projectId: ProjectId,
  createAgentId: (member: TeamMemberTemplate) => AgentId,
  template: TeamTemplate = softwareDeliveryTeamV1,
): readonly ProjectAgent[] {
  const keys = new Set<string>();
  const ids = new Set<AgentId>();

  if (
    template.id.trim().length === 0 ||
    !Number.isSafeInteger(template.version) ||
    template.version < 1
  ) {
    throw new Error(
      "Team template requires an id and positive integer version",
    );
  }

  if (template.members.length === 0) {
    throw new Error("Team template cannot be empty");
  }

  return template.members.map((member) => {
    if (keys.has(member.key)) {
      throw new Error(
        `Team template contains duplicate member key: ${member.key}`,
      );
    }
    keys.add(member.key);

    const id = createAgentId(member);
    if (ids.has(id)) {
      throw new Error(`Team template created duplicate agent id: ${id}`);
    }
    ids.add(id);

    return { ...member, id, projectId, enabled: true };
  });
}
