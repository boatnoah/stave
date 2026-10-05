import { useEffect, useRef, useState } from "react";

import type { AvatarStatus } from "../types";

export type AvatarReaction = Extract<AvatarStatus, "blocked" | "done" | "failed">;

const reactionStatuses = new Set<AvatarStatus>(["blocked", "done", "failed"]);

export function useAvatarReaction(status: AvatarStatus): AvatarReaction | null {
  const previousStatus = useRef(status);
  const [reaction, setReaction] = useState<AvatarReaction | null>(null);

  useEffect(() => {
    const previous = previousStatus.current;
    previousStatus.current = status;

    if (previous === status || !reactionStatuses.has(status)) {
      setReaction(null);
      return;
    }

    setReaction(status as AvatarReaction);
    const timer = window.setTimeout(() => setReaction(null), 1_050);

    return () => window.clearTimeout(timer);
  }, [status]);

  return reaction;
}
