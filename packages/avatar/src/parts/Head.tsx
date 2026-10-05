import type { AvatarGeometry } from "../geometry/create-avatar-geometry";

interface HeadProps {
  readonly geometry: AvatarGeometry;
}

export function Head({ geometry }: HeadProps) {
  return (
    <g className="agent-avatar__head-lines">
      <ellipse
        className="agent-avatar__ear"
        cx={geometry.ears.left.center.x}
        cy={geometry.ears.left.center.y}
        rx={geometry.ears.left.radiusX}
        ry={geometry.ears.left.radiusY}
      />
      <ellipse
        className="agent-avatar__ear"
        cx={geometry.ears.right.center.x}
        cy={geometry.ears.right.center.y}
        rx={geometry.ears.right.radiusX}
        ry={geometry.ears.right.radiusY}
      />
      <path className="agent-avatar__head-fill" d={geometry.headD} />
      <path className="agent-avatar__head-echo" d={geometry.headEchoD} />
      <path className="agent-avatar__head-outline" d={geometry.headD} />
    </g>
  );
}
