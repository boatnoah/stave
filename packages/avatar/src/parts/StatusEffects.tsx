import type { AvatarGeometry } from "../geometry/create-avatar-geometry";
import type {
  AvatarActingStyle,
  AvatarDominantSide,
  AvatarStatus,
} from "../types";

interface StatusEffectsProps {
  readonly actingStyle: AvatarActingStyle;
  readonly dominantSide: AvatarDominantSide;
  readonly geometry: AvatarGeometry;
  readonly status: AvatarStatus;
}

function Tear({
  direction,
  eye,
  secondary = false,
}: {
  readonly direction: number;
  readonly eye: { readonly x: number; readonly y: number };
  readonly secondary?: boolean;
}) {
  return (
    <g
      className={
        secondary
          ? "agent-avatar__tear agent-avatar__tear--secondary"
          : "agent-avatar__tear"
      }
    >
      <path
        className="agent-avatar__tear-track"
        d={`M${eye.x + direction * 1.4} ${eye.y + 2.2} C${eye.x + direction * 2.1} ${eye.y + 5.8} ${eye.x + direction * 0.8} ${eye.y + 8.8} ${eye.x + direction * 1.4} ${eye.y + 11.5}`}
      />
      <path
        className="agent-avatar__tear-drop"
        d={`M${eye.x + direction * 1.4} ${eye.y + 7.1} C${eye.x - direction * 0.3} ${eye.y + 9.6} ${eye.x - direction * 0.2} ${eye.y + 11.7} ${eye.x + direction * 1.4} ${eye.y + 12.1} C${eye.x + direction * 3} ${eye.y + 11.7} ${eye.x + direction * 3} ${eye.y + 9.6} ${eye.x + direction * 1.4} ${eye.y + 7.1} Z`}
      />
    </g>
  );
}

export function StatusEffects({
  actingStyle,
  dominantSide,
  geometry,
  status,
}: StatusEffectsProps) {
  const direction = dominantSide === "right" ? 1 : -1;
  const edge =
    dominantSide === "right" ? geometry.bounds.right : geometry.bounds.left;
  const effectX = edge + direction * 2;

  if (status === "queued") {
    return (
      <g className="agent-avatar__status-effect agent-avatar__status-effect--queue">
        <circle
          className="agent-avatar__status-dot agent-avatar__status-dot--1"
          cx={effectX}
          cy="18"
          r="0.8"
        />
        <circle
          className="agent-avatar__status-dot agent-avatar__status-dot--2"
          cx={effectX + direction * 3.3}
          cy="14.2"
          r="1.15"
        />
        <circle
          className="agent-avatar__status-dot agent-avatar__status-dot--3"
          cx={effectX + direction * 7.3}
          cy="10.5"
          r="1.45"
        />
      </g>
    );
  }

  if (status === "working" && actingStyle === "ponderer") {
    const cloudX = effectX + direction * 7;
    return (
      <g className="agent-avatar__status-effect agent-avatar__status-effect--thought">
        <circle
          className="agent-avatar__thought-link agent-avatar__thought-link--1"
          cx={effectX}
          cy="17"
          r="0.8"
        />
        <circle
          className="agent-avatar__thought-link agent-avatar__thought-link--2"
          cx={effectX + direction * 3}
          cy="13.5"
          r="1.15"
        />
        <path
          className="agent-avatar__effect-line agent-avatar__thought-cloud"
          d={`M${cloudX - direction * 4} 10 C${cloudX - direction * 5} 6 ${cloudX - direction * 1.5} 4.5 ${cloudX + direction * 0.5} 6 C${cloudX + direction * 2.5} 3.8 ${cloudX + direction * 6} 5.4 ${cloudX + direction * 5} 8 C${cloudX + direction * 7} 10.2 ${cloudX + direction * 4.2} 13 ${cloudX + direction * 1.8} 11.8 C${cloudX - direction * 0.8} 14 ${cloudX - direction * 4.8} 12.7 ${cloudX - direction * 4} 10 Z`}
        />
      </g>
    );
  }

  if (status === "reviewing") {
    return (
      <g className="agent-avatar__status-effect agent-avatar__status-effect--hmm">
        <path
          className="agent-avatar__effect-line"
          d={`M${effectX} 19 q${direction * 2.2} -2.3 ${direction * 4.2} 0`}
        />
        <path
          className="agent-avatar__effect-line"
          d={`M${effectX + direction * 1.2} 15.2 q${direction * 1.8} -1.7 ${direction * 3.4} -.1`}
        />
      </g>
    );
  }

  if (status === "waiting") {
    const questionX = effectX + direction * 3.2;
    return (
      <g className="agent-avatar__status-effect agent-avatar__status-effect--question">
        <path
          className="agent-avatar__effect-line"
          d={`M${questionX - direction * 2.4} 9 C${questionX - direction * 1.2} 5.2 ${questionX + direction * 4.2} 5.8 ${questionX + direction * 3.8} 9.5 C${questionX + direction * 3.6} 12.1 ${questionX} 11.7 ${questionX + direction * 0.4} 15`}
        />
        <circle
          className="agent-avatar__status-dot"
          cx={questionX + direction * 0.5}
          cy="18.5"
          r="0.85"
        />
      </g>
    );
  }

  if (status === "blocked") {
    const knotX = effectX + direction * 4.2;
    return (
      <g className="agent-avatar__status-effect agent-avatar__status-effect--blocked">
        <path
          className="agent-avatar__effect-line agent-avatar__blocked-knot"
          d={`M${knotX - direction * 3} 11 C${knotX + direction * 4} 5 ${knotX + direction * 5} 15 ${knotX - direction * 1} 13 C${knotX - direction * 6} 11 ${knotX + direction * 2} 5 ${knotX + direction * 4} 12 C${knotX + direction * 5} 16 ${knotX - direction * 4} 16 ${knotX - direction * 3} 10`}
        />
        <path
          className="agent-avatar__effect-line agent-avatar__sigh-line"
          d={`M${effectX} 39 q${direction * 3} 1 ${direction * 5} -1`}
        />
        <path
          className="agent-avatar__effect-line agent-avatar__sigh-line"
          d={`M${effectX + direction} 42 q${direction * 3} 1 ${direction * 4.5} -.5`}
        />
      </g>
    );
  }

  if (status === "done") {
    const sparkX = effectX + direction * 3;
    return (
      <g className="agent-avatar__status-effect agent-avatar__status-effect--done">
        <path
          className="agent-avatar__effect-line agent-avatar__spark agent-avatar__spark--1"
          d={`M${sparkX} 9 L${sparkX} 15 M${sparkX - direction * 3} 12 L${sparkX + direction * 3} 12`}
        />
        <path
          className="agent-avatar__effect-line agent-avatar__spark agent-avatar__spark--2"
          d={`M${sparkX + direction * 5} 4 L${sparkX + direction * 5} 8 M${sparkX + direction * 3} 6 L${sparkX + direction * 7} 6`}
        />
      </g>
    );
  }

  if (status === "failed") {
    const eye =
      dominantSide === "right" ? geometry.face.rightEye : geometry.face.leftEye;
    const otherEye =
      dominantSide === "right" ? geometry.face.leftEye : geometry.face.rightEye;
    return (
      <g className="agent-avatar__status-effect agent-avatar__status-effect--failed">
        <Tear direction={direction} eye={eye} />
        {actingStyle === "reactive" ? (
          <Tear direction={-direction} eye={otherEye} secondary />
        ) : null}
      </g>
    );
  }

  return null;
}
