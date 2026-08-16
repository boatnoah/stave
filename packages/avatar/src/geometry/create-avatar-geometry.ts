import type { AvatarIdentity, HeadShape } from "../types";

export interface AvatarPoint {
  readonly x: number;
  readonly y: number;
}

interface HeadPreset {
  readonly points: readonly AvatarPoint[];
  readonly tension: number;
  readonly face: {
    readonly leftEye: AvatarPoint;
    readonly rightEye: AvatarPoint;
    readonly noseTop: AvatarPoint;
    readonly noseBottom: AvatarPoint;
    readonly mouth: AvatarPoint;
  };
}

export interface AvatarGeometry {
  readonly headD: string;
  readonly headEchoD: string;
  readonly bounds: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  readonly ears: {
    readonly left: { readonly center: AvatarPoint; readonly radiusX: number; readonly radiusY: number };
    readonly right: { readonly center: AvatarPoint; readonly radiusX: number; readonly radiusY: number };
  };
  readonly face: {
    readonly leftEye: AvatarPoint;
    readonly rightEye: AvatarPoint;
    readonly noseTop: AvatarPoint;
    readonly noseBottom: AvatarPoint;
    readonly mouth: AvatarPoint;
    readonly leftMark: AvatarPoint;
    readonly rightMark: AvatarPoint;
  };
  readonly hair: {
    readonly leftTemple: AvatarPoint;
    readonly leftCrown: AvatarPoint;
    readonly top: AvatarPoint;
    readonly rightCrown: AvatarPoint;
    readonly rightTemple: AvatarPoint;
  };
}

const point = (x: number, y: number): AvatarPoint => ({ x, y });

