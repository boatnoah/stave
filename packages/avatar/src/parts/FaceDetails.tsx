import type { MouthShape } from "../motion/status-expression";

const mouthPaths: Record<MouthShape, string> = {
  neutral: "M28.5 43.2 Q32 44.2 35.7 43.1",
  focused: "M29 43.1 Q32 43.7 35.2 43.1",
  concerned: "M28.6 45.2 Q32 41.6 35.7 45.1",
  smile: "M27.8 42.2 Q32 47.4 36.8 41.9",
};

interface FaceDetailsProps {
  readonly mouth: MouthShape;
}

export function FaceDetails({ mouth }: FaceDetailsProps) {
  return (
    <g className="agent-avatar__face-details">
      <path className="agent-avatar__nose" d="M32.1 32.8 Q30.8 37.2 33.4 37.6" />
      <path className="agent-avatar__mouth" d={mouthPaths[mouth]} />
      <path className="agent-avatar__cheek" d="M20.6 38.5 L23.1 38" />
      <path className="agent-avatar__cheek" d="M41.2 38 L43.7 38.4" />
    </g>
  );
}
