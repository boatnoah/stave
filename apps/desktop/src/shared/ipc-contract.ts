import { desktopAgentRoles, type WorkspaceEvent, type WorkspaceSnapshot } from "./workspace-snapshot";
import type { CreateProjectRequest } from "./desktop-api";

export const ipcChannels = {
  getWorkspaceSnapshot: "stave:workspace:get-snapshot",
  createProject: "stave:projects:create",
  workspaceEvent: "stave:events:workspace",
} as const;

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

export function parseCreateProjectRequest(value: unknown): CreateProjectRequest {
  const record = requireRecord(value, "Create project request");
  const repositoryPath = record.repositoryPath;
  if (repositoryPath !== undefined && typeof repositoryPath !== "string") {
    throw new Error("Repository path must be a string");
  }

  return {
    name: requireString(record.name, "Project name"),
    ...(repositoryPath?.trim() ? { repositoryPath: repositoryPath.trim() } : {}),
  };
}

export function parseWorkspaceSnapshot(value: unknown): WorkspaceSnapshot {
  const snapshot = requireRecord(value, "Workspace snapshot");
  if (!Number.isSafeInteger(snapshot.revision) || Number(snapshot.revision) < 0) {
    throw new Error("Workspace revision must be a non-negative integer");
  }
  if (snapshot.project === null) {
    return { revision: Number(snapshot.revision), project: null };
  }

  const project = requireRecord(snapshot.project, "Project snapshot");
  if (!Number.isSafeInteger(project.teamTemplateVersion) || Number(project.teamTemplateVersion) < 1) {
    throw new Error("Team template version must be a positive integer");
  }
  if (!Array.isArray(project.agents)) {
    throw new Error("Project agents must be an array");
  }
  const agents = project.agents.map((candidate) => {
    const agent = requireRecord(candidate, "Agent snapshot");
    const role = requireString(agent.role, "Agent role");
    if (!desktopAgentRoles.includes(role as (typeof desktopAgentRoles)[number])) {
      throw new Error(`Unsupported agent role: ${role}`);
    }
    if (typeof agent.enabled !== "boolean") {
      throw new Error("Agent enabled must be a boolean");
    }
    return {
      id: requireString(agent.id, "Agent id"),
      displayName: requireString(agent.displayName, "Agent display name"),
      role: role as (typeof desktopAgentRoles)[number],
      avatarSeed: requireString(agent.avatarSeed, "Agent avatar seed"),
      enabled: agent.enabled,
    };
  });

  return {
    revision: Number(snapshot.revision),
    project: {
      id: requireString(project.id, "Project id"),
      name: requireString(project.name, "Project name"),
      repositoryPath: project.repositoryPath === null ? null : requireString(project.repositoryPath, "Repository path"),
      teamTemplateId: requireString(project.teamTemplateId, "Team template id"),
      teamTemplateVersion: Number(project.teamTemplateVersion),
      agents,
    },
  };
}

export function parseWorkspaceEvent(value: unknown): WorkspaceEvent {
  const event = requireRecord(value, "Workspace event");
  if (event.type !== "workspace.changed") {
    throw new Error("Unsupported workspace event");
  }
  return { type: "workspace.changed", snapshot: parseWorkspaceSnapshot(event.snapshot) };
}
