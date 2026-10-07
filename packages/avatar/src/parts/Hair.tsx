import type {
  AvatarGeometry,
  AvatarPoint,
} from "../geometry/create-avatar-geometry";
import type { HairStyle } from "../types";

interface HairProps {
  readonly geometry: AvatarGeometry;
  readonly style: HairStyle;
}

const n = (value: number) => Math.round(value * 10) / 10;

function crownPath(
  geometry: AvatarGeometry,
  {
    side = 1.5,
    lift = 1.3,
  }: { readonly side?: number; readonly lift?: number } = {},
): string {
  const { leftTemple, leftCrown, top, rightCrown, rightTemple } = geometry.hair;

  return [
    `M${n(leftTemple.x - side)} ${n(leftTemple.y + 2)}`,
    `C${n(leftTemple.x - side)} ${n(leftCrown.y + 2)}`,
    `${n(leftCrown.x - 1)} ${n(leftCrown.y - lift)}`,
    `${n(top.x)} ${n(top.y - lift)}`,
    `C${n(rightCrown.x + 1)} ${n(rightCrown.y - lift)}`,
    `${n(rightTemple.x + side)} ${n(rightCrown.y + 1)}`,
    `${n(rightTemple.x + side)} ${n(rightTemple.y + 2)}`,
  ].join(" ");
}

function capPath(
  geometry: AvatarGeometry,
  inner: "soft" | "wave" | "sweep" | "jagged" | "low" = "soft",
  options?: { readonly side?: number; readonly lift?: number },
): string {
  const { leftTemple, rightTemple, top } = geometry.hair;
  const centerX = (geometry.bounds.left + geometry.bounds.right) / 2;
  const innerY = Math.max(top.y + 8, Math.min(leftTemple.y, rightTemple.y) - 1);
  const outer = crownPath(geometry, options);

  if (inner === "wave") {
    return `${outer} C${n(rightTemple.x - 1)} ${n(innerY - 1)} ${n(centerX + 7)} ${n(innerY + 7)} ${n(centerX + 1)} ${n(innerY + 1)} C${n(centerX - 5)} ${n(innerY - 3)} ${n(leftTemple.x + 4)} ${n(innerY + 4)} ${n(leftTemple.x - (options?.side ?? 1.5))} ${n(leftTemple.y + 2)} Z`;
  }

  if (inner === "sweep") {
    return `${outer} C${n(rightTemple.x - 1)} ${n(innerY - 3)} ${n(centerX + 7)} ${n(innerY - 7)} ${n(centerX + 2)} ${n(innerY - 8)} C${n(centerX - 3)} ${n(innerY + 2)} ${n(leftTemple.x + 3)} ${n(innerY + 4)} ${n(leftTemple.x - (options?.side ?? 1.5))} ${n(leftTemple.y + 2)} Z`;
  }

  if (inner === "jagged") {
    return `${outer} L${n(rightTemple.x - 3)} ${n(innerY + 4)} L${n(centerX + 8)} ${n(innerY)} L${n(centerX + 4)} ${n(innerY + 6)} L${n(centerX - 1)} ${n(innerY + 1)} L${n(centerX - 7)} ${n(innerY + 6)} L${n(leftTemple.x + 3)} ${n(innerY + 1)} Z`;
  }

  if (inner === "low") {
    return `${outer} C${n(rightTemple.x - 6)} ${n(innerY + 1)} ${n(leftTemple.x + 6)} ${n(innerY + 1)} ${n(leftTemple.x - (options?.side ?? 1.5))} ${n(leftTemple.y + 2)} Z`;
  }

  return `${outer} C${n(rightTemple.x - 3)} ${n(innerY - 3)} ${n(centerX + 4)} ${n(innerY - 3)} ${n(centerX)} ${n(innerY - 5)} C${n(centerX - 5)} ${n(innerY + 1)} ${n(leftTemple.x + 4)} ${n(innerY + 1)} ${n(leftTemple.x - (options?.side ?? 1.5))} ${n(leftTemple.y + 2)} Z`;
}

