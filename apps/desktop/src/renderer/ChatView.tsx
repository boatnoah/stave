import { AgentAvatar } from "@stave/avatar";
import type {
  AgentSnapshot,
  TicketSnapshot,
  WorkspaceSnapshot,
} from "../shared/workspace-snapshot";
import {
  buildChatMessages,
  type ChatMessage,
  isSuccessfulRelease,
} from "./chat-messages";

export type ChatChannelId = "team" | "releases";

const ticketStageLabels: Record<TicketSnapshot["stage"], string> = {
  todo: "To do",
  implementation: "Building",
  review: "Review",
  qa: "QA",
  done: "Done",
};

export function ChatView({
  snapshot,
  agents,
  channel,
  ticketId,
  agentId,
  onSelectChannel,
  onSelectTicket,
  onSelectAgent,
}: {
  readonly snapshot: WorkspaceSnapshot;
  readonly agents: readonly AgentSnapshot[];
  readonly channel: ChatChannelId;
  readonly ticketId: string | null;
  readonly agentId: string | null;
  readonly onSelectChannel: (channel: ChatChannelId) => void;
  readonly onSelectTicket: (ticketId: string) => void;
  readonly onSelectAgent: (agentId: string) => void;
}) {
  const ticket = snapshot.tickets.find(
    (candidate) => candidate.id === ticketId,
  );
  const agent = agents.find((candidate) => candidate.id === agentId);
  const messages = buildChatMessages(snapshot, agents);
  const visibleMessages = messages.filter((message) => {
    if (ticketId) return message.ticketId === ticketId;
    if (agentId) return message.agentId === agentId;
    if (channel === "releases")
      return isSuccessfulRelease(message, snapshot.runs);
    return true;
  });
  const waitingTickets = snapshot.tickets.filter(
    (candidate) => candidate.execution === "waiting_user",
  );

  return (
    <section className="chat-workspace" aria-label="Team chat">
      <aside className="chat-sidebar" aria-label="Chat navigation">
        <nav
          className="chat-sidebar__section"
          aria-labelledby="chat-needs-title"
        >
          <h2 id="chat-needs-title">Needs you</h2>
          {waitingTickets.length ? (
            waitingTickets.map((candidate) => (
              <button
                type="button"
                className="chat-sidebar__ticket chat-sidebar__ticket--waiting"
                key={candidate.id}
                aria-current={candidate.id === ticketId ? "page" : undefined}
                onClick={() => onSelectTicket(candidate.id)}
              >
                <span className="needs-button__dot" aria-hidden="true" />
                <span>
                  <code>{candidate.key}</code>
                  <strong>{candidate.title}</strong>
                </span>
              </button>
            ))
          ) : (
            <p className="chat-sidebar__empty">No tickets are waiting.</p>
          )}
        </nav>

        <nav
          className="chat-sidebar__section"
          aria-labelledby="chat-channels-title"
        >
          <h2 id="chat-channels-title">Channels</h2>
          <button
            type="button"
            className="chat-sidebar__item"
            aria-label="#team"
            aria-current={
              !ticketId && !agentId && channel === "team" ? "page" : undefined
            }
            onClick={() => onSelectChannel("team")}
          >
            <span aria-hidden="true">#</span> team
          </button>
          <button
            type="button"
            className="chat-sidebar__item"
            aria-label="#releases"
            aria-current={
              !ticketId && !agentId && channel === "releases"
                ? "page"
                : undefined
            }
            onClick={() => onSelectChannel("releases")}
          >
            <span aria-hidden="true">#</span> releases
          </button>
        </nav>

        <nav
          className="chat-sidebar__section"
          aria-labelledby="chat-threads-title"
        >
          <h2 id="chat-threads-title">Ticket threads</h2>
          {snapshot.tickets.length ? (
            snapshot.tickets.map((candidate) => (
              <TicketNavigationItem
                key={candidate.id}
                ticket={candidate}
                current={candidate.id === ticketId}
                onClick={() => onSelectTicket(candidate.id)}
              />
            ))
          ) : (
            <p className="chat-sidebar__empty">No ticket threads yet.</p>
          )}
        </nav>

        <nav
          className="chat-sidebar__section"
          aria-labelledby="chat-direct-title"
        >
          <h2 id="chat-direct-title">Direct</h2>
          {agents.map((member) => (
            <button
              type="button"
              className="chat-sidebar__direct"
              key={member.id}
              aria-current={member.id === agentId ? "page" : undefined}
              onClick={() => onSelectAgent(member.id)}
            >
              <AgentAvatar
                agentId={member.id}
                name={member.displayName}
                avatarSeed={member.avatarSeed}
                status="idle"
                size={23}
                decorative
              />
              <span>{member.displayName}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="chat-main" aria-labelledby="chat-heading">
        <header className="chat-channel-header">
          <div>
            <p className="eyebrow">
              {ticket ? "Ticket thread" : agent ? "Direct message" : "Channel"}
            </p>
            <h1 id="chat-heading">
              {ticket
                ? `${ticket.key} · ${ticket.title}`
                : agent
                  ? agent.displayName
                  : `#${channel}`}
            </h1>
            <p>
              {ticket?.description ||
                (agent
                  ? `Run updates for ${agent.displayName}.`
                  : channel === "releases"
                    ? "Successful QA completions."
                    : "Project activity and agent run updates.")}
            </p>
          </div>
          {!agent && (
            <section
              className="chat-channel-header__members"
              aria-label="Project agents"
            >
              {agents.map((member) => (
                <span key={member.id} title={member.displayName}>
                  <AgentAvatar
                    agentId={member.id}
                    name={member.displayName}
                    avatarSeed={member.avatarSeed}
                    status="idle"
                    size={28}
                    decorative
                  />
                </span>
              ))}
            </section>
          )}
        </header>

        {ticket && <TicketThreadSummary ticket={ticket} agents={agents} />}

        <ol className="chat-messages" aria-live="polite">
          {visibleMessages.map((message, index) => {
            const previous = visibleMessages[index - 1];
            const grouped =
              message.kind !== "system" &&
              previous?.kind !== "system" &&
              previous?.author === message.author;
            return (
              <ChatMessageRow
                key={message.id}
                message={message}
                agents={agents}
                ticket={snapshot.tickets.find(
                  (candidate) => candidate.id === message.ticketId,
                )}
                grouped={grouped}
                onSelectTicket={onSelectTicket}
              />
            );
          })}
        </ol>
        {visibleMessages.length === 0 && (
          <p className="chat-empty">
            {channel === "releases" && !ticketId && !agentId
              ? "Successful QA runs will appear here."
              : ticket
                ? "No activity for this ticket yet."
                : agent
                  ? `Run updates from ${agent.displayName} will appear here.`
                  : "Activity and run updates will appear here."}
          </p>
        )}
      </section>
    </section>
  );
}

function TicketNavigationItem({
  ticket,
  current,
  onClick,
}: {
  readonly ticket: TicketSnapshot;
  readonly current: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="chat-sidebar__ticket"
      aria-current={current ? "page" : undefined}
      onClick={onClick}
    >
      <span
        className={`chat-sidebar__stage-dot chat-sidebar__stage-dot--${ticket.stage}`}
        aria-hidden="true"
      />
      <span>
        <code>{ticket.key}</code>
        <strong>{ticket.title}</strong>
      </span>
    </button>
  );
}

function TicketThreadSummary({
  ticket,
  agents,
}: {
  readonly ticket: TicketSnapshot;
  readonly agents: readonly AgentSnapshot[];
}) {
  const owner = agents.find((member) => member.id === ticket.assignedAgentId);
  const currentStage = [
    "todo",
    "implementation",
    "review",
    "qa",
    "done",
  ].indexOf(ticket.stage);
  return (
    <section className="chat-thread-summary" aria-label="Ticket summary">
      <div className="chat-thread-summary__heading">
        <code>{ticket.key}</code>
        <span>{ticketStageLabels[ticket.stage]}</span>
        <span>{owner?.displayName ?? "Unassigned"}</span>
      </div>
      <h2>{ticket.title}</h2>
      <div className="chat-thread-summary__progress">
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            className={
              index < currentStage
                ? "chat-thread-summary__segment chat-thread-summary__segment--done"
                : index === currentStage
                  ? "chat-thread-summary__segment chat-thread-summary__segment--current"
                  : "chat-thread-summary__segment"
            }
            key={index}
          />
        ))}
      </div>
    </section>
  );
}

