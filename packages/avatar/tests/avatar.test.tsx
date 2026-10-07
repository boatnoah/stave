import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AgentAvatar,
  avatarStatuses,
  createAvatarGeometry,
  createAvatarIdentity,
} from "../src";

describe("createAvatarIdentity", () => {
  it("reproduces a versioned identity for the same seed", () => {
    const first = createAvatarIdentity("arlo-engineer");
    const second = createAvatarIdentity("arlo-engineer");

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      appearanceVersion: 4,
      headShape: "long",
      hairStyle: "buzz",
      eyeStyle: "wide",
      browStyle: "soft",
      mouthStyle: "wide",
      palette: "umber",
      personality: "focused",
      actingStyle: "ponderer",
      dominantSide: "left",
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

  it("keeps version two identities available for saved agents", () => {
    const identity = createAvatarIdentity("arlo-engineer", 2);

    expect(identity).toMatchObject({
      appearanceVersion: 2,
      headShape: "diamond",
      hairStyle: "side-sweep",
      palette: "ochre",
      personality: "calm",
    });
  });

  it("keeps version three identities available for saved agents", () => {
    const identity = createAvatarIdentity("arlo-engineer", 3);

    expect(identity).toMatchObject({
      appearanceVersion: 3,
      headShape: "pear",
      hairStyle: "buzz",
      eyeStyle: "round",
      palette: "ochre",
      personality: "curious",
    });
  });

  it("uses the full appearance vocabulary across a large crew", () => {
    const identities = Array.from({ length: 500 }, (_, index) =>
      createAvatarIdentity(`agent-${index}`),
    );

    expect(new Set(identities.map((identity) => identity.seedHash)).size).toBe(
      500,
    );
    expect(new Set(identities.map((identity) => identity.headShape)).size).toBe(
      10,
    );
    expect(new Set(identities.map((identity) => identity.hairStyle)).size).toBe(
      13,
    );
    expect(new Set(identities.map((identity) => identity.eyeStyle)).size).toBe(
      8,
    );
    expect(new Set(identities.map((identity) => identity.browStyle)).size).toBe(
      5,
    );
    expect(new Set(identities.map((identity) => identity.palette)).size).toBe(
      6,
    );
    expect(
      new Set(identities.map((identity) => identity.personality)).size,
    ).toBe(5);
    expect(
      new Set(identities.map((identity) => identity.actingStyle)).size,
    ).toBe(5);
    expect(
      identities.every((identity) => identity.blinkDurationMs >= 6_800),
    ).toBe(true);
  });

  it("produces distinct landmark geometry for every head recipe", () => {
    const byShape = new Map(
      Array.from({ length: 2_000 }, (_, index) =>
        createAvatarIdentity(`shape-${index}`),
      ).map((identity) => [identity.headShape, identity] as const),
    );
    const geometries = [...byShape.values()].map(createAvatarGeometry);

    expect(byShape.size).toBe(10);
    expect(new Set(geometries.map((geometry) => geometry.headD)).size).toBe(10);
    expect(
      Math.max(...geometries.map(({ bounds }) => bounds.right - bounds.left)),
    ).toBeGreaterThan(40);
    expect(
      Math.max(...geometries.map(({ bounds }) => bounds.bottom - bounds.top)),
    ).toBeGreaterThan(53);
  });

  it("keeps asymmetric face anchors ordered inside their head bounds", () => {
    const geometries = Array.from({ length: 1_000 }, (_, index) =>
      createAvatarGeometry(createAvatarIdentity(`bounds-${index}`)),
    );

    expect(
      geometries.every(
        ({ bounds, face }) =>
          face.leftEye.x > bounds.left &&
          face.rightEye.x < bounds.right &&
          face.leftEye.x < face.rightEye.x &&
          face.noseTop.y > Math.min(face.leftEye.y, face.rightEye.y) &&
          face.mouth.y > face.noseBottom.y &&
          face.mouth.y < bounds.bottom,
      ),
    ).toBe(true);
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
    expect(markup).toContain("data-acting-style=");
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Arlo,');
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

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('role="img"');
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

    expect(markup).toContain('data-motion="off"');
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

    const eyeGroups = markup.match(
      /<g class="agent-avatar__eye agent-avatar__eye--(?:left|right)"[^>]*>.*?<\/g><\/g>/g,
    );

    expect(eyeGroups).toHaveLength(2);
    expect(
      eyeGroups?.every((group) => group.includes("agent-avatar__pupil")),
    ).toBe(true);
  });

  it("preserves the version one drawing recipe", () => {
    const markup = renderToStaticMarkup(
      <AgentAvatar
        agentId="arlo"
        name="Arlo"
        avatarSeed="arlo-engineer"
        appearanceVersion={1}
        status="working"
      />,
    );

    expect(markup).toContain('data-appearance-version="1"');
    expect(markup).toContain("agent-avatar__pupils");
    expect(markup).toContain("M32.1 32.8 Q30.8 37.2 33.4 37.6");
    expect(markup).toContain("M29 43.1 Q32 43.7 35.2 43.1");
    expect(markup).toContain("M20.6 38.5 L23.1 38");
    expect(markup).not.toContain("agent-avatar__presence");
    expect(markup).not.toContain("agent-avatar__status-effect");
  });

  it("renders state-specific acting props at hero size", () => {
    const thinking = renderToStaticMarkup(
      <AgentAvatar
        agentId="inez"
        name="Inez"
        avatarSeed="eye-42"
        status="working"
        size={112}
      />,
    );
    const failed = renderToStaticMarkup(
      <AgentAvatar
        agentId="sol"
        name="Sol"
        avatarSeed="cast-0"
        status="failed"
        size={112}
      />,
    );

    expect(thinking).toContain('data-detail="hero"');
    expect(thinking).toContain("agent-avatar__thought-cloud");
    expect(thinking).toContain("agent-avatar__mouth-rig");
    expect(failed).toContain("agent-avatar__tear-drop");
  });

  it.each([
    ["bead", "eye-7"],
    ["button", "eye-66"],
    ["almond", "eye-316"],
    ["sleepy", "eye-363"],
    ["tall", "eye-292"],
    ["hooded", "eye-263"],
    ["uneven", "eye-302"],
    ["wide", "eye-62"],
  ] as const)("renders the %s eye construction", (eyeStyle, avatarSeed) => {
    const markup = renderToStaticMarkup(
      <AgentAvatar
        agentId={eyeStyle}
        name={eyeStyle}
        avatarSeed={avatarSeed}
        status="idle"
        size={112}
      />,
    );

    expect(markup).toContain(`data-eye-style="${eyeStyle}"`);
    expect(markup.match(/data-eye-family=/g)).toHaveLength(2);
    expect(markup.match(/agent-avatar__eye-lid"/g)).toHaveLength(2);
    expect(markup.match(/agent-avatar__eye-lid-cover/g)).toHaveLength(2);

    if (eyeStyle === "bead")
      expect(markup).not.toContain("agent-avatar__eye-white");
  });

  it("renders each friendly lid after its pupil so the lid can occlude the eye", () => {
    const markup = renderToStaticMarkup(
      <AgentAvatar
        agentId="friendly-eyes"
        name="Friendly eyes"
        avatarSeed="eye-62"
        status="waiting"
        size={112}
      />,
    );
    const eyeGroups = markup.match(
      /<g class="agent-avatar__eye agent-avatar__eye--(?:left|right)"[^>]*>.*?<\/g><\/g>/g,
    );

    expect(eyeGroups).toHaveLength(2);
    expect(
      eyeGroups?.every(
        (group) =>
          group.indexOf("agent-avatar__pupil") <
          group.indexOf("agent-avatar__eye-lid"),
      ),
    ).toBe(true);
  });

  it("keeps pre-version-four eye rendering stable", () => {
    const markup = renderToStaticMarkup(
      <AgentAvatar
        agentId="legacy-eyes"
        name="Legacy eyes"
        avatarSeed="arlo-engineer"
        appearanceVersion={3}
        status="idle"
        size={112}
      />,
    );

    expect(markup).not.toContain("agent-avatar__eye-lid-layer");
  });
});