function LongBack({
  bottom,
  geometry,
  variant,
}: {
  readonly bottom: number;
  readonly geometry: AvatarGeometry;
  readonly variant: "bob" | "wave" | "shag";
}) {
  const leftX = geometry.bounds.left - 1.4;
  const rightX = geometry.bounds.right + 1.4;
  const leftEnd =
    variant === "shag"
      ? `${n(leftX + 4)} ${bottom - 5} L${n(leftX + 1)} ${bottom}`
      : `${n(leftX)} ${bottom}`;
  const rightEnd =
    variant === "shag"
      ? `${n(rightX - 1)} ${bottom} L${n(rightX - 4)} ${bottom - 5}`
      : `${n(rightX)} ${bottom}`;

  return (
    <path
      className="agent-avatar__hair-back"
      d={`${crownPath(geometry, { side: 2.4, lift: 2.1 })} C${n(rightX + 1)} 34 ${n(rightX + 1)} ${bottom - 5} ${rightEnd} Q32 ${bottom + (variant === "wave" ? 3 : 0)} ${leftEnd} C${n(leftX - 1)} ${bottom - 7} ${n(leftX - 1)} 34 ${n(geometry.hair.leftTemple.x - 2.4)} ${n(geometry.hair.leftTemple.y + 2)} Z`}
    />
  );
}

function CrownCircles({
  geometry,
  front = false,
}: {
  readonly geometry: AvatarGeometry;
  readonly front?: boolean;
}) {
  const points: readonly AvatarPoint[] = [
    geometry.hair.leftTemple,
    geometry.hair.leftCrown,
    geometry.hair.top,
    geometry.hair.rightCrown,
    geometry.hair.rightTemple,
  ];

  return (
    <g
      className={
        front
          ? "agent-avatar__hair-curls-front"
          : "agent-avatar__hair-back agent-avatar__hair-curls"
      }
    >
      {points.map((item, index) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: curls are a fixed, never-reordered list.
          key={index}
          cx={item.x + (index - 2) * 0.35}
          cy={item.y + (front ? 0.5 : -0.7)}
          r={front ? 4.7 : 5.7}
        />
      ))}
    </g>
  );
}

export function HairBack({ geometry, style }: HairProps) {
  if (style === "bob")
    return <LongBack bottom={47} geometry={geometry} variant="bob" />;
  if (style === "wave")
    return <LongBack bottom={57} geometry={geometry} variant="wave" />;
  if (style === "shag")
    return <LongBack bottom={49} geometry={geometry} variant="shag" />;

  if (style === "curls") {
    return <CrownCircles geometry={geometry} />;
  }

  if (style === "bun") {
    const { rightCrown, top } = geometry.hair;
    return (
      <g className="agent-avatar__hair-back">
        <circle cx={rightCrown.x + 3.4} cy={top.y - 1.2} r="7.1" />
        <path d={`${capPath(geometry, "low", { side: 2.2, lift: 2 })}`} />
      </g>
    );
  }

  if (style === "locs") {
    const { leftTemple, rightTemple } = geometry.hair;
    return (
      <g className="agent-avatar__hair-back agent-avatar__hair-locs">
        <path d={crownPath(geometry, { side: 2.2, lift: 2 })} />
        <path
          d={`M${n(leftTemple.x - 1)} ${n(leftTemple.y)} C${n(leftTemple.x - 3)} 36 ${n(leftTemple.x - 2)} 47 ${n(leftTemple.x - 3)} 56`}
        />
        <path
          d={`M${n(leftTemple.x + 4)} ${n(leftTemple.y - 3)} C${n(leftTemple.x + 2)} 36 ${n(leftTemple.x + 4)} 48 ${n(leftTemple.x + 3)} 58`}
        />
        <path
          d={`M${n(rightTemple.x - 4)} ${n(rightTemple.y - 3)} C${n(rightTemple.x - 2)} 36 ${n(rightTemple.x - 4)} 48 ${n(rightTemple.x - 3)} 57`}
        />
        <path
          d={`M${n(rightTemple.x + 1)} ${n(rightTemple.y)} C${n(rightTemple.x + 3)} 36 ${n(rightTemple.x + 2)} 48 ${n(rightTemple.x + 3)} 55`}
        />
      </g>
    );
  }

  if (style === "double-puff") {
    const { leftCrown, rightCrown } = geometry.hair;
    return (
      <g className="agent-avatar__hair-back agent-avatar__hair-puffs">
        <circle cx={leftCrown.x - 4.4} cy={leftCrown.y - 2.8} r="7.2" />
        <circle cx={rightCrown.x + 4.4} cy={rightCrown.y - 2.8} r="7.2" />
        <path d={capPath(geometry, "low", { side: 1.8, lift: 1.5 })} />
      </g>
    );
  }

  if (style === "side-braid") {
    const x = geometry.bounds.right + 0.2;
    return (
      <g className="agent-avatar__hair-back agent-avatar__hair-braid">
        <path d={`${capPath(geometry, "low", { side: 2.2, lift: 2 })}`} />
        <circle cx={x} cy="37.5" r="3.5" />
        <circle cx={x + 1.2} cy="43.8" r="3.2" />
        <circle cx={x} cy="49.6" r="2.8" />
        <path
          className="agent-avatar__hair-tie"
          d={`M${n(x - 1.6)} 52.1 L${n(x + 2)} 53.6`}
        />
      </g>
    );
  }

  return null;
}