const presets: Record<HeadShape, HeadPreset> = {
  round: {
    points: [
      point(31, 9), point(43, 12), point(50, 21), point(52, 34),
      point(47, 47), point(39, 54), point(31, 56), point(22, 53),
      point(15, 46), point(12, 34), point(15, 21), point(21, 12),
    ],
    tension: 0.75,
    face: {
      leftEye: point(22.4, 30), rightEye: point(40.7, 30.4),
      noseTop: point(31.7, 33), noseBottom: point(31.7, 39.5), mouth: point(31.5, 44),
    },
  },
  oval: {
    points: [
      point(32, 5.5), point(42, 9), point(47, 20), point(48, 34),
      point(44, 48), point(38, 56), point(32, 58), point(25, 56),
      point(19, 48), point(16, 34), point(17, 20), point(22, 9),
    ],
    tension: 0.8,
    face: {
      leftEye: point(24, 29.2), rightEye: point(40.3, 29.5),
      noseTop: point(31.8, 32), noseBottom: point(31.8, 40.3), mouth: point(32, 46),
    },
  },
  "soft-square": {
    points: [
      point(31, 7.5), point(43, 8), point(49, 15), point(49.5, 32),
      point(48, 49), point(40.5, 55.5), point(31, 56), point(22, 55),
      point(14.5, 48), point(14, 31), point(15, 15), point(21.5, 8),
    ],
    tension: 0.22,
    face: {
      leftEye: point(21.8, 29.4), rightEye: point(41.5, 29),
      noseTop: point(31.2, 32), noseBottom: point(31.2, 40), mouth: point(31, 44.5),
    },
  },
  wide: {
    points: [
      point(31.5, 10), point(45, 12), point(52, 21), point(53, 33),
      point(49, 45), point(40, 53), point(32, 54), point(23, 53),
      point(15, 45), point(11, 33), point(13, 21), point(20, 12),
    ],
    tension: 0.65,
    face: {
      leftEye: point(20.7, 30.5), rightEye: point(42.2, 30),
      noseTop: point(31.7, 33), noseBottom: point(31.7, 39.8), mouth: point(32, 43),
    },
  },
  heart: {
    points: [
      point(33, 8), point(47, 11), point(52, 21), point(49, 36),
      point(43, 48), point(38, 55), point(31, 59), point(26, 54),
      point(20, 47), point(15, 34), point(13, 21), point(22, 10),
    ],
    tension: 0.5,
    face: {
      leftEye: point(22.3, 29), rightEye: point(41.8, 29.6),
      noseTop: point(32.2, 32), noseBottom: point(32.2, 40), mouth: point(31.5, 44.5),
    },
  },
  pear: {
    points: [
      point(31, 7), point(41, 10), point(45, 22), point(50, 35),
      point(51, 47), point(42, 56), point(32, 58), point(23, 56),
      point(13, 47), point(12, 34), point(18, 21), point(22, 10),
    ],
    tension: 0.62,
    face: {
      leftEye: point(23, 29.5), rightEye: point(40.6, 30),
      noseTop: point(31.4, 32.5), noseBottom: point(31.4, 41), mouth: point(32, 45.5),
    },
  },
  long: {
    points: [
      point(33, 4), point(42, 8), point(46, 21), point(46.5, 36),
      point(44, 51), point(38, 58), point(32, 60), point(26, 58),
      point(20, 51), point(17.5, 36), point(18, 20), point(24, 8),
    ],
    tension: 0.72,
    face: {
      leftEye: point(25, 28.8), rightEye: point(40, 29.2),
      noseTop: point(32.4, 32), noseBottom: point(32.4, 41.5), mouth: point(32, 46.5),
    },
  },
  diamond: {
    points: [
      point(31.5, 6), point(40, 11), point(44, 22), point(52, 34),
      point(45, 47), point(38, 55), point(31, 59), point(24, 55),
      point(17, 47), point(12, 34), point(19, 22), point(23, 11),
    ],
    tension: 0.28,
    face: {
      leftEye: point(21.5, 31), rightEye: point(41.7, 30.5),
      noseTop: point(31.8, 33.5), noseBottom: point(31.8, 41.5), mouth: point(32, 45),
    },
  },
  bean: {
    points: [
      point(25, 6), point(40, 7), point(49, 16), point(53, 28),
      point(47, 43), point(40, 54), point(35, 59), point(25, 56),
      point(16, 51), point(10, 39), point(12, 25), point(15, 11),
    ],
    tension: 0.6,
    face: {
      leftEye: point(21.8, 31.5), rightEye: point(40.5, 30),
      noseTop: point(31.3, 33), noseBottom: point(31.3, 41), mouth: point(32.5, 45),
    },
  },
  box: {
    points: [
      point(31, 6.5), point(44, 7), point(50, 12), point(51, 30),
      point(50, 48), point(43, 56), point(31, 57), point(20, 56),
      point(13, 49), point(12.5, 30), point(13, 13), point(19, 7),
    ],
    tension: 0.08,
    face: {
      leftEye: point(21.5, 29.5), rightEye: point(41.2, 29),
      noseTop: point(31, 32), noseBottom: point(31.2, 40.5), mouth: point(31, 44.8),
    },
  },
};

