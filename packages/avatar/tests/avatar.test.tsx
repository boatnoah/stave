import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AgentAvatar, avatarStatuses, createAvatarIdentity } from "../src";

describe("createAvatarIdentity", () => {
  it("reproduces an identity for the same seed and appearance version", () => {
    const first = createAvatarIdentity("arlo-engineer", 1);
    const second = createAvatarIdentity("arlo-engineer", 1);

    expect(second).toEqual(first);
  });

  it("creates varied valid identities without losing required fields", () => {
    const identities = Array.from({ length: 100 }, (_, index) =>
      createAvatarIdentity(`agent-${index}`, 1),
    );

    expect(new Set(identities.map((identity) => identity.seedHash)).size).toBe(100);
    expect(new Set(identities.map((identity) => identity.hairStyle)).size).toBeGreaterThan(2);
    expect(identities.every((identity) => identity.blinkDurationMs >= 7_400)).toBe(true);
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
    expect(markup).toContain("role=\"img\"");
    expect(markup).toContain("aria-label=\"Arlo,");
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
});
