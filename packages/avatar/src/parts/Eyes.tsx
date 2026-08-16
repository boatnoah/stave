import type { AccessoryStyle, BrowStyle, EyeStyle } from "../types";

interface EyesProps {
  readonly accessory: AccessoryStyle;
  readonly browLift: number;
  readonly browStyle: BrowStyle;
  readonly eyeSpacing: number;
  readonly eyeStyle: EyeStyle;
  readonly gazeY: number;
}

const eyeRadii: Record<EyeStyle, { readonly x: number; readonly y: number }> = {
  round: { x: 3.2, y: 3.2 },
  soft: { x: 3.4, y: 2.7 },
  wide: { x: 3.7, y: 3.5 },
};

function browPath(style: BrowStyle, centerX: number, y: number): string {
  if (style === "straight") {
    return `M${centerX - 3.3} ${y} Q${centerX} ${y - 0.25} ${centerX + 3.3} ${y}`;
  }

  if (style === "arched") {
    return `M${centerX - 3.4} ${y + 0.4} Q${centerX} ${y - 2} ${centerX + 3.4} ${y + 0.4}`;
  }

  return `M${centerX - 3.2} ${y + 0.25} Q${centerX} ${y - 1.15} ${centerX + 3.2} ${y}`;
}

export function Eyes({
  accessory,
  browLift,
  browStyle,
  eyeSpacing,
  eyeStyle,
  gazeY,
}: EyesProps) {
  const radii = eyeRadii[eyeStyle];
  const leftX = 32 - eyeSpacing;
  const rightX = 32 + eyeSpacing;
  const eyeY = 31;
  const browY = 24.6 + browLift;

  return (
    <g>
      <g className="agent-avatar__brows">
        <path d={browPath(browStyle, leftX, browY)} />
        <path d={browPath(browStyle, rightX, browY)} />
      </g>

      <g className="agent-avatar__eye agent-avatar__eye--left">
        <ellipse
          className="agent-avatar__eye-white"
          cx={leftX}
          cy={eyeY}
          rx={radii.x}
          ry={radii.y}
        />
      </g>
      <g className="agent-avatar__eye agent-avatar__eye--right">
        <ellipse
          className="agent-avatar__eye-white"
          cx={rightX}
          cy={eyeY}
          rx={radii.x}
          ry={radii.y}
        />
      </g>

      <g className="agent-avatar__pupils" transform={`translate(0 ${gazeY})`}>
        <circle cx={leftX} cy={eyeY} r="1.25" />
        <circle cx={rightX} cy={eyeY} r="1.25" />
      </g>

      {accessory !== "none" ? (
        <g className={`agent-avatar__glasses agent-avatar__glasses--${accessory}`}>
          {accessory === "round-glasses" ? (
            <>
              <circle cx={leftX} cy={eyeY} r="5.3" />
              <circle cx={rightX} cy={eyeY} r="5.3" />
            </>
          ) : (
            <>
              <rect x={leftX - 5} y={eyeY - 4.6} width="10" height="9.2" rx="2.1" />
              <rect x={rightX - 5} y={eyeY - 4.6} width="10" height="9.2" rx="2.1" />
            </>
          )}
          <path d={`M${leftX + 5.2} ${eyeY} Q32 ${eyeY - 1} ${rightX - 5.2} ${eyeY}`} />
        </g>
      ) : null}
    </g>
  );
}
