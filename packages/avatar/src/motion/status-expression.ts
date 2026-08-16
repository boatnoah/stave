import type { AvatarStatus } from "../types";

export type MouthShape = "neutral" | "focused" | "concerned" | "smile";

export interface StatusExpression {
  readonly mouth: MouthShape;
  readonly browLift: number;
  readonly gazeY: number;
}

const expressions: Record<AvatarStatus, StatusExpression> = {
  idle: { mouth: "neutral", browLift: 0, gazeY: 0 },
  queued: { mouth: "neutral", browLift: 0, gazeY: 0 },
  working: { mouth: "focused", browLift: 0, gazeY: 0 },
  reviewing: { mouth: "focused", browLift: -0.2, gazeY: 0 },
  waiting: { mouth: "neutral", browLift: -1, gazeY: -0.7 },
  blocked: { mouth: "concerned", browLift: -0.5, gazeY: 0.35 },
  done: { mouth: "smile", browLift: -0.35, gazeY: 0 },
  failed: { mouth: "concerned", browLift: -0.15, gazeY: 0.45 },
};

export function getStatusExpression(status: AvatarStatus): StatusExpression {
  return expressions[status];
}
