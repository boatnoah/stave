declare const idBrand: unique symbol;

export type Id<Entity extends string> = string & { readonly [idBrand]: Entity };

export type ProjectId = Id<"Project">;
export type AgentId = Id<"Agent">;
export type TicketId = Id<"Ticket">;
export type RunId = Id<"Run">;

function requireId<Entity extends string>(value: string, label: string): Id<Entity> {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} cannot be empty`);
  }

  return normalized as Id<Entity>;
}

export const projectId = (value: string): ProjectId => requireId(value, "Project id");
export const agentId = (value: string): AgentId => requireId(value, "Agent id");
export const ticketId = (value: string): TicketId => requireId(value, "Ticket id");
export const runId = (value: string): RunId => requireId(value, "Run id");
