import type { AvatarPersonality, AvatarStatus } from "../types";

export type MouthShape =
  | "neutral"
  | "focused"
  | "concerned"
  | "smile"
  | "open"
  | "smirk";

export interface StatusExpression {
  readonly mouth: MouthShape;
  readonly browLift: number;
  readonly browAsymmetry: number;
  readonly gazeX: number;
  readonly gazeY: number;
}

const baseExpressions: Record<AvatarStatus, StatusExpression> = {
  idle: { mouth: "neutral", browLift: 0, browAsymmetry: 0, gazeX: 0, gazeY: 0 },
  queued: {
    mouth: "neutral",
    browLift: 0,
    browAsymmetry: 0,
    gazeX: 0,
    gazeY: 0,
  },
  working: {
    mouth: "focused",
    browLift: 0,
    browAsymmetry: 0,
    gazeX: 0,
    gazeY: 0.25,
  },
  reviewing: {
    mouth: "focused",
    browLift: -0.2,
    browAsymmetry: 0,
    gazeX: -0.2,
    gazeY: 0,
  },
  waiting: {
    mouth: "neutral",
    browLift: -1,
    browAsymmetry: 0.25,
    gazeX: 0.25,
    gazeY: -0.7,
  },
  blocked: {
    mouth: "concerned",
    browLift: -0.5,
    browAsymmetry: 0.5,
    gazeX: -0.25,
    gazeY: 0.35,
  },
  done: {
    mouth: "smile",
    browLift: -0.35,
    browAsymmetry: 0,
    gazeX: 0,
    gazeY: 0,
  },
  failed: {
    mouth: "concerned",
    browLift: -0.15,
    browAsymmetry: 0.3,
    gazeX: 0.2,
    gazeY: 0.45,
  },
};

export function getStatusExpression(
  status: AvatarStatus,
  personality: AvatarPersonality = "calm",
): StatusExpression {
  const base = baseExpressions[status];

  if (personality === "curious") {
    return {
      ...base,
      mouth: status === "waiting" ? "open" : base.mouth,
      browLift:
        base.browLift -
        (status === "queued" || status === "idle" ? 0.35 : 0.15),
      browAsymmetry: base.browAsymmetry + 0.4,
      gazeX: base.gazeX - 0.35,
      gazeY: base.gazeY - 0.15,
    };
  }

  if (personality === "focused") {
    return {
      ...base,
      mouth: status === "idle" || status === "queued" ? "focused" : base.mouth,
      browLift:
        base.browLift +
        (status === "working" || status === "reviewing" ? 0.35 : 0.1),
      gazeY: base.gazeY + (status === "working" ? 0.35 : 0),
    };
  }

  if (personality === "bright") {
    return {
      ...base,
      mouth:
        status === "idle" || status === "queued"
          ? "smile"
          : status === "working"
            ? "neutral"
            : base.mouth,
      browLift: base.browLift - 0.25,
    };
  }

  if (personality === "wry") {
    return {
      ...base,
      mouth:
        status === "idle" || status === "queued" || status === "reviewing"
          ? "smirk"
          : base.mouth,
      browAsymmetry: base.browAsymmetry + 0.65,
      gazeX: base.gazeX + 0.45,
    };
  }

  return base;
}
