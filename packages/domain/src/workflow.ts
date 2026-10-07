export const ticketStages = [
  "todo",
  "implementation",
  "review",
  "qa",
  "done",
] as const;
export type TicketStage = (typeof ticketStages)[number];

export type TicketWorkflow =
  | { readonly stage: TicketStage }
  | {
      readonly stage: "blocked";
      readonly resumeAt: Exclude<TicketStage, "done">;
      readonly reason: string;
    };

export type RunState =
  | "queued"
  | "running"
  | "waiting_retry"
  | "waiting_capacity"
  | "waiting_user"
  | "succeeded"
  | "failed"
  | "canceled"
  | "interrupted";

export function nextStage(stage: Exclude<TicketStage, "done">): TicketStage {
  switch (stage) {
    case "todo":
      return "implementation";
    case "implementation":
      return "review";
    case "review":
      return "qa";
    case "qa":
      return "done";
  }
}
