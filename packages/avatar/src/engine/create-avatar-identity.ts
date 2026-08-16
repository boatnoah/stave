import type {
  AccessoryStyle,
  AvatarIdentity,
  BrowStyle,
  EyeStyle,
  HairStyle,
  HeadShape,
} from "../types";

const headShapes: readonly HeadShape[] = ["round", "oval", "soft-square"];
const hairStyles: readonly HairStyle[] = ["crop", "wave", "bob", "tuft", "cap"];
const eyeStyles: readonly EyeStyle[] = ["round", "soft", "wide"];
const browStyles: readonly BrowStyle[] = ["soft", "straight", "arched"];
const accessories: readonly AccessoryStyle[] = [
  "none",
  "none",
  "none",
  "round-glasses",
  "square-glasses",
];

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

export function createAvatarIdentity(
  avatarSeed: string,
  appearanceVersion: 1 = 1,
): AvatarIdentity {
  const normalizedSeed = `${appearanceVersion}:${avatarSeed.trim().toLowerCase()}`;
  const seedHash = hashSeed(normalizedSeed);
  const random = createRandom(seedHash);

  return {
    appearanceVersion,
    seedHash,
    headShape: pick(headShapes, random),
    hairStyle: pick(hairStyles, random),
    eyeStyle: pick(eyeStyles, random),
    browStyle: pick(browStyles, random),
    accessory: pick(accessories, random),
    eyeSpacing: round(between(random, 8.4, 10.8)),
    faceOffsetX: round(between(random, -0.8, 0.8)),
    lineTilt: round(between(random, -0.75, 0.75)),
    blinkDurationMs: Math.round(between(random, 7_400, 12_800)),
    motionDelayMs: -Math.round(between(random, 400, 5_800)),
  };
}
