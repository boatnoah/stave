import { agentId, createProject, projectId, type Project } from "@stave/domain";

import type { CreateProjectRequest } from "../../shared/desktop-api";
import type { WorkspaceEvent, WorkspaceSnapshot } from "../../shared/workspace-snapshot";

export type WorkspaceListener = (event: WorkspaceEvent) => void;

export class StaveApplication {
  #project: Project | null = null;
  #revision = 0;
  readonly #listeners = new Set<WorkspaceListener>();

  getSnapshot(): WorkspaceSnapshot {
    return {
      revision: this.#revision,
      project: this.#project === null ? null : {
        id: this.#project.id,
        name: this.#project.name,
        repositoryPath: this.#project.repositoryPath,
        teamTemplateId: this.#project.teamTemplateId,
        teamTemplateVersion: this.#project.teamTemplateVersion,
        agents: this.#project.agents.map((agent) => ({
          id: agent.id,
          displayName: agent.displayName,
          role: agent.role,
          avatarSeed: agent.avatarSeed,
          enabled: agent.enabled,
        })),
      },
    };
  }

  createProject(request: CreateProjectRequest): WorkspaceSnapshot {
    const id = projectId(crypto.randomUUID());
    this.#project = createProject({
      id,
      name: request.name,
      repositoryPath: request.repositoryPath,
      createAgentId: (member) => agentId(`${id}:${member.key}`),
    });
    this.#revision += 1;
    const snapshot = this.getSnapshot();
    this.#emit({ type: "workspace.changed", snapshot });
    return snapshot;
  }

  subscribe(listener: WorkspaceListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit(event: WorkspaceEvent): void {
    for (const listener of this.#listeners) listener(event);
  }
}
