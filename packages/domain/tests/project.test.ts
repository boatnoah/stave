import { describe, expect, it } from "vitest";

import {
  agentId,
  createProject,
  instantiateTeam,
  nextStage,
  projectId,
  softwareDeliveryTeamV1,
} from "../src";

describe("createProject", () => {
  it("creates a project-owned three-agent software delivery team", () => {
    const project = createProject({
      id: projectId("project-1"),
      name: " Stave ",
      createAgentId: (member) => agentId(`project-1-${member.key}`),
    });

    expect(project.name).toBe("Stave");
    expect(project.teamTemplateId).toBe("software_delivery");
    expect(project.teamTemplateVersion).toBe(1);
    expect(project.agents.map(({ displayName, role }) => ({ displayName, role }))).toEqual([
      { displayName: "Maya", role: "tech_lead" },
      { displayName: "Alex", role: "engineer" },
      { displayName: "Sam", role: "qa" },
    ]);
    expect(project.agents.every((agent) => agent.projectId === project.id)).toBe(true);
  });

  it("accepts a project-specific team template without changing the factory", () => {
    const project = createProject({
      id: projectId("project-2"),
      name: "Custom",
      teamTemplate: {
        id: "solo",
        version: 1,
        members: [{ ...softwareDeliveryTeamV1.members[1], key: "builder" }],
      },
      createAgentId: (member) => agentId(`project-2-${member.key}`),
    });

    expect(project.agents).toHaveLength(1);
    expect(project.agents[0]?.displayName).toBe("Alex");
  });

  it("rejects empty project and team definitions", () => {
    expect(() => createProject({
      id: projectId("project-3"),
      name: " ",
      createAgentId: () => agentId("agent"),
    })).toThrow("Project name cannot be empty");

    expect(() => createProject({
      id: projectId("project-3"),
      name: "Stave",
      teamTemplate: { id: "empty", version: 1, members: [] },
      createAgentId: () => agentId("agent"),
    })).toThrow("Team template cannot be empty");
  });

  it("rejects duplicate agent identities at the template boundary", () => {
    expect(() => createProject({
      id: projectId("project-4"),
      name: "Stave",
      createAgentId: () => agentId("same-agent"),
    })).toThrow("Team template created duplicate agent id");
  });

  it("validates templates through the public team constructor", () => {
    const project = projectId("project-5");
    expect(() => instantiateTeam(project, () => agentId("agent"), {
      id: "empty",
      version: 1,
      members: [],
    })).toThrow("Team template cannot be empty");

    expect(() => instantiateTeam(project, () => agentId("agent"), {
      id: " ",
      version: 0,
      members: [softwareDeliveryTeamV1.members[0]],
    })).toThrow("Team template requires an id and positive integer version");

    expect(() => instantiateTeam(project, (member) => agentId(member.key), {
      id: "duplicate-keys",
      version: 1,
      members: [softwareDeliveryTeamV1.members[0], softwareDeliveryTeamV1.members[0]],
    })).toThrow("Team template contains duplicate member key");
  });
});

describe("ticket workflow", () => {
  it("defines the complete happy path", () => {
    expect(nextStage("todo")).toBe("implementation");
    expect(nextStage("implementation")).toBe("review");
    expect(nextStage("review")).toBe("qa");
    expect(nextStage("qa")).toBe("done");
  });
});
