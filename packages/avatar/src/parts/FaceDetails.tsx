import type { FaceMark, MouthStyle, NoseStyle } from "../types";
import type { MouthShape } from "../motion/status-expression";

interface FaceDetailsProps {
  readonly eyeY: number;
  readonly faceMark: FaceMark;
  readonly featureScale: number;
  readonly mouth: MouthShape;
  readonly mouthStyle: MouthStyle;
  readonly mouthY: number;
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
  y: number,
  halfWidth: number,
): string {
  const leftY = style === "crooked" ? y + 0.7 : y;
  const rightY = style === "crooked" ? y - 0.65 : y;

  if (shape === "focused") {
    return `M${32 - halfWidth} ${leftY} Q32 ${y + 0.5} ${32 + halfWidth} ${rightY}`;
  }

  if (shape === "concerned") {
    return `M${32 - halfWidth} ${leftY + 1.1} Q32 ${y - 2.4} ${32 + halfWidth} ${rightY + 1.1}`;
  }

  if (shape === "smile") {
    return `M${32 - halfWidth} ${leftY - 0.6} Q32 ${y + 3.2} ${32 + halfWidth} ${rightY - 0.6}`;
  }

  if (shape === "smirk") {
    return `M${32 - halfWidth} ${y + 0.8} Q${32.4} ${y + 1.8} ${32 + halfWidth} ${y - 1.1}`;
  }

  return `M${32 - halfWidth} ${leftY} Q32 ${y + 1.15} ${32 + halfWidth} ${rightY}`;
}

function Nose({ eyeY, featureScale, style }: {
  readonly eyeY: number;
  readonly featureScale: number;
  readonly style: NoseStyle;
}) {
  const top = eyeY + 2.4;
  const bottom = eyeY + 8.15 * featureScale;

  if (style === "button") {
    return (
      <path
        className="agent-avatar__nose"
        d={`M${29.9} ${bottom - 0.35} Q32 ${bottom + 1.5} ${34.1} ${bottom - 0.35}`}
      />
    );
  }

  if (style === "wedge") {
    return (
      <path
        className="agent-avatar__nose"
        d={`M31 ${top} L29.9 ${bottom} Q32 ${bottom + 1.1} 34 ${bottom - 0.1}`}
      />
    );
  }

  if (style === "dash") {
    return <path className="agent-avatar__nose" d={`M30.7 ${bottom} Q32 ${bottom + 0.55} 33.3 ${bottom}`} />;
  }

  return (
    <path
      className="agent-avatar__nose"
      d={`M32 ${top} C31.1 ${top + 2.1} 30.3 ${bottom - 1.2} 30.6 ${bottom} C31.4 ${bottom + 0.7} 33 ${bottom + 0.65} 33.7 ${bottom - 0.05}`}
    />
  );
}

function FaceMarks({ faceMark, eyeY }: { readonly faceMark: FaceMark; readonly eyeY: number }) {
  const markY = eyeY + 7.2;

  if (faceMark === "freckles") {
    return (
      <g className="agent-avatar__face-mark agent-avatar__face-mark--freckles">
        <circle cx="21.7" cy={markY} r="0.55" />
        <circle cx="24.1" cy={markY + 0.7} r="0.45" />
        <circle cx="26.1" cy={markY - 0.1} r="0.38" />
        <circle cx="37.9" cy={markY - 0.1} r="0.38" />
        <circle cx="39.9" cy={markY + 0.7} r="0.45" />
        <circle cx="42.3" cy={markY} r="0.55" />
      </g>
    );
  }

  if (faceMark === "blush") {
    return (
      <g className="agent-avatar__face-mark agent-avatar__face-mark--blush">
        <ellipse cx="21.8" cy={markY + 0.2} rx="3.1" ry="1.25" />
        <ellipse cx="42.2" cy={markY + 0.2} rx="3.1" ry="1.25" />
      </g>
    );
  }

  if (faceMark === "mole") {
    return <circle className="agent-avatar__face-mark agent-avatar__face-mark--mole" cx="41.2" cy={markY + 1.1} r="0.72" />;
  }

  if (faceMark === "scar") {
    return (
      <path
        className="agent-avatar__face-mark agent-avatar__face-mark--scar"
        d={`M21.1 ${markY - 2.6} L24.8 ${markY + 2.4} M21.1 ${markY - 0.7} L23.3 ${markY - 2.1} M22.5 ${markY + 1.1} L24.8 ${markY - 0.4}`}
      />
    );
  }

  return null;
}

export function FaceDetails({
  eyeY,
  faceMark,
  featureScale,
  mouth,
  mouthStyle,
  mouthY,
  noseStyle,
}: FaceDetailsProps) {
  const halfWidth = mouthWidths[mouthStyle] * featureScale;

  return (
    <g className="agent-avatar__face-details">
      <FaceMarks faceMark={faceMark} eyeY={eyeY} />
      <Nose eyeY={eyeY} featureScale={featureScale} style={noseStyle} />
      {mouth === "open" ? (
        <ellipse
          className="agent-avatar__mouth agent-avatar__mouth--open"
          cx="32"
          cy={mouthY}
          rx={Math.max(2.1, halfWidth * 0.48)}
          ry={Math.max(1.4, featureScale * 1.65)}
        />
      ) : (
        <path
          className="agent-avatar__mouth"
          d={mouthPath(mouth, mouthStyle, mouthY, halfWidth)}
        />
      )}
    </g>
  );
}
