import {
  AgentAvatar,
  avatarStatuses,
  createAvatarIdentity,
  type AvatarStatus,
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
    seed: "cast-59",
    status: "working",
    activity: "Untangling the next decision",
  },
  {
    id: "arlo",
    name: "Arlo",
    role: "Engineer",
    seed: "cast-39",
    status: "reviewing",
    activity: "Reading the run history",
  },
  {
    id: "suri",
    name: "Suri",
    role: "Reviewer",
    seed: "cast-24",
    status: "reviewing",
    activity: "Checking the proposed diff",
  },
  {
    id: "milo",
    name: "Milo",
    role: "Research",
    seed: "cast-13",
    status: "waiting",
    activity: "Waiting on one decision",
  },
  {
    id: "june",
    name: "June",
    role: "Design",
    seed: "cast-35",
    status: "idle",
    activity: "Sketching the handoff",
  },
  {
    id: "theo",
    name: "Theo",
    role: "Quality",
    seed: "cast-2",
    status: "done",
    activity: "Verification passed",
  },
  {
    id: "bea",
    name: "Bea",
    role: "Delivery",
    seed: "cast-10",
    status: "blocked",
    activity: "Flagging a dependency",
  },
  {
    id: "ren",
    name: "Ren",
    role: "Security",
    seed: "cast-5",
    status: "queued",
    activity: "Ready for the next review",
  },
];

const stateDescriptions: Record<AvatarStatus, string> = {
  idle: "A rare blink. Otherwise still.",
  queued: "Present, but deliberately quiet.",
  working: "Subtle focus and reading motion.",
  reviewing: "Eyes scan from left to right.",
  waiting: "A small upward glance asks for input.",
  blocked: "One concerned tilt, then rest.",
  done: "A short nod and smile.",
  failed: "A brief recoil, then a stable expression.",
};

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function App() {
  const [stateOverride, setStateOverride] = useState<AvatarStatus | null>(null);

  return (
    <main className="avatar-lab">
      <header className="app-header">
        <div className="wordmark">
          <span>Stave</span>
          <span className="wordmark__context">Avatar study 02</span>
        </div>
        <p className="app-header__note">Procedural SVG · no image assets</p>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">Living crew</p>
        <h1 id="page-title">A crew, not a template.</h1>
        <p className="intro__copy">
          Different silhouettes, features, palettes, and temperaments—then motion tied to what
          each agent is actually doing. No two people distinguished by hairstyle alone.
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
                size={104}
              />
              <div className="agent-study__identity">
                <div>
                  <h2>{agent.name}</h2>
                  <p>{agent.role}</p>
                </div>
                <span className="state-label">{titleCase(status)}</span>
              </div>
              <p className="agent-study__traits">
                {titleCase(identity.personality)} · {titleCase(identity.palette)} ·{" "}
                {identity.headShape}
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
