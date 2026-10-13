import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BootScreen, transitionBootScreenPhase } from "./BootScreen";

describe("BootScreen", () => {
  it("shows only the accessible animated mark while opening", () => {
    const markup = renderToStaticMarkup(<BootScreen phase="visible" />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-label="Opening Stave"');
    expect(markup).toContain("boot-screen__bar--middle");
    expect(markup).not.toContain("stave</span>");
  });

  it("does not render before the delay or after the workspace is ready", () => {
    expect(renderToStaticMarkup(<BootScreen phase="waiting" />)).toBe("");
    expect(renderToStaticMarkup(<BootScreen phase="hidden" />)).toBe("");
  });

  it("marks the exit state for the fade into the workspace", () => {
    const markup = renderToStaticMarkup(<BootScreen phase="leaving" />);

    expect(markup).toContain("boot-screen--leaving");
  });

  it("skips fast opens and fades in after a delayed open", () => {
    expect(transitionBootScreenPhase("waiting", "loading-finished")).toBe(
      "hidden",
    );

    const visible = transitionBootScreenPhase("waiting", "delay-elapsed");
    expect(visible).toBe("visible");
    expect(transitionBootScreenPhase(visible, "loading-finished")).toBe(
      "leaving",
    );
    expect(transitionBootScreenPhase("leaving", "exit-elapsed")).toBe("hidden");
  });

  it("restarts the delay when a workspace retry begins", () => {
    expect(transitionBootScreenPhase("hidden", "loading-started")).toBe(
      "waiting",
    );
  });
});
