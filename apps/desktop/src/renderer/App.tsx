import { AgentAvatar, avatarStatuses, type AvatarStatus } from "@stave/avatar";
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
    id: "nora",
    name: "Nora",
    role: "Product",
    seed: "nora-product-v1",
    status: "idle",
    activity: "Shaping the next task",
  },
  {
    id: "arlo",
    name: "Arlo",
    role: "Engineer",
    seed: "arlo-engineer-v1",
    status: "working",
    activity: "Reading the event stream",
  },
  {
    id: "suri",
    name: "Suri",
    role: "Reviewer",
    seed: "suri-reviewer-v1",
    status: "reviewing",
    activity: "Checking the proposed diff",
  },
  {
    id: "milo",
    name: "Milo",
    role: "Research",
    seed: "milo-research-v1",
    status: "waiting",
    activity: "Waiting on one decision",
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
          <span className="wordmark__context">Avatar study 01</span>
        </div>
        <p className="app-header__note">Procedural SVG · no image assets</p>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">Living crew</p>
        <h1 id="page-title">Agents should feel present, not busy.</h1>
        <p className="intro__copy">
          Stable hand-drawn identities with motion tied to real execution state. At board size,
          the avatar replaces another spinner—not another piece of chrome.
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
          {agents.slice(0, 3).map((agent, index) => {
            const status = stateOverride ?? agent.status;
            const tasks = [
              "Define launch success metrics",
              "Stream Codex run events",
              "Prove retry behavior",
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
