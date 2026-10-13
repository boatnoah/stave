import type { AgentId, ProjectId } from "./ids";
import {
  instantiateTeam,
  type ProjectAgent,
  softwareDeliveryTeamV1,
  type TeamMemberTemplate,
  type TeamTemplate,
} from "./team";
import type { TicketStage } from "./workflow";

export type BoardWorkStage = Exclude<TicketStage, "todo" | "done">;

export interface ProjectBoardSettings {
  readonly wipLimits: Readonly<Record<BoardWorkStage, number>>;
  readonly showNeedsLane: boolean;
}

export const defaultProjectBoardSettings: ProjectBoardSettings = {
  wipLimits: { implementation: 2, review: 1, qa: 2 },
  showNeedsLane: false,
};

export interface Project {
  readonly id: ProjectId;
  readonly name: string;
  readonly repositoryPath: string | null;
  readonly teamTemplateId: string;
  readonly teamTemplateVersion: number;
  readonly agents: readonly ProjectAgent[];
  readonly boardSettings: ProjectBoardSettings;
}

export interface CreateProjectInput {
  readonly id: ProjectId;
  readonly name: string;
  readonly repositoryPath?: string | null;
  readonly teamTemplate?: TeamTemplate;
  readonly createAgentId: (member: TeamMemberTemplate) => AgentId;
}

export function createProject(input: CreateProjectInput): Project {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error("Project name cannot be empty");
  }

  const template = input.teamTemplate ?? softwareDeliveryTeamV1;
  return {
    id: input.id,
    name,
    repositoryPath: input.repositoryPath?.trim() || null,
    teamTemplateId: template.id,
    teamTemplateVersion: template.version,
    agents: instantiateTeam(input.id, input.createAgentId, template),
    boardSettings: defaultProjectBoardSettings,
  };
}
