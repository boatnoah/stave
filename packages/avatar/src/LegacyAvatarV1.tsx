import type { MouthShape } from "./motion/status-expression";
import type {
  AccessoryStyle,
  AvatarIdentity,
  BrowStyle,
  EyeStyle,
  HairStyle,
  HeadShape,
} from "./types";

const headPaths: Partial<Record<HeadShape, string>> = {
  round:
    "M15.5 28.3 C15.2 16.4 21.6 9.2 31.6 8.5 C42.8 7.8 49.4 16.2 48.7 29.8 C48 45.1 42.1 54 32 55.1 C20.8 54.7 15.8 44.7 15.5 28.3 Z",
  oval: "M17.1 26.4 C17.5 14.4 23.4 7.2 32.2 7.2 C41.2 7.5 47.2 15.2 47.1 28.2 C47 44.5 41.2 55.3 31.9 56 C22 55.1 16.5 43 17.1 26.4 Z",
  "soft-square":
    "M14.9 26.1 C15 15.5 20.4 9.3 30.4 8.7 C42 8.1 48.7 13.9 49.1 25.3 L48.2 41.8 C46.3 50.9 40.3 54.8 31.4 55.3 C22.5 54.7 16.9 50.1 15.3 41.4 Z",
};

const eyeRadii: Partial<
  Record<EyeStyle, { readonly x: number; readonly y: number }>
> = {
  round: { x: 3.2, y: 3.2 },
  soft: { x: 3.4, y: 2.7 },
  wide: { x: 3.7, y: 3.5 },
};

const defaultEyeRadii = { x: 3.2, y: 3.2 } as const;

