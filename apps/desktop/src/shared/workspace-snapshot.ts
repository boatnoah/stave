import type { ProjectBoardSettings, TicketDetails } from "@stave/domain";

export const desktopAgentRoles = ["tech_lead", "engineer", "qa"] as const;
export type DesktopAgentRole = (typeof desktopAgentRoles)[number];

export interface AgentSnapshot {
  readonly id: string;
  readonly displayName: string;
  readonly role: DesktopAgentRole;
  readonly avatarSeed: string;
  readonly enabled: boolean;
}

interface ProjectSnapshot {
  readonly id: string;
  readonly name: string;
  readonly repositoryPath: string | null;
  readonly teamTemplateId: string;
  readonly teamTemplateVersion: number;
  readonly agents: readonly AgentSnapshot[];
  readonly boardSettings: ProjectBoardSettings;
}

export interface WorkspaceSnapshot {
  readonly revision: number;
  readonly project: ProjectSnapshot | null;
  readonly tickets: readonly TicketSnapshot[];
  readonly activity: readonly ActivityEntry[];
  readonly runs: readonly RunSnapshot[];
  readonly chatMessages: readonly ChatMessageSnapshot[];
}

interface ChatMessageSnapshot {
  readonly id: string;
  readonly author: "user";
  readonly text: string;
  readonly channel: "team" | "releases" | "ticket" | "direct";
  readonly ticketId: string | null;
  readonly agentId: string | null;
  readonly createdAt: string;
}

export type WorkspaceEvent = {
  readonly type: "workspace.changed";
  readonly snapshot: WorkspaceSnapshot;
};

export type TicketStage = "todo" | "implementation" | "review" | "qa" | "done";
export type ExecutionState =
  | "ready"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled"
  | "interrupted"
  | "waiting_capacity"
  | "waiting_user";
export type RunMode = "simulation" | "codex";
export interface TicketSnapshot extends TicketDetails {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly stage: TicketStage;
  readonly execution: ExecutionState;
  readonly mode: RunMode;
  readonly assignedAgentId: string | null;
  readonly runId: string | null;
  readonly output: string;
  readonly workspace: {
    readonly path: string;
    readonly branch: string;
    readonly dirty: boolean;
  } | null;
}
interface ActivityEntry {
  readonly id: string;
  readonly ticketId: string | null;
  readonly message: string;
  readonly createdAt: string;
}
export interface RunSnapshot {
  readonly id: string;
  readonly ticketId: string;
  readonly agentId: string;
  readonly stage: Exclude<TicketStage, "todo" | "done">;
  readonly state: ExecutionState;
  readonly summary: string;
}
