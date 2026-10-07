import type { AvatarGeometry } from "../geometry/create-avatar-geometry";
import type { MouthShape } from "../motion/status-expression";
import type { FaceMark, MouthStyle, NoseStyle } from "../types";

interface FaceDetailsProps {
  readonly faceMark: FaceMark;
  readonly featureScale: number;
  readonly geometry: AvatarGeometry;
  readonly mouth: MouthShape;
  readonly mouthStyle: MouthStyle;
  readonly noseStyle: NoseStyle;
}

const mouthWidths: Record<MouthStyle, number> = {
  small: 5.4,
  wide: 9.1,
  crooked: 7.1,
  soft: 6.7,
};

function mouthPath(
  shape: Exclude<MouthShape, "open">,
  style: MouthStyle,
  centerX: number,
  y: number,
  halfWidth: number,
): string {
  const leftY = style === "crooked" ? y + 0.7 : y;
  const rightY = style === "crooked" ? y - 0.65 : y;

  if (shape === "focused") {
    return `M${centerX - halfWidth} ${leftY} Q${centerX} ${y + 0.5} ${centerX + halfWidth} ${rightY}`;
  }
  if (shape === "concerned") {
    return `M${centerX - halfWidth} ${leftY + 1.1} Q${centerX} ${y - 2.4} ${centerX + halfWidth} ${rightY + 1.1}`;
  }
  if (shape === "smile") {
    return `M${centerX - halfWidth} ${leftY - 0.6} Q${centerX} ${y + 3.2} ${centerX + halfWidth} ${rightY - 0.6}`;
  }
  if (shape === "smirk") {
    return `M${centerX - halfWidth} ${y + 0.8} Q${centerX + 0.4} ${y + 1.8} ${centerX + halfWidth} ${y - 1.1}`;
  }
  return `M${centerX - halfWidth} ${leftY} Q${centerX} ${y + 1.15} ${centerX + halfWidth} ${rightY}`;
}

function Nose({
  geometry,
  style,
}: {
  readonly geometry: AvatarGeometry;
  readonly style: NoseStyle;
}) {
  const { noseTop: top, noseBottom: bottom } = geometry.face;
  const centerX = (top.x + bottom.x) / 2;

  if (style === "button") {
    return (
      <path
        className="agent-avatar__nose"
        d={`M${centerX - 2.1} ${bottom.y - 0.35} Q${centerX} ${bottom.y + 1.5} ${centerX + 2.1} ${bottom.y - 0.35}`}
      />
    );
  }
  if (style === "wedge") {
    return (
      <path
        className="agent-avatar__nose"
        d={`M${top.x - 1} ${top.y} L${bottom.x - 2.1} ${bottom.y} Q${centerX} ${bottom.y + 1.1} ${bottom.x + 2} ${bottom.y - 0.1}`}
      />
    );
  }
  if (style === "dash") {
    return (
      <path
        className="agent-avatar__nose"
        d={`M${bottom.x - 1.3} ${bottom.y} Q${centerX} ${bottom.y + 0.55} ${bottom.x + 1.3} ${bottom.y}`}
      />
    );
  }
  return (
    <path
      className="agent-avatar__nose"
      d={`M${top.x} ${top.y} C${top.x - 0.9} ${top.y + 2.1} ${bottom.x - 1.7} ${bottom.y - 1.2} ${bottom.x - 1.4} ${bottom.y} C${bottom.x - 0.6} ${bottom.y + 0.7} ${bottom.x + 1} ${bottom.y + 0.65} ${bottom.x + 1.7} ${bottom.y - 0.05}`}
    />
  );
}

function FaceMarks({
  faceMark,
  geometry,
}: {
  readonly faceMark: FaceMark;
  readonly geometry: AvatarGeometry;
}) {
  const left = geometry.face.leftMark;
  const right = geometry.face.rightMark;

  if (faceMark === "freckles") {
    return (
      <g className="agent-avatar__face-mark agent-avatar__face-mark--freckles">
        <circle cx={left.x - 2} cy={left.y} r="0.55" />
        <circle cx={left.x + 0.3} cy={left.y + 0.7} r="0.45" />
        <circle cx={left.x + 2.3} cy={left.y - 0.1} r="0.38" />
        <circle cx={right.x - 2.3} cy={right.y - 0.1} r="0.38" />
        <circle cx={right.x - 0.3} cy={right.y + 0.7} r="0.45" />
        <circle cx={right.x + 2} cy={right.y} r="0.55" />
      </g>
    );
  }
  if (faceMark === "blush") {
    return (
      <g className="agent-avatar__face-mark agent-avatar__face-mark--blush">
        <ellipse cx={left.x} cy={left.y + 0.2} rx="3.1" ry="1.25" />
        <ellipse cx={right.x} cy={right.y + 0.2} rx="3.1" ry="1.25" />
      </g>
    );
  }
  if (faceMark === "mole") {
    return (
      <circle
        className="agent-avatar__face-mark agent-avatar__face-mark--mole"
        cx={right.x + 0.4}
        cy={right.y + 1.1}
        r="0.72"
      />
    );
  }
  if (faceMark === "scar") {
    return (
      <path
        className="agent-avatar__face-mark agent-avatar__face-mark--scar"
        d={`M${left.x - 1.7} ${left.y - 2.6} L${left.x + 2} ${left.y + 2.4} M${left.x - 1.7} ${left.y - 0.7} L${left.x + 0.5} ${left.y - 2.1} M${left.x - 0.3} ${left.y + 1.1} L${left.x + 2} ${left.y - 0.4}`}
      />
    );
  }
  return null;
}

export function FaceDetails({
  faceMark,
  featureScale,
  geometry,
  mouth,
  mouthStyle,
  noseStyle,
}: FaceDetailsProps) {
  const halfWidth = mouthWidths[mouthStyle] * featureScale;
  const { x: mouthX, y: mouthY } = geometry.face.mouth;
  const restingShape = mouth === "open" ? "neutral" : mouth;

  return (
    <g className="agent-avatar__face-details">
      <FaceMarks faceMark={faceMark} geometry={geometry} />
      <Nose geometry={geometry} style={noseStyle} />
      <g className="agent-avatar__mouth-rig" data-mouth-shape={mouth}>
        <path
          className="agent-avatar__mouth agent-avatar__mouth-rest"
          d={mouthPath(restingShape, mouthStyle, mouthX, mouthY, halfWidth)}
        />
        <ellipse
          className="agent-avatar__mouth agent-avatar__mouth-open"
          cx={mouthX}
          cy={mouthY}
          rx={Math.max(2.1, halfWidth * 0.48)}
          ry={Math.max(1.4, featureScale * 1.65)}
        />
        <path
          className="agent-avatar__mouth agent-avatar__mouth-alt"
          d={mouthPath("smile", mouthStyle, mouthX, mouthY, halfWidth * 0.88)}
        />
      </g>
    </g>
  );
}
