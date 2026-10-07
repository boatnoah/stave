import type { AvatarGeometry } from "../geometry/create-avatar-geometry";
import type {
  AccessoryStyle,
  AvatarPersonality,
  BrowStyle,
  EyeStyle,
} from "../types";

interface EyesProps {
  readonly accessory: AccessoryStyle;
  readonly browAsymmetry: number;
  readonly browLift: number;
  readonly browStyle: BrowStyle;
  readonly eyeStyle: EyeStyle;
  readonly featureScale: number;
  readonly friendlyLids: boolean;
  readonly gazeX: number;
  readonly gazeY: number;
  readonly geometry: AvatarGeometry;
  readonly personality: AvatarPersonality;
  readonly pupilSize: number;
}

interface EyeMetrics {
  readonly gazeX: number;
  readonly gazeY: number;
  readonly pupilScale: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

const eyeMetrics: Record<EyeStyle, EyeMetrics> = {
  round: { radiusX: 3.05, radiusY: 3.05, pupilScale: 1, gazeX: 1, gazeY: 1 },
  soft: { radiusX: 3.35, radiusY: 2.6, pupilScale: 1, gazeX: 1, gazeY: 0.8 },
  wide: {
    radiusX: 3.85,
    radiusY: 3.45,
    pupilScale: 0.9,
    gazeX: 1.05,
    gazeY: 0.9,
  },
  almond: {
    radiusX: 3.8,
    radiusY: 2.15,
    pupilScale: 0.88,
    gazeX: 0.9,
    gazeY: 0.42,
  },
  small: {
    radiusX: 2.55,
    radiusY: 2.35,
    pupilScale: 0.9,
    gazeX: 0.75,
    gazeY: 0.7,
  },
  bead: {
    radiusX: 1.65,
    radiusY: 1.65,
    pupilScale: 1.15,
    gazeX: 0.42,
    gazeY: 0.36,
  },
  button: {
    radiusX: 3.2,
    radiusY: 3.2,
    pupilScale: 1.2,
    gazeX: 0.86,
    gazeY: 0.84,
  },
  sleepy: {
    radiusX: 3.65,
    radiusY: 1.75,
    pupilScale: 0.76,
    gazeX: 0.84,
    gazeY: 0.25,
  },
  tall: { radiusX: 2.5, radiusY: 3.9, pupilScale: 0.96, gazeX: 0.62, gazeY: 1 },
  hooded: {
    radiusX: 3.5,
    radiusY: 2.5,
    pupilScale: 0.9,
    gazeX: 0.88,
    gazeY: 0.48,
  },
  uneven: {
    radiusX: 3.25,
    radiusY: 3,
    pupilScale: 0.96,
    gazeX: 0.78,
    gazeY: 0.68,
  },
};

const personalityOpenness: Record<AvatarPersonality, number> = {
  calm: 0.96,
  curious: 1.06,
  focused: 0.86,
  bright: 1.04,
  wry: 0.82,
};

const friendlyPersonalityOpenness: Record<AvatarPersonality, number> = {
  calm: 0.96,
  curious: 1.02,
  focused: 0.86,
  bright: 1,
  wry: 0.82,
};

const friendlyOpenness: Record<EyeStyle, number> = {
  round: 0.97,
  soft: 0.97,
  wide: 0.92,
  almond: 0.98,
  small: 0.97,
  bead: 1,
  button: 0.94,
  sleepy: 0.97,
  tall: 0.9,
  hooded: 0.95,
  uneven: 0.94,
};

const friendlyPupilBoost: Record<EyeStyle, number> = {
  round: 1.04,
  soft: 1.04,
  wide: 1.16,
  almond: 1.06,
  small: 1.04,
  bead: 1,
  button: 1,
  sleepy: 1.08,
  tall: 1.15,
  hooded: 1.08,
  uneven: 1.09,
};

const lidAperture: Record<EyeStyle, number> = {
  round: 0.58,
  soft: 0.55,
  wide: 0.42,
  almond: 0.58,
  small: 0.55,
  bead: 0.78,
  button: 0.45,
  sleepy: 0.7,
  tall: 0.38,
  hooded: 0.66,
  uneven: 0.46,
};

function getLidAperture(style: EyeStyle, side: "left" | "right"): number {
  return style === "uneven" && side === "right" ? 0.55 : lidAperture[style];
}

function browPath(
  style: BrowStyle,
  centerX: number,
  y: number,
  side: "left" | "right",
): string {
  if (style === "straight" || style === "bold") {
    return `M${centerX - 3.3} ${y} Q${centerX} ${y - 0.2} ${centerX + 3.3} ${y}`;
  }
  if (style === "arched") {
    return `M${centerX - 3.4} ${y + 0.4} Q${centerX} ${y - 2} ${centerX + 3.4} ${y + 0.4}`;
  }
  if (style === "skeptical") {
    return side === "left"
      ? `M${centerX - 3.2} ${y + 0.6} Q${centerX} ${y - 0.9} ${centerX + 3.2} ${y - 0.35}`
      : `M${centerX - 3.2} ${y - 0.15} Q${centerX} ${y - 1.7} ${centerX + 3.2} ${y + 0.5}`;
  }
  return `M${centerX - 3.2} ${y + 0.25} Q${centerX} ${y - 1.15} ${centerX + 3.2} ${y}`;
}

function eyeDimensions(
  style: EyeStyle,
  side: "left" | "right",
  featureScale: number,
  openness: number,
  friendly: boolean,
): {
  readonly radiusX: number;
  readonly radiusY: number;
  readonly pupilScale: number;
} {
  const base = eyeMetrics[style];
  const unevenScale =
    style === "uneven"
      ? side === "left"
        ? { x: 1.01, y: 1.01, pupil: 1.01 }
        : { x: 0.92, y: 0.9, pupil: 0.96 }
      : { x: 1, y: 1, pupil: 1 };

  return {
    radiusX: base.radiusX * featureScale * unevenScale.x,
    radiusY: base.radiusY * featureScale * openness * unevenScale.y,
    pupilScale:
      base.pupilScale *
      unevenScale.pupil *
      (friendly ? friendlyPupilBoost[style] : 1),
  };
}

interface EyeShapeProps {
  readonly centerX: number;
  readonly centerY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly side: "left" | "right";
  readonly style: EyeStyle;
}

function EyeShape({
  centerX,
  centerY,
  radiusX,
  radiusY,
  side,
  style,
}: EyeShapeProps) {
  if (style === "bead") return null;

  if (style === "almond" || (style === "uneven" && side === "right")) {
    return (
      <path
        className="agent-avatar__eye-white agent-avatar__eye-white--almond"
        d={`M${centerX - radiusX} ${centerY} Q${centerX} ${centerY - radiusY * 1.08} ${centerX + radiusX} ${centerY} Q${centerX} ${centerY + radiusY * 1.08} ${centerX - radiusX} ${centerY} Z`}
      />
    );
  }

  if (style === "sleepy") {
    return (
      <path
        className="agent-avatar__eye-white agent-avatar__eye-white--sleepy"
        d={`M${centerX - radiusX} ${centerY + 0.2} Q${centerX} ${centerY - radiusY} ${centerX + radiusX} ${centerY + 0.15} Q${centerX} ${centerY + radiusY * 0.72} ${centerX - radiusX} ${centerY + 0.2} Z`}
      />
    );
  }

  if (style === "hooded") {
    return (
      <path
        className="agent-avatar__eye-white agent-avatar__eye-white--hooded"
        d={`M${centerX - radiusX} ${centerY + 0.4} Q${centerX} ${centerY - radiusY * 0.92} ${centerX + radiusX} ${centerY + 0.15} Q${centerX} ${centerY + radiusY} ${centerX - radiusX} ${centerY + 0.4} Z`}
      />
    );
  }

  return (
    <ellipse
      className={`agent-avatar__eye-white agent-avatar__eye-white--${style}`}
      cx={centerX}
      cy={centerY}
      rx={radiusX}
      ry={radiusY}
    />
  );
}

function FriendlyLid({
  centerX,
  centerY,
  radiusX,
  radiusY,
  side,
  style,
}: EyeShapeProps) {
  const aperture = getLidAperture(style, side);
  const horizontalInset = style === "bead" ? radiusX * 0.2 : 0;
  const leftX = centerX - radiusX + horizontalInset - 0.18;
  const rightX = centerX + radiusX - horizontalInset + 0.18;
  const coverLeftX = leftX - 0.7;
  const coverRightX = rightX + 0.7;
  const sideDrift = side === "left" ? -0.08 : 0.08;
  const leftY = centerY - radiusY * 0.04 + sideDrift;
  const rightY = centerY - radiusY * 0.04 - sideDrift;
  const controlX = centerX + (side === "left" ? -0.14 : 0.14);
  const controlY = centerY - radiusY * aperture;
  const coverY = centerY - radiusY - 1.4;

  return (
    <g
      className={`agent-avatar__eye-lid-layer agent-avatar__eye-lid-layer--${style}`}
    >
      <path
        className="agent-avatar__eye-lid-cover"
        d={`M${leftX} ${leftY} L${coverLeftX} ${coverY} L${coverRightX} ${coverY} L${rightX} ${rightY} Q${controlX} ${controlY} ${leftX} ${leftY} Z`}
      />
      <path
        className="agent-avatar__eye-lid"
        d={`M${leftX} ${leftY} Q${controlX} ${controlY} ${rightX} ${rightY}`}
      />
    </g>
  );
}

interface EyeProps extends EyeShapeProps {
  readonly friendlyLids: boolean;
  readonly gazeX: number;
  readonly gazeY: number;
  readonly pupilScale: number;
  readonly pupilSize: number;
}

function Eye({
  centerX,
  centerY,
  friendlyLids,
  gazeX,
  gazeY,
  pupilScale,
  pupilSize,
  radiusX,
  radiusY,
  side,
  style,
}: EyeProps) {
  const metrics = eyeMetrics[style];
  const renderedPupilSize = pupilSize * pupilScale;
  const pupilX = centerX + gazeX * metrics.gazeX;
  const desiredPupilY = centerY + gazeY * metrics.gazeY;
  const minimumPupilY =
    centerY - radiusY * getLidAperture(style, side) + renderedPupilSize * 0.35;
  const pupilY = friendlyLids
    ? Math.max(desiredPupilY, minimumPupilY)
    : desiredPupilY;

  return (
    <g
      className={`agent-avatar__eye agent-avatar__eye--${side}`}
      data-eye-family={style}
    >
      <EyeShape
        centerX={centerX}
        centerY={centerY}
        radiusX={radiusX}
        radiusY={radiusY}
        side={side}
        style={style}
      />
      <g className={`agent-avatar__pupil agent-avatar__pupil--${side}`}>
        <circle cx={pupilX} cy={pupilY} r={renderedPupilSize} />
        {style === "bead" ? null : (
          <circle
            className="agent-avatar__pupil-glint"
            cx={pupilX - renderedPupilSize * 0.3}
            cy={pupilY - renderedPupilSize * 0.34}
            r={Math.max(0.18, renderedPupilSize * 0.2)}
          />
        )}
      </g>
      {friendlyLids ? (
        <FriendlyLid
          centerX={centerX}
          centerY={centerY}
          radiusX={radiusX}
          radiusY={radiusY}
          side={side}
          style={style}
        />
      ) : null}
    </g>
  );
}

export function Eyes({
  accessory,
  browAsymmetry,
  browLift,
  browStyle,
  eyeStyle,
  featureScale,
  friendlyLids,
  gazeX,
  gazeY,
  geometry,
  personality,
  pupilSize,
}: EyesProps) {
  const personalityScale = friendlyLids
    ? friendlyPersonalityOpenness[personality]
    : personalityOpenness[personality];
  const openness =
    personalityScale * (friendlyLids ? friendlyOpenness[eyeStyle] : 1);
  const leftDimensions = eyeDimensions(
    eyeStyle,
    "left",
    featureScale,
    openness,
    friendlyLids,
  );
  const rightDimensions = eyeDimensions(
    eyeStyle,
    "right",
    featureScale,
    openness,
    friendlyLids,
  );
  const leftX = geometry.face.leftEye.x;
  const leftY = geometry.face.leftEye.y;
  const rightX = geometry.face.rightEye.x;
  const rightY = geometry.face.rightEye.y;
  const maximumRadiusX = Math.max(
    leftDimensions.radiusX,
    rightDimensions.radiusX,
  );
  const maximumRadiusY = Math.max(
    leftDimensions.radiusY,
    rightDimensions.radiusY,
  );
  const legacyBrowClearance = eyeStyle === "tall" ? 7.15 : 6.15;
  const browClearance = friendlyLids
    ? Math.min(7.1, Math.max(5, maximumRadiusY + 2.6))
    : legacyBrowClearance;
  const leftBrowY = leftY - browClearance + browLift - browAsymmetry * 0.5;
  const rightBrowY = rightY - browClearance + browLift + browAsymmetry * 0.5;
  const glassWidth = Math.max(8.8, maximumRadiusX * 2 + 3.5);
  const uncappedGlassHeight = Math.max(8, maximumRadiusY * 2 + 3.1);
  const glassHeight = friendlyLids
    ? Math.min(10.5, uncappedGlassHeight)
    : uncappedGlassHeight;
  const bridgeY = (leftY + rightY) / 2;

  return (
    <g
      className="agent-avatar__eyes-and-brows"
      data-brow-style={browStyle}
      data-eye-style={eyeStyle}
    >
      <g className="agent-avatar__brows">
        <path d={browPath(browStyle, leftX, leftBrowY, "left")} />
        <path d={browPath(browStyle, rightX, rightBrowY, "right")} />
      </g>

      <Eye
        centerX={leftX}
        centerY={leftY}
        friendlyLids={friendlyLids}
        gazeX={gazeX}
        gazeY={gazeY}
        pupilScale={leftDimensions.pupilScale}
        pupilSize={pupilSize}
        radiusX={leftDimensions.radiusX}
        radiusY={leftDimensions.radiusY}
        side="left"
        style={eyeStyle}
      />
      <Eye
        centerX={rightX}
        centerY={rightY}
        friendlyLids={friendlyLids}
        gazeX={gazeX}
        gazeY={gazeY}
        pupilScale={rightDimensions.pupilScale}
        pupilSize={pupilSize}
        radiusX={rightDimensions.radiusX}
        radiusY={rightDimensions.radiusY}
        side="right"
        style={eyeStyle}
      />

      {accessory === "round-glasses" ? (
        <g className="agent-avatar__glasses agent-avatar__glasses--round">
          <ellipse
            cx={leftX}
            cy={leftY}
            rx={glassWidth / 2}
            ry={glassHeight / 2}
          />
          <ellipse
            cx={rightX}
            cy={rightY}
            rx={glassWidth / 2}
            ry={glassHeight / 2}
          />
          <path
            d={`M${leftX + glassWidth / 2} ${leftY} Q${(leftX + rightX) / 2} ${bridgeY - 1} ${rightX - glassWidth / 2} ${rightY}`}
          />
        </g>
      ) : null}

      {accessory === "square-glasses" ? (
        <g className="agent-avatar__glasses agent-avatar__glasses--square">
          <rect
            x={leftX - glassWidth / 2}
            y={leftY - glassHeight / 2}
            width={glassWidth}
            height={glassHeight}
            rx="2.1"
          />
          <rect
            x={rightX - glassWidth / 2}
            y={rightY - glassHeight / 2}
            width={glassWidth}
            height={glassHeight}
            rx="2.1"
          />
          <path
            d={`M${leftX + glassWidth / 2} ${leftY} Q${(leftX + rightX) / 2} ${bridgeY - 1} ${rightX - glassWidth / 2} ${rightY}`}
          />
        </g>
      ) : null}

      {accessory === "monocle" ? (
        <g className="agent-avatar__glasses agent-avatar__monocle">
          <ellipse
            cx={rightX}
            cy={rightY}
            rx={glassWidth / 2}
            ry={glassHeight / 2}
          />
          <path
            d={`M${rightX + glassWidth / 2 - 0.6} ${rightY + 3} Q${rightX + 7} 39 ${rightX + 6} 45`}
          />
        </g>
      ) : null}
    </g>
  );
}