const mouthPaths: Partial<Record<MouthShape, string>> = {
  neutral: "M28.5 43.2 Q32 44.2 35.7 43.1",
  focused: "M29 43.1 Q32 43.7 35.2 43.1",
  concerned: "M28.6 45.2 Q32 41.6 35.7 45.1",
  smile: "M27.8 42.2 Q32 47.4 36.8 41.9",
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

function LegacyHead({ shape }: { readonly shape: HeadShape }) {
  const path = headPaths[shape] ?? headPaths.round;

  return (
    <g className="agent-avatar__head-lines">
      <circle className="agent-avatar__ear" cx="15.9" cy="32" r="3.2" />
      <circle className="agent-avatar__ear" cx="48.1" cy="32" r="3.2" />
      <path className="agent-avatar__head-fill" d={path} />
      <path className="agent-avatar__head-echo" d={path} />
      <path className="agent-avatar__head-outline" d={path} />
    </g>
  );
}

function LegacyHair({ style }: { readonly style: HairStyle }) {
  if (style === "crop") {
    return (
      <path
        className="agent-avatar__hair"
        d="M17 24 C17.5 13 24 8.6 32.3 8.5 C41.8 8.4 47.4 15.1 47.8 23.5 C43.1 20.4 39.9 17.9 36.1 15.6 C31.7 20.4 25.2 21.9 17 24 Z"
      />
    );
  }

  if (style === "wave") {
    return (
      <path
        className="agent-avatar__hair"
        d="M15.7 27 C14.7 17.1 21.1 8 31.2 8 C42.8 7.9 49.7 15.9 48.4 29.7 C45.9 27.8 44.4 25 43.4 20.7 C40.5 24.4 37.8 24.1 35.1 18.7 C31.7 24 27.9 24.1 25.1 18.4 C23.4 23 20.4 26.2 15.7 27 Z"
      />
    );
  }

  if (style === "bob") {
    return (
      <g>
        <path
          className="agent-avatar__hair"
          d="M15.2 29 C14.6 16.4 21.5 7.8 32 7.6 C43.3 7.4 49.8 16.1 49 29.8 L46.1 39.9 L42.5 38.5 L43 21.1 C36.4 24.2 28.8 22.9 22.1 18.2 L21.5 39.5 L17.8 40.6 Z"
        />
        <path
          className="agent-avatar__hair-line"
          d="M22.1 18.2 C28.8 22.9 36.4 24.2 43 21.1"
        />
      </g>
    );
  }

  if (style === "tuft") {
    return (
      <g>
        <path
          className="agent-avatar__hair"
          d="M17.2 23.8 C18.3 14.7 23.4 9.3 31.8 8.7 C40.4 8.1 46 13.2 47.4 21.7 C42.2 19.9 37.2 18.6 33.1 15.2 C28.2 19.8 23.3 21.7 17.2 23.8 Z"
        />
        <path
          className="agent-avatar__hair-tuft"
          d="M27.2 10.2 C28.2 5.9 31.8 4.9 32.4 10.2 C34.7 5.9 38.2 7 37.1 11.3"
        />
      </g>
    );
  }

  return (
    <g>
      <path
        className="agent-avatar__cap"
        d="M16.1 21.9 C18.3 12.4 24.4 8.3 32 8.2 C40.2 8.1 46.4 12.8 48 21.9 Z"
      />
      <path
        className="agent-avatar__cap-line"
        d="M15.2 22.2 C25.2 20.5 39 20.5 49.1 22.1"
      />
      <path
        className="agent-avatar__cap-brim"
        d="M31.2 22 C37.9 21 43 22.1 46.2 24.7"
      />
    </g>
  );
}

interface LegacyEyesProps {
  readonly accessory: AccessoryStyle;
  readonly browLift: number;
  readonly browStyle: BrowStyle;
  readonly eyeSpacing: number;
  readonly eyeStyle: EyeStyle;
  readonly gazeY: number;
}

function LegacyEyes({
  accessory,
  browLift,
  browStyle,
  eyeSpacing,
  eyeStyle,
  gazeY,
}: LegacyEyesProps) {
  const radii = eyeRadii[eyeStyle] ?? defaultEyeRadii;
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
        <g
          className={`agent-avatar__glasses agent-avatar__glasses--${accessory}`}
        >
          {accessory === "round-glasses" ? (
            <>
              <circle cx={leftX} cy={eyeY} r="5.3" />
              <circle cx={rightX} cy={eyeY} r="5.3" />
            </>
          ) : (
            <>
              <rect
                x={leftX - 5}
                y={eyeY - 4.6}
                width="10"
                height="9.2"
                rx="2.1"
              />
              <rect
                x={rightX - 5}
                y={eyeY - 4.6}
                width="10"
                height="9.2"
                rx="2.1"
              />
            </>
          )}
          <path
            d={`M${leftX + 5.2} ${eyeY} Q32 ${eyeY - 1} ${rightX - 5.2} ${eyeY}`}
          />
        </g>
      ) : null}
    </g>
  );
}

function LegacyFaceDetails({ mouth }: { readonly mouth: MouthShape }) {
  return (
    <g className="agent-avatar__face-details">
      <path
        className="agent-avatar__nose"
        d="M32.1 32.8 Q30.8 37.2 33.4 37.6"
      />
      <path
        className="agent-avatar__mouth"
        d={mouthPaths[mouth] ?? mouthPaths.neutral}
      />
      <path className="agent-avatar__cheek" d="M20.6 38.5 L23.1 38" />
      <path className="agent-avatar__cheek" d="M41.2 38 L43.7 38.4" />
    </g>
  );
}

interface LegacyAvatarV1Props {
  readonly identity: AvatarIdentity;
  readonly mouth: MouthShape;
  readonly browLift: number;
  readonly gazeY: number;
}

export function LegacyAvatarV1({
  identity,
  mouth,
  browLift,
  gazeY,
}: LegacyAvatarV1Props) {
  return (
    <g
      className="agent-avatar__character"
      transform={`translate(${identity.faceOffsetX} 0)`}
    >
      <LegacyHead shape={identity.headShape} />
      <LegacyHair style={identity.hairStyle} />
      <LegacyEyes
        accessory={identity.accessory}
        browLift={browLift}
        browStyle={identity.browStyle}
        eyeSpacing={identity.eyeSpacing}
        eyeStyle={identity.eyeStyle}
        gazeY={gazeY}
      />
      <LegacyFaceDetails mouth={mouth} />
    </g>
  );
}
