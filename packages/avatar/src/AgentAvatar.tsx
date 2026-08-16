import { memo, useMemo, type CSSProperties } from "react";

import { createAvatarIdentity } from "./engine/create-avatar-identity";
import { getAvatarPalette } from "./engine/palettes";
import { getStatusExpression } from "./motion/status-expression";
import { useAvatarReaction } from "./motion/use-avatar-reaction";
import { Eyes } from "./parts/Eyes";
import { FaceDetails } from "./parts/FaceDetails";
import { HairBack, HairFront } from "./parts/Hair";
import { Head } from "./parts/Head";
import type { AgentAvatarProps, AvatarStatus } from "./types";

import "./avatar.css";

const statusLabels: Record<AvatarStatus, string> = {
  idle: "idle",
  queued: "queued",
  working: "working",
  reviewing: "reviewing",
  waiting: "waiting for input",
  blocked: "blocked",
  done: "done",
  failed: "failed",
};

type AvatarStyle = CSSProperties & {
  "--avatar-accent": string;
  "--avatar-blink-duration": string;
  "--avatar-eye": string;
  "--avatar-face": string;
  "--avatar-hair": string;
  "--avatar-hair-line": string;
  "--avatar-ink": string;
  "--avatar-motion-delay": string;
  "--avatar-motion-intensity": number;
  "--avatar-paper": string;
  "--avatar-paper-deep": string;
  "--avatar-resting-tilt": string;
  "--avatar-line-tilt": string;
};

export const AgentAvatar = memo(function AgentAvatar({
  agentId,
  name,
  avatarSeed,
  appearanceVersion = 2,
  status,
  size = 48,
  motion = "auto",
  decorative = false,
  className,
}: AgentAvatarProps) {
  const identity = useMemo(
    () => createAvatarIdentity(avatarSeed, appearanceVersion),
    [appearanceVersion, avatarSeed],
  );
  const palette = getAvatarPalette(identity.palette);
  const expression = getStatusExpression(status, identity.personality);
  const reaction = useAvatarReaction(status);
  const detail = size < 32 ? "compact" : "full";
  const style: AvatarStyle = {
    width: size,
    height: size,
    "--avatar-accent": palette.accent,
    "--avatar-blink-duration": `${identity.blinkDurationMs}ms`,
    "--avatar-eye": palette.eye,
    "--avatar-face": palette.face,
    "--avatar-hair": palette.hair,
    "--avatar-hair-line": palette.hairLine,
    "--avatar-ink": palette.ink,
    "--avatar-motion-delay": `${identity.motionDelayMs}ms`,
    "--avatar-motion-intensity": identity.motionIntensity,
    "--avatar-paper": palette.paper,
    "--avatar-paper-deep": palette.paperDeep,
    "--avatar-resting-tilt": `${identity.restingTilt}deg`,
    "--avatar-line-tilt": `${identity.lineTilt}deg`,
  };
  const classes = ["agent-avatar", className].filter(Boolean).join(" ");

  return (
    <span
      className={classes}
      data-agent-id={agentId}
      data-detail={detail}
      data-motion={motion}
      data-palette={identity.palette}
      data-personality={identity.personality}
      data-reaction={reaction ?? undefined}
      data-status={status}
      style={style}
      aria-hidden={decorative || undefined}
    >
      <svg
        viewBox="0 0 64 64"
        focusable="false"
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : `${name}, ${statusLabels[status]}`}
      >
        <circle className="agent-avatar__paper" cx="32" cy="32" r="30" />
        <path className="agent-avatar__paper-echo" d="M9 19 C17 4 45 0 55 17" />
        <g className="agent-avatar__presence">
          <g className="agent-avatar__offset" transform={`translate(${identity.faceOffsetX} 0)`}>
            <g className="agent-avatar__character">
              <HairBack style={identity.hairStyle} />
              <Head shape={identity.headShape} />
              <HairFront style={identity.hairStyle} />
              <Eyes
                accessory={identity.accessory}
                browAsymmetry={expression.browAsymmetry}
                browLift={expression.browLift}
                browStyle={identity.browStyle}
                eyeSpacing={identity.eyeSpacing}
                eyeStyle={identity.eyeStyle}
                eyeY={identity.eyeY}
                featureScale={identity.featureScale}
                gazeX={expression.gazeX}
                gazeY={expression.gazeY}
                personality={identity.personality}
                pupilSize={identity.pupilSize}
              />
              <FaceDetails
                eyeY={identity.eyeY}
                faceMark={identity.faceMark}
                featureScale={identity.featureScale}
                mouth={expression.mouth}
                mouthStyle={identity.mouthStyle}
                mouthY={identity.mouthY}
                noseStyle={identity.noseStyle}
              />
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
});
