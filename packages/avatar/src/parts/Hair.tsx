import type { HairStyle } from "../types";

interface HairProps {
  readonly style: HairStyle;
}

export function Hair({ style }: HairProps) {
  if (style === "crop") {
    return (
      <path
        className="agent-avatar__hair"
        d="M17 24 C17.5 13 24 8.6 32.3 8.5 C41.8 8.4 47.4 15.1 47.8 23.5 C43.1 20.4 39.9 17.9 36.1 15.6 C31.7 20.4 25.2 21.9 17 24 Z"
      />
    );
  }

  if (style === "wave") {
    return (
      <path
        className="agent-avatar__hair"
        d="M15.7 27 C14.7 17.1 21.1 8 31.2 8 C42.8 7.9 49.7 15.9 48.4 29.7 C45.9 27.8 44.4 25 43.4 20.7 C40.5 24.4 37.8 24.1 35.1 18.7 C31.7 24 27.9 24.1 25.1 18.4 C23.4 23 20.4 26.2 15.7 27 Z"
      />
    );
  }

  if (style === "bob") {
    return (
      <g>
        <path
          className="agent-avatar__hair"
          d="M15.2 29 C14.6 16.4 21.5 7.8 32 7.6 C43.3 7.4 49.8 16.1 49 29.8 L46.1 39.9 L42.5 38.5 L43 21.1 C36.4 24.2 28.8 22.9 22.1 18.2 L21.5 39.5 L17.8 40.6 Z"
        />
        <path className="agent-avatar__hair-line" d="M22.1 18.2 C28.8 22.9 36.4 24.2 43 21.1" />
      </g>
    );
  }

  if (style === "tuft") {
    return (
      <g>
        <path
          className="agent-avatar__hair"
          d="M17.2 23.8 C18.3 14.7 23.4 9.3 31.8 8.7 C40.4 8.1 46 13.2 47.4 21.7 C42.2 19.9 37.2 18.6 33.1 15.2 C28.2 19.8 23.3 21.7 17.2 23.8 Z"
        />
        <path className="agent-avatar__hair-tuft" d="M27.2 10.2 C28.2 5.9 31.8 4.9 32.4 10.2 C34.7 5.9 38.2 7 37.1 11.3" />
      </g>
    );
  }

  return (
    <g>
      <path
        className="agent-avatar__cap"
        d="M16.1 21.9 C18.3 12.4 24.4 8.3 32 8.2 C40.2 8.1 46.4 12.8 48 21.9 Z"
      />
      <path className="agent-avatar__cap-line" d="M15.2 22.2 C25.2 20.5 39 20.5 49.1 22.1" />
      <path className="agent-avatar__cap-brim" d="M31.2 22 C37.9 21 43 22.1 46.2 24.7" />
    </g>
  );
}
