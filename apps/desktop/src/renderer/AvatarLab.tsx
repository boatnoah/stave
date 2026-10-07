import {
  AgentAvatar,
  type AvatarStatus,
  avatarStatuses,
  createAvatarIdentity,
} from "@stave/avatar";
import { useState } from "react";

interface DemoAgent {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly seed: string;
  readonly status: AvatarStatus;
  readonly activity: string;
}

const agents: readonly DemoAgent[] = [
  {
    id: "inez",
    name: "Inez",
    role: "Product",
    seed: "eye-7",
    status: "working",
    activity: "Thinking through the next decision",
  },
  {
    id: "arlo",
    name: "Arlo",
    role: "Engineer",
    seed: "eye-66",
    status: "reviewing",
    activity: "Reading the run history",
  },
  {
    id: "suri",
    name: "Suri",
    role: "Reviewer",
    seed: "eye-316",
    status: "reviewing",
    activity: "Checking the proposed diff",
  },
  {
    id: "milo",
    name: "Milo",
    role: "Research",
    seed: "eye-363",
    status: "waiting",
    activity: "Waiting on one decision",
  },
  {
    id: "june",
    name: "June",
    role: "Design",
    seed: "eye-292",
    status: "idle",
    activity: "Sketching the handoff",
  },
  {
    id: "theo",
    name: "Theo",
    role: "Quality",
    seed: "eye-263",
    status: "done",
    activity: "Verification passed",
  },
  {
    id: "bea",
    name: "Bea",
    role: "Delivery",
    seed: "eye-302",
    status: "blocked",
    activity: "Flagging a dependency",
  },
  {
    id: "ren",
    name: "Ren",
    role: "Security",
    seed: "eye-62",
    status: "queued",
    activity: "Ready for the next review",
  },
  {
    id: "sol",
    name: "Sol",
    role: "Operations",
    seed: "eye-148",
    status: "failed",
    activity: "A verification step failed",
  },
  {
    id: "oda",
    name: "Oda",
    role: "Platform",
    seed: "eye-205",
    status: "working",
    activity: "Muttering through a migration",
  },
];

const stateDescriptions: Record<AvatarStatus, string> = {
  idle: "A rare breath, blink, or uneven tilt.",
  queued: "Thought dots gather, then settle.",
  working: "Scan, mutter, consider, nod, then rest.",
  reviewing: "A slow scan ends in a quiet hmm.",
  waiting: "The mouth asks as a question mark appears.",
  blocked: "A tangled thought and a long sigh.",
  done: "A deliberate nod, wider smile, and two sparks.",
  failed: "A small recoil, trembling mouth, and a restrained tear.",
};

const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export function AvatarLab() {
  const [stateOverride, setStateOverride] = useState<AvatarStatus | null>(null);

  return (
    <main className="avatar-lab">
      <header className="app-header">
        <div className="wordmark">
          <span>Stave</span>
          <span className="wordmark__context">Avatar study 04</span>
        </div>
        <p className="app-header__note">Procedural SVG · no image assets</p>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">Living crew</p>
        <h1 id="page-title">The eyes should not share a mold.</h1>
        <p className="intro__copy">
          Ink beads, open buttons, pointed almonds, heavy lids, tall ovals,
          sleepy arcs, and one deliberately uneven pair—all sharing a coherent
          gaze.
        </p>
      </section>

      <nav className="state-picker" aria-label="Preview an avatar state">
        <button
          className={stateOverride === null ? "is-active" : undefined}
          type="button"
          onClick={() => setStateOverride(null)}
        >
          Live mix
        </button>
        {avatarStatuses.map((status) => (
          <button
            className={stateOverride === status ? "is-active" : undefined}
            key={status}
            type="button"
            onClick={() => setStateOverride(status)}
          >
            {titleCase(status)}
          </button>
        ))}
      </nav>

      <section className="agent-grid" aria-label="Agent avatar studies">
        {agents.map((agent) => {
          const status = stateOverride ?? agent.status;
          const identity = createAvatarIdentity(agent.seed);

          return (
            <article className="agent-study" key={agent.id}>
              <AgentAvatar
                agentId={agent.id}
                name={agent.name}
                avatarSeed={agent.seed}
                status={status}
                size={112}
              />
              <div className="agent-study__identity">
                <div>
                  <h2>{agent.name}</h2>
                  <p>{agent.role}</p>
                </div>
                <span className="state-label">{titleCase(status)}</span>
              </div>
              <p className="agent-study__traits">
                {identity.headShape} · {identity.eyeStyle} eyes ·{" "}
                {identity.hairStyle}
              </p>
              <p className="agent-study__activity">
                {stateOverride ? stateDescriptions[status] : agent.activity}
              </p>
            </article>
          );
        })}
      </section>

      <section className="board-study" aria-labelledby="board-size-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Board size</p>
            <h2 id="board-size-title">Quiet at 28 pixels</h2>
          </div>
          <p>Detail falls away; expression and state remain.</p>
        </div>

        <div className="mini-board">
          {agents.slice(0, 4).map((agent, index) => {
            const status = stateOverride ?? agent.status;
            const tasks = [
              "Define launch success metrics",
              "Stream Codex run events",
              "Prove retry behavior",
              "Review the permissions boundary",
            ] as const;

            return (
              <article className="task-card" key={agent.id}>
                <div className="task-card__meta">
                  <span>STV-{18 + index * 7}</span>
                  <span>P{index === 0 ? 2 : 1}</span>
                </div>
                <h3>{tasks[index]}</h3>
                <div className="task-card__footer">
                  <span className="task-card__agent">
                    <AgentAvatar
                      agentId={agent.id}
                      name={agent.name}
                      avatarSeed={agent.seed}
                      status={status}
                      size={28}
                      decorative
                    />
                    <span>{agent.name}</span>
                  </span>
                  <span>{titleCase(status)}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
