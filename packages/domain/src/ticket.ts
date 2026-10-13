export const ticketTypes = [
  "task",
  "bug",
  "feature",
  "chore",
  "research",
] as const;
export type TicketType = (typeof ticketTypes)[number];

export const ticketPriorities = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof ticketPriorities)[number];

export const defaultTicketType: TicketType = "task";
export const defaultTicketPriority: TicketPriority = "medium";

export interface TicketDetails {
  readonly key: string;
  readonly type: TicketType;
  readonly priority: TicketPriority;
  readonly points: number | null;
  readonly epic: string | null;
  readonly labels: readonly string[];
}

export interface CreateTicketDetails {
  readonly type?: TicketType;
  readonly priority?: TicketPriority;
  readonly points?: number | null;
  readonly epic?: string | null;
  readonly labels?: readonly string[];
}

export function createTicketKey(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1)
    throw new Error("Ticket sequence must be a positive integer");
  return `STV-${sequence}`;
}

export function createTicketDetails(
  sequence: number,
  input: CreateTicketDetails = {},
): TicketDetails {
  return {
    key: createTicketKey(sequence),
    type: input.type ?? defaultTicketType,
    priority: input.priority ?? defaultTicketPriority,
    points: input.points ?? null,
    epic: input.epic?.trim() || null,
    labels: [...new Set(input.labels?.map((label) => label.trim()) ?? [])],
  };
}