const legacyPaths: Partial<Record<HeadShape, string>> = {
  round:
    "M15.5 28.3 C15.2 16.4 21.6 9.2 31.6 8.5 C42.8 7.8 49.4 16.2 48.7 29.8 C48 45.1 42.1 54 32 55.1 C20.8 54.7 15.8 44.7 15.5 28.3 Z",
  oval:
    "M17.1 26.4 C17.5 14.4 23.4 7.2 32.2 7.2 C41.2 7.5 47.2 15.2 47.1 28.2 C47 44.5 41.2 55.3 31.9 56 C22 55.1 16.5 43 17.1 26.4 Z",
  "soft-square":
    "M14.9 26.1 C15 15.5 20.4 9.3 30.4 8.7 C42 8.1 48.7 13.9 49.1 25.3 L48.2 41.8 C46.3 50.9 40.3 54.8 31.4 55.3 C22.5 54.7 16.9 50.1 15.3 41.4 Z",
  wide:
    "M12.8 27 C13 16.1 20.8 9.8 31.8 9.4 C44 9.1 51.1 16.3 51.3 27.7 L49.6 41.2 C45.9 50.8 40.5 54.1 31.6 54.2 C22.3 54.1 16.6 50.2 13.9 41 Z",
  heart:
    "M14.6 26.2 C14.8 15 22.1 8.4 31.8 9.6 C41.8 7.9 49.5 15 49.5 26.8 C49 41.1 42.1 52.8 32 57 C21.5 52.7 15.2 41.4 14.6 26.2 Z",
  pear:
    "M18.1 24.1 C19.2 13.8 24 8 32 8 C40.2 8 45 13.9 46 24.4 C51.2 34.8 48.5 47.8 40.5 53 C34.7 56.8 27.4 56.6 21.6 52.5 C14 47.2 11.9 34.8 18.1 24.1 Z",
  long:
    "M18.7 24.2 C19 12.3 24.1 5.9 32 5.8 C40.1 5.8 45.6 12.7 45.8 24.7 C46.4 41.7 41.1 56.8 32 58.2 C22.6 56.8 17.7 41.8 18.7 24.2 Z",
  diamond:
    "M20.4 17.1 C23.3 10.3 28.2 7 32.2 7 C36.5 7 41.2 10.6 44.3 17.6 C50.2 25.9 50.2 38 44.1 46.2 C40.1 52 36.1 55.8 31.9 57.4 C27.5 55.6 23.2 51.8 19.3 45.5 C13.4 36.8 14.3 25.3 20.4 17.1 Z",
};

