import type { HeadShape } from "../types";

const headPaths: Record<HeadShape, string> = {
  round:
    "M15.5 28.3 C15.2 16.4 21.6 9.2 31.6 8.5 C42.8 7.8 49.4 16.2 48.7 29.8 C48 45.1 42.1 54 32 55.1 C20.8 54.7 15.8 44.7 15.5 28.3 Z",
  oval:
    "M17.1 26.4 C17.5 14.4 23.4 7.2 32.2 7.2 C41.2 7.5 47.2 15.2 47.1 28.2 C47 44.5 41.2 55.3 31.9 56 C22 55.1 16.5 43 17.1 26.4 Z",
  "soft-square":
    "M14.9 26.1 C15 15.5 20.4 9.3 30.4 8.7 C42 8.1 48.7 13.9 49.1 25.3 L48.2 41.8 C46.3 50.9 40.3 54.8 31.4 55.3 C22.5 54.7 16.9 50.1 15.3 41.4 Z",
};

interface HeadProps {
  readonly shape: HeadShape;
}

export function Head({ shape }: HeadProps) {
  const path = headPaths[shape];

  return (
    <g className="agent-avatar__head-lines">
      <circle className="agent-avatar__ear" cx="15.9" cy="32" r="3.2" />
      <circle className="agent-avatar__ear" cx="48.1" cy="32" r="3.2" />
      <path className="agent-avatar__head-fill" d={path} />
      <path className="agent-avatar__head-echo" d={path} />
      <path className="agent-avatar__head-outline" d={path} />
    </g>
  );
}
