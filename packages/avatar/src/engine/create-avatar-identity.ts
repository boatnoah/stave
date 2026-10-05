import type {
  AccessoryStyle,
  AvatarActingStyle,
  AvatarAppearanceVersion,
  AvatarDominantSide,
  AvatarIdentity,
  AvatarPaletteName,
  AvatarPersonality,
  BrowStyle,
  EyeStyle,
  FaceMark,
  HairStyle,
  HeadShape,
  MouthStyle,
  NoseStyle,
} from "../types";

const legacyHeadShapes: readonly HeadShape[] = ["round", "oval", "soft-square"];
const legacyHairStyles: readonly HairStyle[] = ["crop", "wave", "bob", "tuft", "cap"];
const legacyEyeStyles: readonly EyeStyle[] = ["round", "soft", "wide"];
const legacyBrowStyles: readonly BrowStyle[] = ["soft", "straight", "arched"];
const legacyAccessories: readonly AccessoryStyle[] = [
  "none",
  "none",
  "none",
  "round-glasses",
  "square-glasses",
];

const headShapes: readonly HeadShape[] = [
  "round",
  "oval",
  "soft-square",
  "wide",
  "heart",
  "pear",
  "long",
  "diamond",
];
const expressiveHeadShapes: readonly HeadShape[] = [...headShapes, "bean", "box"];
const hairStyles: readonly HairStyle[] = [
  "bare",
  "crop",
  "wave",
  "bob",
  "curls",
  "buzz",
  "side-sweep",
  "bun",
  "locs",
  "quiff",
  "shag",
  "double-puff",
  "side-braid",
];
const version2EyeStyles: readonly EyeStyle[] = ["round", "soft", "wide", "almond", "small"];
const version3EyeStyles = version2EyeStyles;
const expressiveEyeStyles: readonly EyeStyle[] = [
  "bead",
  "button",
  "almond",
  "sleepy",
  "tall",
  "hooded",
  "uneven",
  "wide",
];
const browStyles: readonly BrowStyle[] = [
  "soft",
  "straight",
  "arched",
  "bold",
  "skeptical",
];
const accessories: readonly AccessoryStyle[] = [
  "none",
  "none",
  "none",
  "none",
  "round-glasses",
  "square-glasses",
  "monocle",
];
const noseStyles: readonly NoseStyle[] = ["curve", "button", "wedge", "dash"];
const mouthStyles: readonly MouthStyle[] = ["small", "wide", "crooked", "soft"];
const faceMarks: readonly FaceMark[] = [
  "none",
  "none",
  "none",
  "freckles",
  "blush",
  "mole",
  "scar",
];
const palettes: readonly AvatarPaletteName[] = ["ink", "clay", "cocoa", "ochre", "rose", "umber"];
const personalities: readonly AvatarPersonality[] = [
  "calm",
  "curious",
  "focused",
  "bright",
  "wry",
];
const actingStyles: readonly AvatarActingStyle[] = [
  "ponderer",
  "mutterer",
  "nodder",
  "reactive",
  "reserved",
];
const dominantSides: readonly AvatarDominantSide[] = ["left", "right"];

