import type {
  AccessoryStyle,
  AvatarPersonality,
  BrowStyle,
  EyeStyle,
} from "../types";
import type { AvatarGeometry } from "../geometry/create-avatar-geometry";

interface EyesProps {
  readonly accessory: AccessoryStyle;
  readonly browAsymmetry: number;
  readonly browLift: number;
  readonly browStyle: BrowStyle;
  readonly eyeStyle: EyeStyle;
  readonly featureScale: number;
  readonly gazeX: number;
  readonly gazeY: number;
  readonly personality: AvatarPersonality;
  readonly pupilSize: number;
  readonly geometry: AvatarGeometry;
}

const eyeRadii: Record<EyeStyle, { readonly x: number; readonly y: number }> = {
  round: { x: 3.05, y: 3.05 },
  soft: { x: 3.35, y: 2.6 },
  wide: { x: 3.65, y: 3.3 },
  almond: { x: 3.75, y: 2.15 },
  small: { x: 2.55, y: 2.35 },
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

interface EyeProps {
  readonly centerX: number;
  readonly centerY: number;
  readonly gazeX: number;
  readonly gazeY: number;
  readonly pupilSize: number;
  readonly radii: { readonly x: number; readonly y: number };
  readonly side: "left" | "right";
}

function Eye({ centerX, centerY, gazeX, gazeY, pupilSize, radii, side }: EyeProps) {
  const pupilX = centerX + gazeX;
  const pupilY = centerY + gazeY;

  return (
    <g className={`agent-avatar__eye agent-avatar__eye--${side}`}>
      <ellipse
        className="agent-avatar__eye-white"
        cx={centerX}
        cy={centerY}
        rx={radii.x}
        ry={radii.y}
      />
      <g className={`agent-avatar__pupil agent-avatar__pupil--${side}`}>
        <circle cx={pupilX} cy={pupilY} r={pupilSize} />
        <circle
          className="agent-avatar__pupil-glint"
          cx={pupilX - pupilSize * 0.3}
          cy={pupilY - pupilSize * 0.34}
          r={Math.max(0.18, pupilSize * 0.2)}
        />
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
  personality,
  pupilSize,
  geometry,
}: EyesProps) {
  const baseRadii = eyeRadii[eyeStyle];
  const radii = {
    x: baseRadii.x * featureScale,
    y: baseRadii.y * featureScale * personalityOpenness[personality],
  };
  const leftX = geometry.face.leftEye.x;
  const leftY = geometry.face.leftEye.y;
  const rightX = geometry.face.rightEye.x;
  const rightY = geometry.face.rightEye.y;
  const leftBrowY = leftY - 6.15 + browLift - browAsymmetry * 0.5;
  const rightBrowY = rightY - 6.15 + browLift + browAsymmetry * 0.5;
  const glassWidth = Math.max(8.8, radii.x * 2 + 3.5);
  const glassHeight = Math.max(8, radii.y * 2 + 3.1);
  const bridgeY = (leftY + rightY) / 2;

  return (
    <g className="agent-avatar__eyes-and-brows" data-brow-style={browStyle}>
      <g className="agent-avatar__brows">
        <path d={browPath(browStyle, leftX, leftBrowY, "left")} />
        <path d={browPath(browStyle, rightX, rightBrowY, "right")} />
      </g>

      <Eye
        centerX={leftX}
        centerY={leftY}
        gazeX={gazeX}
        gazeY={gazeY}
        pupilSize={pupilSize}
        radii={radii}
        side="left"
      />
      <Eye
        centerX={rightX}
        centerY={rightY}
        gazeX={gazeX}
        gazeY={gazeY}
        pupilSize={pupilSize}
        radii={radii}
        side="right"
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
