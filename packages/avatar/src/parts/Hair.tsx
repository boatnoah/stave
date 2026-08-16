import type { HairStyle } from "../types";

interface HairProps {
  readonly style: HairStyle;
}

export function HairBack({ style }: HairProps) {
  if (style === "bob") {
    return (
      <path
        className="agent-avatar__hair-back"
        d="M14.1 27 C13.2 15.3 21 6.4 32 6.5 C43.7 6.5 51.3 15.3 50.1 29.5 L48.2 44.5 L42.1 42.4 L42.8 21.4 L21.6 20.5 L21.8 42.6 L15.6 45 Z"
      />
    );
  }

  if (style === "wave") {
    return (
      <path
        className="agent-avatar__hair-back"
        d="M15.1 28 C13.8 15.5 20.7 6.2 31.8 6.2 C43.8 6.1 51 15.1 49.9 30.4 C49.1 41.3 51.7 48.3 47.6 54.5 C44.1 50.9 42.4 45.3 42.8 38.4 L21 38.4 C21.5 45.3 19.8 51.1 16.1 54.6 C12.8 48.5 15.7 40.2 15.1 28 Z"
      />
    );
  }

  if (style === "curls") {
    return (
      <g className="agent-avatar__hair-back agent-avatar__hair-curls">
        <circle cx="17" cy="20" r="6.1" />
        <circle cx="22" cy="12.7" r="6.4" />
        <circle cx="31" cy="9.1" r="6.7" />
        <circle cx="40.4" cy="12.2" r="6.5" />
        <circle cx="47" cy="19.9" r="6.2" />
        <circle cx="48.5" cy="29.3" r="5.5" />
        <circle cx="15.4" cy="29.5" r="5.5" />
      </g>
    );
  }

  if (style === "bun") {
    return (
      <g className="agent-avatar__hair-back">
        <circle cx="40.7" cy="8.3" r="7.2" />
        <path d="M16 27 C15 15 22 7.5 32 7.4 C42.8 7.2 49.5 15.5 48.6 28.5 L45 37 L19.5 37 Z" />
      </g>
    );
  }

  if (style === "locs") {
    return (
      <g className="agent-avatar__hair-back agent-avatar__hair-locs">
        <path d="M15.5 23 C14 13.3 21.4 6.8 31.9 6.8 C43.4 6.8 50 14.6 48.7 25.4" />
        <path d="M17.7 20.4 C14.8 34.2 16 47.4 14.6 54" />
        <path d="M22.3 17.6 C20.2 32.5 21.6 46 20.3 56" />
        <path d="M42.2 17.8 C44.2 32 43.1 46.8 44.4 55.5" />
        <path d="M46.5 21 C49.1 34.9 48.1 47.5 49.4 53.5" />
      </g>
    );
  }

  if (style === "shag") {
    return (
      <path
        className="agent-avatar__hair-back"
        d="M14.8 27 C13.8 15.7 20.4 7.1 31.8 6.9 C43.8 6.7 50.5 15.1 49.6 29 L48.1 42.2 L44 39.4 L41.7 45.7 L38.4 39.1 L24.7 39.6 L21.6 45.5 L18.2 39.4 L14.9 42.1 Z"
      />
    );
  }

  if (style === "double-puff") {
    return (
      <g className="agent-avatar__hair-back agent-avatar__hair-puffs">
        <circle cx="14.2" cy="13.2" r="7.1" />
        <circle cx="49.8" cy="13.2" r="7.1" />
        <path d="M17.3 24 C17.8 13.6 23.7 8.2 32 8.2 C40.4 8.2 46.2 13.9 46.7 24 Z" />
      </g>
    );
  }

  if (style === "side-braid") {
    return (
      <g className="agent-avatar__hair-back agent-avatar__hair-braid">
        <path d="M15.4 27 C14.6 15.2 21.3 6.9 31.9 6.9 C43.5 6.8 49.8 15.4 48.8 29.4 L45.3 39.2 L19.4 38.6 Z" />
        <circle cx="47.5" cy="38" r="3.4" />
        <circle cx="48.8" cy="44" r="3.1" />
        <circle cx="47.6" cy="49.4" r="2.8" />
        <path className="agent-avatar__hair-tie" d="M45.7 52.1 L49.4 53.7" />
      </g>
    );
  }

  return null;
}

