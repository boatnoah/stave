export const desktopAgentRoles = ["tech_lead", "engineer", "qa"] as const;
export type DesktopAgentRole = (typeof desktopAgentRoles)[number];

export interface AgentSnapshot {
  readonly id: string;
  readonly displayName: string;
  readonly role: DesktopAgentRole;
  readonly avatarSeed: string;
  readonly enabled: boolean;
}

export interface ProjectSnapshot {
  readonly id: string;
  readonly name: string;
  readonly repositoryPath: string | null;
  readonly teamTemplateId: string;
  readonly teamTemplateVersion: number;
  readonly agents: readonly AgentSnapshot[];
}

export interface WorkspaceSnapshot {
  readonly revision: number;
  readonly project: ProjectSnapshot | null;
}

export type WorkspaceEvent = {
  readonly type: "workspace.changed";
  readonly snapshot: WorkspaceSnapshot;
};
