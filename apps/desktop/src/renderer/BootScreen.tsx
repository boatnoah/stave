import { useEffect, useReducer } from "react";

import "./BootScreen.css";

export type BootScreenPhase = "waiting" | "visible" | "leaving" | "hidden";

const showDelay = 300;
const exitDuration = 450;

type BootScreenEvent =
  | "delay-elapsed"
  | "loading-finished"
  | "exit-elapsed"
  | "loading-started";

export function transitionBootScreenPhase(
  phase: BootScreenPhase,
  event: BootScreenEvent,
): BootScreenPhase {
  switch (event) {
    case "delay-elapsed":
      return phase === "waiting" ? "visible" : phase;
    case "loading-finished":
      if (phase === "waiting") return "hidden";
      return phase === "visible" ? "leaving" : phase;
    case "exit-elapsed":
      return phase === "leaving" ? "hidden" : phase;
    case "loading-started":
      return phase === "hidden" || phase === "leaving" ? "waiting" : phase;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function useBootScreenPhase(loading: boolean): BootScreenPhase {
  const [phase, dispatch] = useReducer(transitionBootScreenPhase, "waiting");

  useEffect(() => {
    if (loading) {
      if (phase === "hidden" || phase === "leaving") {
        dispatch("loading-started");
        return;
      }
      if (phase === "waiting") {
        const timer = window.setTimeout(
          () => dispatch("delay-elapsed"),
          showDelay,
        );
        return () => window.clearTimeout(timer);
      }
      return;
    }

    if (phase === "waiting" || phase === "visible") {
      dispatch("loading-finished");
      return;
    }
    if (phase === "leaving") {
      const timer = window.setTimeout(
        () => dispatch("exit-elapsed"),
        exitDuration,
      );
      return () => window.clearTimeout(timer);
    }
  }, [loading, phase]);

  return phase;
}

export function BootScreen({ phase }: { readonly phase: BootScreenPhase }) {
  if (phase !== "visible" && phase !== "leaving") return null;

  return (
    <div
      className={`boot-screen${phase === "leaving" ? " boot-screen--leaving" : ""}`}
      role="status"
      aria-label="Opening Stave"
    >
      <svg className="boot-screen__mark" viewBox="0 0 48 48" aria-hidden="true">
        <g>
          <rect
            className="boot-screen__bar boot-screen__bar--top"
            x="16"
            y="9"
            width="24"
            height="7"
            rx="3.5"
          />
          <rect
            className="boot-screen__bar boot-screen__bar--middle"
            x="8"
            y="20.5"
            width="32"
            height="7"
            rx="3.5"
          />
          <rect
            className="boot-screen__bar boot-screen__bar--bottom"
            x="8"
            y="32"
            width="24"
            height="7"
            rx="3.5"
          />
        </g>
      </svg>
    </div>
  );
}
