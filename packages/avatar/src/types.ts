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
export type AvatarAppearanceVersion = 1 | 2;

export type HeadShape =
  | "round"
  | "oval"
  | "soft-square"
  | "wide"
  | "heart"
  | "pear"
  | "long"
  | "diamond";
export type HairStyle =
  | "bare"
  | "crop"
  | "wave"
  | "bob"
  | "tuft"
  | "cap"
  | "curls"
  | "buzz"
  | "side-sweep"
  | "bun"
  | "locs"
  | "quiff"
  | "shag"
  | "double-puff"
  | "side-braid";
export type EyeStyle = "round" | "soft" | "wide" | "almond" | "small";
export type BrowStyle = "soft" | "straight" | "arched" | "bold" | "skeptical";
export type AccessoryStyle =
  | "none"
  | "round-glasses"
  | "square-glasses"
  | "monocle";
export type NoseStyle = "curve" | "button" | "wedge" | "dash";
export type MouthStyle = "small" | "wide" | "crooked" | "soft";
export type FaceMark = "none" | "freckles" | "blush" | "mole" | "scar";
export type AvatarPaletteName = "ink" | "clay" | "cocoa" | "ochre" | "rose" | "umber";
export type AvatarPersonality = "calm" | "curious" | "focused" | "bright" | "wry";

export interface AvatarIdentity {
  readonly appearanceVersion: AvatarAppearanceVersion;
  readonly seedHash: number;
  readonly headShape: HeadShape;
  readonly hairStyle: HairStyle;
  readonly eyeStyle: EyeStyle;
  readonly browStyle: BrowStyle;
  readonly accessory: AccessoryStyle;
  readonly noseStyle: NoseStyle;
  readonly mouthStyle: MouthStyle;
  readonly faceMark: FaceMark;
  readonly palette: AvatarPaletteName;
  readonly personality: AvatarPersonality;
  readonly eyeSpacing: number;
  readonly eyeY: number;
  readonly mouthY: number;
  readonly pupilSize: number;
  readonly featureScale: number;
  readonly faceOffsetX: number;
  readonly lineTilt: number;
  readonly restingTilt: number;
  readonly motionIntensity: number;
  readonly blinkDurationMs: number;
  readonly motionDelayMs: number;
}

export interface AgentAvatarProps {
  readonly agentId: string;
  readonly name: string;
  readonly avatarSeed: string;
  readonly appearanceVersion?: AvatarAppearanceVersion;
  readonly status: AvatarStatus;
  readonly size?: number;
  readonly motion?: AvatarMotion;
  readonly decorative?: boolean;
  readonly className?: string;
}