export function HairFront({ geometry, style }: HairProps) {
  if (style === "bare") return null;

  if (style === "curls") return <CrownCircles geometry={geometry} front />;

  if (style === "cap") {
    const y = Math.max(19, geometry.hair.top.y + 12);
    return (
      <g>
        <path
          className="agent-avatar__cap"
          d={capPath(geometry, "low", { side: 2, lift: 2.4 })}
        />
        <path
          className="agent-avatar__cap-line"
          d={`M${n(geometry.bounds.left + 2)} ${n(y)} Q32 ${n(y - 2)} ${n(geometry.bounds.right - 1)} ${n(y)}`}
        />
        <path
          className="agent-avatar__cap-brim"
          d={`M31 ${n(y)} Q40 ${n(y - 1)} ${n(geometry.bounds.right)} ${n(y + 3)}`}
        />
      </g>
    );
  }

  if (style === "buzz") {
    return (
      <g>
        <path
          className="agent-avatar__hair agent-avatar__hair--buzz"
          d={capPath(geometry, "low", { side: 0.6, lift: 0.4 })}
        />
        <path
          className="agent-avatar__hair-detail"
          d={`M${n(geometry.hair.leftCrown.x)} ${n(geometry.hair.leftCrown.y + 4)} l1 1 M${n(geometry.hair.top.x)} ${n(geometry.hair.top.y + 4)} l-.3 1 M${n(geometry.hair.rightCrown.x)} ${n(geometry.hair.rightCrown.y + 4)} l-.8 1`}
        />
      </g>
    );
  }

  if (style === "quiff") {
    const top = geometry.hair.top;
    return (
      <g>
        <path
          className="agent-avatar__hair"
          d={capPath(geometry, "sweep", { side: 1.7, lift: 2.5 })}
        />
        <path
          className="agent-avatar__hair"
          d={`M${n(top.x - 5)} ${n(top.y + 2)} C${n(top.x - 7)} ${n(top.y - 4)} ${n(top.x - 1)} ${n(top.y - 6)} ${n(top.x + 1)} ${n(top.y - 1)} C${n(top.x + 5)} ${n(top.y - 6)} ${n(top.x + 10)} ${n(top.y - 2)} ${n(top.x + 6)} ${n(top.y + 3)} Z`}
        />
      </g>
    );
  }

  if (style === "tuft") {
    const top = geometry.hair.top;
    return (
      <g>
        <path className="agent-avatar__hair" d={capPath(geometry, "soft")} />
        <path
          className="agent-avatar__hair-tuft"
          d={`M${n(top.x - 4)} ${n(top.y + 3)} C${n(top.x - 3)} ${n(top.y - 3)} ${n(top.x + 1)} ${n(top.y - 4)} ${n(top.x + 1)} ${n(top.y + 2)} C${n(top.x + 4)} ${n(top.y - 2)} ${n(top.x + 7)} ${n(top.y)} ${n(top.x + 5)} ${n(top.y + 4)}`}
        />
      </g>
    );
  }

  const inner =
    style === "wave" || style === "bob"
      ? "wave"
      : style === "side-sweep" || style === "bun" || style === "side-braid"
        ? "sweep"
        : style === "shag"
          ? "jagged"
          : style === "locs" || style === "double-puff"
            ? "low"
            : "soft";

  return (
    <g>
      <path className="agent-avatar__hair" d={capPath(geometry, inner)} />
      {style === "crop" ||
      style === "side-sweep" ||
      style === "wave" ||
      style === "bob" ? (
        <path
          className="agent-avatar__hair-detail"
          d={`M${n(geometry.hair.leftCrown.x + 2)} ${n(geometry.hair.leftCrown.y + 5)} Q${n(geometry.hair.top.x)} ${n(geometry.hair.top.y + 8)} ${n(geometry.hair.rightCrown.x - 1)} ${n(geometry.hair.rightCrown.y + 4)}`}
        />
      ) : null}
    </g>
  );
}
