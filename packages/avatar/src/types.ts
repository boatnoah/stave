export const avatarStatuses = [
  "idle",
  "queued",
  "working",
  "reviewing",
  "waiting",
  "blocked",
  "done",
  "failed",
] as const;

export type AvatarStatus = (typeof avatarStatuses)[number];

export type AvatarMotion = "auto" | "off";

export type HeadShape = "round" | "oval" | "soft-square";
export type HairStyle = "crop" | "wave" | "bob" | "tuft" | "cap";
export type EyeStyle = "round" | "soft" | "wide";
export type BrowStyle = "soft" | "straight" | "arched";
export type AccessoryStyle = "none" | "round-glasses" | "square-glasses";

export interface AvatarIdentity {
  readonly appearanceVersion: 1;
  readonly seedHash: number;
  readonly headShape: HeadShape;
  readonly hairStyle: HairStyle;
  readonly eyeStyle: EyeStyle;
  readonly browStyle: BrowStyle;
  readonly accessory: AccessoryStyle;
  readonly eyeSpacing: number;
  readonly faceOffsetX: number;
  readonly lineTilt: number;
  readonly blinkDurationMs: number;
  readonly motionDelayMs: number;
}

export interface AgentAvatarProps {
  readonly agentId: string;
  readonly name: string;
  readonly avatarSeed: string;
  readonly appearanceVersion?: 1;
  readonly status: AvatarStatus;
  readonly size?: number;
  readonly motion?: AvatarMotion;
  readonly decorative?: boolean;
  readonly className?: string;
}
