import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AgentAvatar, avatarStatuses, createAvatarIdentity } from "../src";

describe("createAvatarIdentity", () => {
  it("reproduces a versioned identity for the same seed", () => {
    const first = createAvatarIdentity("arlo-engineer");
    const second = createAvatarIdentity("arlo-engineer");

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      appearanceVersion: 2,
      headShape: "diamond",
      hairStyle: "side-sweep",
      browStyle: "bold",
      mouthStyle: "crooked",
      palette: "ochre",
      personality: "calm",
    });
  });

  it("keeps version one identities available for saved agents", () => {
    const identity = createAvatarIdentity("arlo-engineer", 1);

    expect(identity).toMatchObject({
      appearanceVersion: 1,
      palette: "ink",
      personality: "calm",
    });
  });

  it("uses the full appearance vocabulary across a large crew", () => {
    const identities = Array.from({ length: 500 }, (_, index) =>
      createAvatarIdentity(`agent-${index}`),
    );

    expect(new Set(identities.map((identity) => identity.seedHash)).size).toBe(500);
    expect(new Set(identities.map((identity) => identity.headShape)).size).toBe(8);
    expect(new Set(identities.map((identity) => identity.hairStyle)).size).toBe(13);
    expect(new Set(identities.map((identity) => identity.browStyle)).size).toBe(5);
    expect(new Set(identities.map((identity) => identity.palette)).size).toBe(6);
    expect(new Set(identities.map((identity) => identity.personality)).size).toBe(5);
    expect(identities.every((identity) => identity.blinkDurationMs >= 6_800)).toBe(true);
  });
});

describe("AgentAvatar", () => {
  it.each(avatarStatuses)("renders an accessible %s state", (status) => {
    const markup = renderToStaticMarkup(
      <AgentAvatar
        agentId="arlo"
        name="Arlo"
        avatarSeed="arlo-engineer"
        status={status}
      />,
    );

    expect(markup).toContain(`data-status="${status}"`);
    expect(markup).toContain("data-palette=");
    expect(markup).toContain("data-personality=");
    expect(markup).toContain("role=\"img\"");
    expect(markup).toContain("aria-label=\"Arlo,");
    expect(markup).not.toContain("data-reaction=");
  });

  it("can become decorative when adjacent text carries the meaning", () => {
    const markup = renderToStaticMarkup(
      <AgentAvatar
        agentId="arlo"
        name="Arlo"
        avatarSeed="arlo-engineer"
        status="working"
        decorative
      />,
    );

    expect(markup).toContain("aria-hidden=\"true\"");
    expect(markup).not.toContain("role=\"img\"");
  });

  it("exposes a static motion mode", () => {
    const markup = renderToStaticMarkup(
      <AgentAvatar
        agentId="arlo"
        name="Arlo"
        avatarSeed="arlo-engineer"
        status="working"
        motion="off"
      />,
    );

    expect(markup).toContain("data-motion=\"off\"");
  });

  it("keeps pupils inside the blinking eye group", () => {
    const markup = renderToStaticMarkup(
      <AgentAvatar
        agentId="arlo"
        name="Arlo"
        avatarSeed="arlo-engineer"
        status="working"
      />,
    );

    const eyeGroups = markup.match(/<g class="agent-avatar__eye agent-avatar__eye--(?:left|right)">.*?<\/g><\/g>/g);

    expect(eyeGroups).toHaveLength(2);
    expect(eyeGroups?.every((group) => group.includes("agent-avatar__pupil"))).toBe(true);
  });
});
