import { AgentAvatar } from "@stave/avatar";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
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
  onSendMessage,
  onAnswerDecision,
}: {
  readonly snapshot: WorkspaceSnapshot;
  readonly agents: readonly AgentSnapshot[];
  readonly channel: ChatChannelId;
  readonly ticketId: string | null;
  readonly agentId: string | null;
  readonly onSelectChannel: (channel: ChatChannelId) => void;
  readonly onSelectTicket: (ticketId: string) => void;
  readonly onSelectAgent: (agentId: string) => void;
  readonly onSendMessage: (text: string) => Promise<void>;
  readonly onAnswerDecision: (
    decisionId: string,
    option: string,
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLOListElement>(null);
  const ticket = snapshot.tickets.find(
    (candidate) => candidate.id === ticketId,
  );
  const agent = agents.find((candidate) => candidate.id === agentId);
  const messages = buildChatMessages(snapshot, agents);
  const visibleMessages = messages.filter((message) => {
    if (ticketId) return message.ticketId === ticketId;
    if (agentId) return message.agentId === agentId;
    if ("channel" in message && message.channel)
      return message.channel === channel;
    if (channel === "releases")
      return isSuccessfulRelease(message, snapshot.runs);
    return true;
  });
  const scrollKey = `${ticketId ?? agentId ?? channel}:${visibleMessages.at(-1)?.id ?? "empty"}`;
  const waitingTickets = snapshot.tickets.filter(
    (candidate) => candidate.execution === "waiting_user",
  );

  useEffect(() => {
    if (!scrollKey) return;
    const list = messagesRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [scrollKey]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSendMessage(text);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  function insert(token: string) {
    setDraft(
      (current) =>
        `${current}${current && !current.endsWith(" ") ? " " : ""}${token} `,
    );
  }

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
        {ticket &&
          snapshot.decisions
            .filter((decision) => decision.ticketId === ticket.id)
            .map((decision) => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                onAnswer={(option) => onAnswerDecision(decision.id, option)}
              />
            ))}

        <ol className="chat-messages" aria-live="polite" ref={messagesRef}>
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
        <form className="chat-composer" onSubmit={(event) => void send(event)}>
          <label className="visually-hidden" htmlFor="chat-message-input">
            Message{" "}
            {ticket ? ticket.key : agent ? agent.displayName : `#${channel}`}
          </label>
          <textarea
            id="chat-message-input"
            rows={2}
            maxLength={4000}
            placeholder={
              ticket ? `Reply to ${ticket.key}` : `Message #${channel}`
            }
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="chat-composer__footer">
            <div className="chat-composer__chips">
              {agents.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => insert(`@${member.displayName}`)}
                >
                  @{member.displayName}
                </button>
              ))}
              <button type="button" onClick={() => insert("@you")}>
                @you
              </button>
              <button type="button" onClick={() => insert("/run STV-1")}>
                /run
              </button>
              <button type="button" onClick={() => insert("/ticket ")}>
                /ticket
              </button>
              {snapshot.tickets.slice(0, 4).map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => insert(candidate.key)}
                >
                  {candidate.key}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="button button--small button--quiet"
              disabled={!draft.trim() || sending}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          <p className="chat-composer__hint">
            Enter to send · Shift+Enter for a new line · /assign STV-1 Maya ·
            /cancel STV-1
          </p>
        </form>
      </section>
    </section>
  );
}

function DecisionCard({
  decision,
  onAnswer,
}: {
  readonly decision: WorkspaceSnapshot["decisions"][number];
  readonly onAnswer: (option: string) => Promise<void>;
}) {
  return (
    <section
      className={`chat-decision chat-decision--${decision.status}`}
      aria-label={`${decision.header}: ${decision.status}`}
    >
      <p className="chat-decision__eyebrow">
        <span aria-hidden="true" />
        {decision.status === "pending"
          ? "Waiting on you"
          : decision.status === "answered"
            ? "Decision answered"
            : "Run interrupted"}
      </p>
      <h2>{decision.question}</h2>
      <div className="chat-decision__options">
        {decision.options.map((option) => (
          <button
            key={option.label}
            type="button"
            disabled={decision.status !== "pending"}
            aria-pressed={decision.answer === option.label}
            onClick={() => void onAnswer(option.label)}
          >
            <strong>{option.label}</strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>
      <p className="chat-decision__note">
        {decision.status === "pending"
          ? "Choose an option to resume this run."
          : decision.status === "answered"
            ? `You chose ${decision.answer}. The run resumed.`
            : "This run stopped before a choice was submitted. Restart it to continue."}
      </p>
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
        <p>{renderChatText(message.text, agents)}</p>
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
        <p>{renderChatText(message.text, agents)}</p>
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

function renderChatText(text: string, agents: readonly AgentSnapshot[]) {
  const names = agents.map((member) => member.displayName).join("|");
  const matcher = new RegExp(`(@you|@(?:${names})\\b)`, "giu");
  const output: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(matcher)) {
    const offset = match.index ?? cursor;
    const mention = match[0];
    if (offset > cursor) output.push(text.slice(cursor, offset));
    output.push(
      <span
        className={`chat-mention${/^@you$/iu.test(mention) ? " chat-mention--you" : ""}`}
        key={`${offset}-${mention}`}
      >
        {mention}
      </span>,
    );
    cursor = offset + mention.length;
  }
  if (cursor < text.length) output.push(text.slice(cursor));
  return output;
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
