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
  wide: { radiusX: 3.85, radiusY: 3.45, pupilScale: 0.9, gazeX: 1.05, gazeY: 0.9 },
  almond: { radiusX: 3.8, radiusY: 2.15, pupilScale: 0.88, gazeX: 0.9, gazeY: 0.42 },
  small: { radiusX: 2.55, radiusY: 2.35, pupilScale: 0.9, gazeX: 0.75, gazeY: 0.7 },
  bead: { radiusX: 1.65, radiusY: 1.65, pupilScale: 1.15, gazeX: 0.42, gazeY: 0.36 },
  button: { radiusX: 3.2, radiusY: 3.2, pupilScale: 1.2, gazeX: 0.86, gazeY: 0.84 },
  sleepy: { radiusX: 3.65, radiusY: 1.75, pupilScale: 0.76, gazeX: 0.84, gazeY: 0.25 },
  tall: { radiusX: 2.5, radiusY: 3.9, pupilScale: 0.96, gazeX: 0.62, gazeY: 1 },
  hooded: { radiusX: 3.5, radiusY: 2.5, pupilScale: 0.9, gazeX: 0.88, gazeY: 0.48 },
  uneven: { radiusX: 3.25, radiusY: 3, pupilScale: 0.96, gazeX: 0.78, gazeY: 0.68 },
};

const personalityOpenness: Record<AvatarPersonality, number> = {
  calm: 0.96,
  curious: 1.06,
  focused: 0.86,
  bright: 1.04,
  wry: 0.82,
};

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
): { readonly radiusX: number; readonly radiusY: number; readonly pupilScale: number } {
  const base = eyeMetrics[style];
  const unevenScale =
    style === "uneven"
      ? side === "left"
        ? { x: 1.03, y: 1.03, pupil: 1.02 }
        : { x: 0.88, y: 0.82, pupil: 0.92 }
      : { x: 1, y: 1, pupil: 1 };

  return {
    radiusX: base.radiusX * featureScale * unevenScale.x,
    radiusY: base.radiusY * featureScale * openness * unevenScale.y,
    pupilScale: base.pupilScale * unevenScale.pupil,
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

function EyeShape({ centerX, centerY, radiusX, radiusY, side, style }: EyeShapeProps) {
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
      <g className="agent-avatar__eye-shell agent-avatar__eye-shell--sleepy">
        <path
          className="agent-avatar__eye-white"
          d={`M${centerX - radiusX} ${centerY + 0.2} Q${centerX} ${centerY - radiusY} ${centerX + radiusX} ${centerY + 0.15} Q${centerX} ${centerY + radiusY * 0.72} ${centerX - radiusX} ${centerY + 0.2} Z`}
        />
        <path
          className="agent-avatar__eye-lid"
          d={`M${centerX - radiusX} ${centerY - 0.05} Q${centerX} ${centerY - radiusY * 1.2} ${centerX + radiusX} ${centerY + 0.05}`}
        />
      </g>
    );
  }

  if (style === "hooded") {
    return (
      <g className="agent-avatar__eye-shell agent-avatar__eye-shell--hooded">
        <path
          className="agent-avatar__eye-white"
          d={`M${centerX - radiusX} ${centerY + 0.4} Q${centerX} ${centerY - radiusY * 0.92} ${centerX + radiusX} ${centerY + 0.15} Q${centerX} ${centerY + radiusY} ${centerX - radiusX} ${centerY + 0.4} Z`}
        />
        <path
          className="agent-avatar__eye-lid"
          d={`M${centerX - radiusX - 0.2} ${centerY - 0.2} Q${centerX - 0.2} ${centerY - radiusY * 1.3} ${centerX + radiusX + 0.2} ${centerY - 0.05}`}
        />
      </g>
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

interface EyeProps extends EyeShapeProps {
  readonly gazeX: number;
  readonly gazeY: number;
  readonly pupilScale: number;
  readonly pupilSize: number;
}

function Eye({
  centerX,
  centerY,
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
  const pupilY = centerY + gazeY * metrics.gazeY;

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
  gazeX,
  gazeY,
  geometry,
  personality,
  pupilSize,
}: EyesProps) {
  const openness = personalityOpenness[personality];
  const leftDimensions = eyeDimensions(eyeStyle, "left", featureScale, openness);
  const rightDimensions = eyeDimensions(eyeStyle, "right", featureScale, openness);
  const leftX = geometry.face.leftEye.x;
  const leftY = geometry.face.leftEye.y;
  const rightX = geometry.face.rightEye.x;
  const rightY = geometry.face.rightEye.y;
  const browClearance = eyeStyle === "tall" ? 7.15 : 6.15;
  const leftBrowY = leftY - browClearance + browLift - browAsymmetry * 0.5;
  const rightBrowY = rightY - browClearance + browLift + browAsymmetry * 0.5;
  const maximumRadiusX = Math.max(leftDimensions.radiusX, rightDimensions.radiusX);
  const maximumRadiusY = Math.max(leftDimensions.radiusY, rightDimensions.radiusY);
  const glassWidth = Math.max(8.8, maximumRadiusX * 2 + 3.5);
  const glassHeight = Math.max(8, maximumRadiusY * 2 + 3.1);
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
          <ellipse cx={leftX} cy={leftY} rx={glassWidth / 2} ry={glassHeight / 2} />
          <ellipse cx={rightX} cy={rightY} rx={glassWidth / 2} ry={glassHeight / 2} />
          <path d={`M${leftX + glassWidth / 2} ${leftY} Q${(leftX + rightX) / 2} ${bridgeY - 1} ${rightX - glassWidth / 2} ${rightY}`} />
        </g>
      ) : null}

      {accessory === "square-glasses" ? (
        <g className="agent-avatar__glasses agent-avatar__glasses--square">
          <rect x={leftX - glassWidth / 2} y={leftY - glassHeight / 2} width={glassWidth} height={glassHeight} rx="2.1" />
          <rect x={rightX - glassWidth / 2} y={rightY - glassHeight / 2} width={glassWidth} height={glassHeight} rx="2.1" />
          <path d={`M${leftX + glassWidth / 2} ${leftY} Q${(leftX + rightX) / 2} ${bridgeY - 1} ${rightX - glassWidth / 2} ${rightY}`} />
        </g>
      ) : null}

      {accessory === "monocle" ? (
        <g className="agent-avatar__glasses agent-avatar__monocle">
          <ellipse cx={rightX} cy={rightY} rx={glassWidth / 2} ry={glassHeight / 2} />
          <path d={`M${rightX + glassWidth / 2 - 0.6} ${rightY + 3} Q${rightX + 7} 39 ${rightX + 6} 45`} />
        </g>
      ) : null}
    </g>
  );
}
