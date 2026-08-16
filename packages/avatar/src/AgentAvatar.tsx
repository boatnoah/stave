import { memo, useMemo, type CSSProperties } from "react";

import { createAvatarIdentity } from "./engine/create-avatar-identity";
import { getStatusExpression } from "./motion/status-expression";
import { Eyes } from "./parts/Eyes";
import { FaceDetails } from "./parts/FaceDetails";
import { Hair } from "./parts/Hair";
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
  "--avatar-blink-duration": string;
  "--avatar-motion-delay": string;
  "--avatar-line-tilt": string;
};

export const AgentAvatar = memo(function AgentAvatar({
  agentId,
  name,
  avatarSeed,
  appearanceVersion = 1,
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
  const expression = getStatusExpression(status);
  const detail = size < 32 ? "compact" : "full";
  const style: AvatarStyle = {
    width: size,
    height: size,
    "--avatar-blink-duration": `${identity.blinkDurationMs}ms`,
    "--avatar-motion-delay": `${identity.motionDelayMs}ms`,
    "--avatar-line-tilt": `${identity.lineTilt}deg`,
  };
  const classes = ["agent-avatar", className].filter(Boolean).join(" ");

  return (
    <span
      className={classes}
      data-agent-id={agentId}
      data-detail={detail}
      data-motion={motion}
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
        <g
          className="agent-avatar__character"
          transform={`translate(${identity.faceOffsetX} 0)`}
        >
          <Head shape={identity.headShape} />
          <Hair style={identity.hairStyle} />
          <Eyes
            accessory={identity.accessory}
            browLift={expression.browLift}
            browStyle={identity.browStyle}
            eyeSpacing={identity.eyeSpacing}
            eyeStyle={identity.eyeStyle}
            gazeY={expression.gazeY}
          />
          <FaceDetails mouth={expression.mouth} />
        </g>
      </svg>
    </span>
  );
});