function hashSeed(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function createRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pick<T>(values: readonly T[], random: () => number): T {
  return values[Math.floor(random() * values.length)]!;
}

function between(random: () => number, minimum: number, maximum: number): number {
  return minimum + random() * (maximum - minimum);
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function randomFor(seedHash: number, channel: string): () => number {
  return createRandom(hashSeed(`${seedHash}:${channel}`));
}

function pickFor<T>(seedHash: number, channel: string, values: readonly T[]): T {
  return pick(values, randomFor(seedHash, channel));
}

function betweenFor(seedHash: number, channel: string, minimum: number, maximum: number): number {
  return between(randomFor(seedHash, channel), minimum, maximum);
}

function createLegacyIdentity(avatarSeed: string): AvatarIdentity {
  const seedHash = hashSeed(`1:${avatarSeed.trim().toLowerCase()}`);
  const random = createRandom(seedHash);

  return {
    appearanceVersion: 1,
    seedHash,
    headShape: pick(legacyHeadShapes, random),
    hairStyle: pick(legacyHairStyles, random),
    eyeStyle: pick(legacyEyeStyles, random),
    browStyle: pick(legacyBrowStyles, random),
    accessory: pick(legacyAccessories, random),
    noseStyle: "curve",
    mouthStyle: "soft",
    faceMark: "none",
    palette: "ink",
    personality: "calm",
    actingStyle: "reserved",
    dominantSide: "right",
    eyeSpacing: round(between(random, 8.4, 10.8)),
    eyeY: 31,
    mouthY: 43.2,
    pupilSize: 1.25,
    featureScale: 1,
    faceOffsetX: round(between(random, -0.8, 0.8)),
    lineTilt: round(between(random, -0.75, 0.75)),
    restingTilt: 0,
    motionIntensity: 1,
    blinkDurationMs: Math.round(between(random, 7_400, 12_800)),
    motionDelayMs: -Math.round(between(random, 400, 5_800)),
  };
}

function createVersion2Identity(avatarSeed: string): AvatarIdentity {
  const seedHash = hashSeed(`2:${avatarSeed.trim().toLowerCase()}`);

  return {
    appearanceVersion: 2,
    seedHash,
    personality: pickFor(seedHash, "personality", personalities),
    headShape: pickFor(seedHash, "head", headShapes),
    hairStyle: pickFor(seedHash, "hair", hairStyles),
    eyeStyle: pickFor(seedHash, "eyes", version2EyeStyles),
    browStyle: pickFor(seedHash, "brows", browStyles),
    accessory: pickFor(seedHash, "accessory", accessories),
    noseStyle: pickFor(seedHash, "nose", noseStyles),
    mouthStyle: pickFor(seedHash, "mouth", mouthStyles),
    faceMark: pickFor(seedHash, "face-mark", faceMarks),
    palette: pickFor(seedHash, "palette", palettes),
    actingStyle: "reserved",
    dominantSide: "right",
    eyeSpacing: round(betweenFor(seedHash, "eye-spacing", 7.7, 11.15)),
    eyeY: round(betweenFor(seedHash, "eye-y", 29.8, 32.1)),
    mouthY: round(betweenFor(seedHash, "mouth-y", 42.2, 45.2)),
    pupilSize: round(betweenFor(seedHash, "pupil-size", 0.92, 1.34)),
    featureScale: round(betweenFor(seedHash, "feature-scale", 0.92, 1.08)),
    faceOffsetX: round(betweenFor(seedHash, "face-offset", -1.15, 1.15)),
    lineTilt: round(betweenFor(seedHash, "line-tilt", -1.1, 1.1)),
    restingTilt: round(betweenFor(seedHash, "resting-tilt", -0.65, 0.65)),
    motionIntensity: round(betweenFor(seedHash, "motion-intensity", 0.78, 1.22)),
    blinkDurationMs: Math.round(betweenFor(seedHash, "blink-duration", 6_800, 13_600)),
    motionDelayMs: -Math.round(betweenFor(seedHash, "motion-delay", 400, 7_200)),
  };
}

function createModernIdentity(
  avatarSeed: string,
  appearanceVersion: 3 | 4,
  availableEyeStyles: readonly EyeStyle[],
): AvatarIdentity {
  const seedHash = hashSeed(`${appearanceVersion}:${avatarSeed.trim().toLowerCase()}`);

  return {
    appearanceVersion,
    seedHash,
    personality: pickFor(seedHash, "personality", personalities),
    actingStyle: pickFor(seedHash, "acting-style", actingStyles),
    dominantSide: pickFor(seedHash, "dominant-side", dominantSides),
    headShape: pickFor(seedHash, "head", expressiveHeadShapes),
    hairStyle: pickFor(seedHash, "hair", hairStyles),
    eyeStyle: pickFor(seedHash, "eyes", availableEyeStyles),
    browStyle: pickFor(seedHash, "brows", browStyles),
    accessory: pickFor(seedHash, "accessory", accessories),
    noseStyle: pickFor(seedHash, "nose", noseStyles),
    mouthStyle: pickFor(seedHash, "mouth", mouthStyles),
    faceMark: pickFor(seedHash, "face-mark", faceMarks),
    palette: pickFor(seedHash, "palette", palettes),
    eyeSpacing: round(betweenFor(seedHash, "eye-spacing", 7.7, 11.15)),
    eyeY: round(betweenFor(seedHash, "eye-y", 29.8, 32.1)),
    mouthY: round(betweenFor(seedHash, "mouth-y", 42.2, 45.2)),
    pupilSize: round(betweenFor(seedHash, "pupil-size", 0.98, 1.38)),
    featureScale: round(betweenFor(seedHash, "feature-scale", 0.92, 1.08)),
    faceOffsetX: round(betweenFor(seedHash, "face-offset", -0.65, 0.65)),
    lineTilt: round(betweenFor(seedHash, "line-tilt", -1.1, 1.1)),
    restingTilt: round(betweenFor(seedHash, "resting-tilt", -0.8, 0.8)),
    motionIntensity: round(betweenFor(seedHash, "motion-intensity", 0.76, 1.25)),
    blinkDurationMs: Math.round(betweenFor(seedHash, "blink-duration", 6_800, 13_600)),
    motionDelayMs: -Math.round(betweenFor(seedHash, "motion-delay", 400, 7_200)),
  };
}

export function createAvatarIdentity(
  avatarSeed: string,
  appearanceVersion: AvatarAppearanceVersion = 4,
): AvatarIdentity {
  if (appearanceVersion === 1) return createLegacyIdentity(avatarSeed);
  if (appearanceVersion === 2) return createVersion2Identity(avatarSeed);
  if (appearanceVersion === 3) return createModernIdentity(avatarSeed, 3, version3EyeStyles);
  return createModernIdentity(avatarSeed, 4, expressiveEyeStyles);
}