function ChatMessageRow({
  message,
  agents,
  ticket,
  grouped,
  onSelectTicket,
}: {
  readonly message: ChatMessage;
  readonly agents: readonly AgentSnapshot[];
  readonly ticket: TicketSnapshot | undefined;
  readonly grouped: boolean;
  readonly onSelectTicket: (ticketId: string) => void;
}) {
  if (message.kind === "system") {
    return (
      <li className="chat-system-line">
        <span aria-hidden="true" />
        <p>{message.text}</p>
        <MessageTime value={message.createdAt} />
      </li>
    );
  }

  const agent = agents.find((member) => member.id === message.agentId);
  const ticketId = message.ticketId;
  return (
    <li
      className={`chat-message chat-message--${message.kind}${grouped ? " chat-message--grouped" : ""}`}
    >
      {grouped ? (
        <span className="chat-message__avatar-spacer" aria-hidden="true" />
      ) : agent ? (
        <AgentAvatar
          agentId={agent.id}
          name={agent.displayName}
          avatarSeed={agent.avatarSeed}
          status={ticket?.execution === "running" ? "working" : "idle"}
          size={34}
          decorative
        />
      ) : (
        <span className="chat-message__avatar" aria-hidden="true">
          Y
        </span>
      )}
      <div className="chat-message__content">
        {!grouped && (
          <header>
            <strong>{message.author}</strong>
            {message.role && <span>{message.role}</span>}
            <MessageTime value={message.createdAt} />
          </header>
        )}
        <p>{message.text}</p>
        {ticket && ticketId && (
          <button
            type="button"
            className="chat-message__ticket-link"
            onClick={() => onSelectTicket(ticketId)}
          >
            <code>{ticket.key}</code>
            <span>{ticket.title}</span>
          </button>
        )}
      </div>
    </li>
  );
}

function MessageTime({ value }: { readonly value: string }) {
  if (!value) return null;
  const date = new Date(value);
  return (
    <time dateTime={value}>
      {date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
    </time>
  );
}