export function HairFront({ style }: HairProps) {
  if (style === "bare") {
    return null;
  }

  if (style === "crop") {
    return (
      <path
        className="agent-avatar__hair"
        d="M16.1 24 C16.8 13 23.2 8.1 32.1 8 C42 8 48.1 14.8 48.2 23.6 C43.1 21.2 39.8 17.7 36.3 15.1 C31.4 20.1 24.9 22.4 16.1 24 Z"
      />
    );
  }

  if (style === "wave") {
    return (
      <g>
        <path
          className="agent-avatar__hair"
          d="M15.2 26.5 C14.7 15 21.3 7.1 31.5 7 C42.9 6.9 49.4 14.9 49 27.3 C45.5 25.2 43.5 21.8 42.8 17.9 C38.8 23.8 33.8 24 30.4 18 C26.6 23.7 21.9 25.8 15.2 26.5 Z"
        />
        <path className="agent-avatar__hair-detail" d="M24 13.2 C27.7 15.8 31.1 16 34.6 13.4" />
      </g>
    );
  }

  if (style === "bob") {
    return (
      <g>
        <path
          className="agent-avatar__hair"
          d="M15.2 26.7 C15 15.3 21.9 7.7 32 7.5 C43.1 7.3 49.6 15.8 49 28 C44.1 25.9 41.2 22.7 40 17.8 C34.3 22.3 27.7 22.8 21.5 18.5 C20.7 22.7 18.7 25.2 15.2 26.7 Z"
        />
        <path className="agent-avatar__hair-detail" d="M21.5 18.5 C27.7 22.8 34.3 22.3 40 17.8" />
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

  if (style === "cap") {
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

  if (style === "curls") {
    return (
      <g className="agent-avatar__hair-curls-front">
        <circle cx="21.2" cy="15.1" r="5.1" />
        <circle cx="28.5" cy="11.1" r="5.4" />
        <circle cx="36.1" cy="11.3" r="5.3" />
        <circle cx="43.1" cy="15.8" r="5" />
        <circle cx="18.5" cy="21.6" r="4.7" />
        <circle cx="46.2" cy="21.7" r="4.7" />
      </g>
    );
  }

  if (style === "buzz") {
    return (
      <g>
        <path
          className="agent-avatar__hair agent-avatar__hair--buzz"
          d="M17.7 21.8 C19 12.7 24.4 8 32 7.9 C40 7.9 45.6 13.2 47 22 C39.1 18.9 25.5 18.8 17.7 21.8 Z"
        />
        <path className="agent-avatar__hair-detail" d="M22.3 15.5 L23.1 16.2 M28.6 12.5 L29 13.3 M35.3 12.7 L35 13.5 M41 15.5 L40.3 16.2" />
      </g>
    );
  }

  if (style === "side-sweep") {
    return (
      <g>
        <path
          className="agent-avatar__hair"
          d="M15.4 26.3 C15 15.1 21.6 7.5 31.7 7.3 C43 7.1 49.4 15.1 48.9 27 C43.4 24.8 39.6 20.5 37.2 14.8 C31.8 20.5 25 24.2 15.4 26.3 Z"
        />
        <path className="agent-avatar__hair-detail" d="M37.2 14.8 C32.4 19.5 27.1 22.5 21.1 24" />
      </g>
    );
  }

  if (style === "bun") {
    return (
      <g>
        <path
          className="agent-avatar__hair"
          d="M16.3 25.6 C16.3 14.8 22.4 8 32 7.8 C42.6 7.6 48.5 15.3 48.2 26.7 C42.8 23.7 39.8 20.6 37.8 15.8 C33.7 20.2 26.8 22.5 16.3 25.6 Z"
        />
        <path className="agent-avatar__hair-detail" d="M35.1 10.1 C39.8 9.1 43.1 10.5 45 13.4" />
      </g>
    );
  }

  if (style === "locs") {
    return (
      <g>
        <path
          className="agent-avatar__hair"
          d="M16 24.5 C16.5 13.8 22.6 7.1 32 7 C42.5 6.9 48.2 14.4 48 25.2 C42.8 22.8 38.8 20.3 35.2 15.4 C30.6 20.7 24.7 23 16 24.5 Z"
        />
        <path className="agent-avatar__hair-detail" d="M22.1 14.1 L20.4 25.9 M28 10.7 L27.1 22.2 M35.1 10.2 L36.3 20.9 M41.2 13.1 L43.4 24.5" />
      </g>
    );
  }

  if (style === "quiff") {
    return (
      <g>
        <path
          className="agent-avatar__hair"
          d="M16.2 24.1 C16.3 15.6 21.1 10.1 27.6 8.2 C27.1 3.2 32.2 2.5 34.6 7.5 C38.8 2.8 43.7 5.7 42 10 C45.8 12.6 47.8 17.2 47.9 23.1 C40.4 20.8 36.1 17.4 33.4 13.8 C28.8 19.1 23.5 22.3 16.2 24.1 Z"
        />
        <path className="agent-avatar__hair-detail" d="M29.1 8.5 C33.1 10.2 36.1 10.2 40.3 8.5" />
      </g>
    );
  }

  if (style === "shag") {
    return (
      <path
        className="agent-avatar__hair"
        d="M15.2 26.5 C15 15.2 21.5 7.2 31.7 7 C43.1 6.8 49.4 15.2 48.9 27.4 L44.5 24.2 L42.1 29.1 L38.8 22.1 L34.8 27.6 L30.5 20.8 L25.2 26.6 L21.3 21.3 L18.7 27.8 Z"
      />
    );
  }

  if (style === "double-puff") {
    return (
      <path
        className="agent-avatar__hair"
        d="M17 24 C17.8 14.6 23 9.1 32 9 C41.2 8.9 46.5 14.8 47.2 24 C42.2 21.4 38.2 19.1 35.2 15.2 C31.5 19.7 25 22.2 17 24 Z"
      />
    );
  }

  return (
    <g>
      <path
        className="agent-avatar__hair"
        d="M15.5 26 C15.2 15.2 21.5 7.3 31.9 7.1 C43.2 6.9 49.3 15.1 48.8 27 C43.8 25 40.4 21.1 38.2 16 C32.5 21.6 25.2 24.2 15.5 26 Z"
      />
      <path className="agent-avatar__hair-detail" d="M38.2 16 C33.6 20.2 28.1 22.8 21.8 24.4" />
    </g>
  );
}