function hashChannel(seed: number, channel: string): number {
  let hash = seed ^ 0x811c9dc5;
  for (let index = 0; index < channel.length; index += 1) {
    hash ^= channel.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function signed(seed: number, channel: string, amount: number): number {
  return ((hashChannel(seed, channel) / 4_294_967_295) * 2 - 1) * amount;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function createPath(points: readonly AvatarPoint[], tension: number): string {
  const count = points.length;
  let path = `M${round(points[0]!.x)} ${round(points[0]!.y)}`;

  for (let index = 0; index < count; index += 1) {
    const previous = points[(index - 1 + count) % count]!;
    const current = points[index]!;
    const next = points[(index + 1) % count]!;
    const afterNext = points[(index + 2) % count]!;
    const control1 = point(
      current.x + ((next.x - previous.x) / 6) * tension,
      current.y + ((next.y - previous.y) / 6) * tension,
    );
    const control2 = point(
      next.x - ((afterNext.x - current.x) / 6) * tension,
      next.y - ((afterNext.y - current.y) / 6) * tension,
    );
    path += ` C${round(control1.x)} ${round(control1.y)} ${round(control2.x)} ${round(control2.y)} ${round(next.x)} ${round(next.y)}`;
  }

  return `${path} Z`;
}

function legacyGeometry(identity: AvatarIdentity): AvatarGeometry {
  const centerX = 32;
  const leftEye = point(centerX - identity.eyeSpacing, identity.eyeY);
  const rightEye = point(centerX + identity.eyeSpacing, identity.eyeY);
  const preset = presets[identity.headShape];

  return {
    headD: legacyPaths[identity.headShape] ?? createPath(preset.points, preset.tension),
    headEchoD: legacyPaths[identity.headShape] ?? createPath(preset.points, preset.tension),
    bounds: { left: 14, right: 50, top: 7, bottom: 58 },
    ears: {
      left: { center: point(15.8, 32), radiusX: 3, radiusY: 3.2 },
      right: { center: point(48.2, 32), radiusX: 3, radiusY: 3.2 },
    },
    face: {
      leftEye,
      rightEye,
      noseTop: point(centerX, identity.eyeY + 2.4),
      noseBottom: point(centerX, identity.eyeY + 8.15 * identity.featureScale),
      mouth: point(centerX, identity.mouthY),
      leftMark: point(leftEye.x, identity.eyeY + 7.2),
      rightMark: point(rightEye.x, identity.eyeY + 7.2),
    },
    hair: {
      leftTemple: point(16, 23), leftCrown: point(21, 10), top: point(32, 7),
      rightCrown: point(43, 10), rightTemple: point(48, 23),
    },
  };
}

export function createAvatarGeometry(identity: AvatarIdentity): AvatarGeometry {
  if (identity.appearanceVersion < 3) {
    return legacyGeometry(identity);
  }

  const preset = presets[identity.headShape];
  const seed = identity.seedHash;
  const mirror = hashChannel(seed, "geometry:mirror") % 10 < 4;
  const crownLean = signed(seed, "geometry:crown-lean", 1.1);
  const crownSlope = signed(seed, "geometry:crown-slope", 0.8);
  const leftFullness = signed(seed, "geometry:left-fullness", 0.85);
  const rightFullness = signed(seed, "geometry:right-fullness", 0.85);
  const jawSkew = signed(seed, "geometry:jaw-skew", 0.75);
  const chinShift = signed(seed, "geometry:chin-shift", 1.05);

  let deformed = preset.points.map((source, index) => {
    let x = source.x;
    let y = source.y;

    if (index === 0 || index === 1 || index === 11) x += crownLean;
    if (index === 1) y += crownSlope;
    if (index === 11) y -= crownSlope;
    if (index === 2 || index === 3 || index === 4) x += rightFullness;
    if (index === 8 || index === 9 || index === 10) x -= leftFullness;
    if (index >= 4 && index <= 8) x += jawSkew;
    if (index === 5 || index === 6 || index === 7) x += chinShift;

    return point(x, y);
  });

  if (mirror) {
    deformed = deformed.map((value) => point(64 - value.x, value.y));
  }

  const echo = deformed.map((value, index) =>
    point(
      value.x + signed(seed, `geometry:echo-x:${index}`, 0.28),
      value.y + signed(seed, `geometry:echo-y:${index}`, 0.24),
    ),
  );
  const xs = deformed.map(({ x }) => x);
  const ys = deformed.map(({ y }) => y);
  const bounds = {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
  const mapFacePoint = (value: AvatarPoint, channel: string): AvatarPoint => {
    const mirroredX = mirror ? 64 - value.x : value.x;
    return point(
      mirroredX + signed(seed, `geometry:${channel}:x`, 0.48),
      value.y + signed(seed, `geometry:${channel}:y`, 0.42),
    );
  };
  const leftEyeBase = mirror ? preset.face.rightEye : preset.face.leftEye;
  const rightEyeBase = mirror ? preset.face.leftEye : preset.face.rightEye;
  const leftEye = mapFacePoint(leftEyeBase, "left-eye");
  const rightEye = mapFacePoint(rightEyeBase, "right-eye");
  const mouth = mapFacePoint(preset.face.mouth, "mouth");
  const earY = (leftEye.y + rightEye.y) / 2 + 1.7;
  const leftEarSize = 2.65 + signed(seed, "geometry:left-ear-size", 0.35);
  const rightEarSize = 2.65 + signed(seed, "geometry:right-ear-size", 0.35);

  return {
    headD: createPath(deformed, preset.tension),
    headEchoD: createPath(echo, preset.tension),
    bounds,
    ears: {
      left: {
        center: point(bounds.left + 0.7, earY + signed(seed, "geometry:left-ear-y", 0.38)),
        radiusX: leftEarSize,
        radiusY: leftEarSize + 0.35,
      },
      right: {
        center: point(bounds.right - 0.7, earY + signed(seed, "geometry:right-ear-y", 0.38)),
        radiusX: rightEarSize,
        radiusY: rightEarSize + 0.35,
      },
    },
    face: {
      leftEye,
      rightEye,
      noseTop: mapFacePoint(preset.face.noseTop, "nose-top"),
      noseBottom: mapFacePoint(preset.face.noseBottom, "nose-bottom"),
      mouth,
      leftMark: point(leftEye.x, leftEye.y + 7.1),
      rightMark: point(rightEye.x, rightEye.y + 7.1),
    },
    hair: {
      leftTemple: deformed[mirror ? 2 : 10]!,
      leftCrown: deformed[mirror ? 1 : 11]!,
      top: deformed[0]!,
      rightCrown: deformed[mirror ? 11 : 1]!,
      rightTemple: deformed[mirror ? 10 : 2]!,
    },
  };
}
