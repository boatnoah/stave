import type { HeadShape } from "../types";

interface HeadDefinition {
  readonly path: string;
  readonly earY: number;
  readonly leftEarX: number;
  readonly rightEarX: number;
  readonly earRadiusX: number;
  readonly earRadiusY: number;
}

const headDefinitions: Record<HeadShape, HeadDefinition> = {
  round: {
    path:
      "M15.5 28.3 C15.2 16.4 21.6 9.2 31.6 8.5 C42.8 7.8 49.4 16.2 48.7 29.8 C48 45.1 42.1 54 32 55.1 C20.8 54.7 15.8 44.7 15.5 28.3 Z",
    earY: 32,
    leftEarX: 15.9,
    rightEarX: 48.1,
    earRadiusX: 3.2,
    earRadiusY: 3.2,
  },
  oval: {
    path:
      "M17.1 26.4 C17.5 14.4 23.4 7.2 32.2 7.2 C41.2 7.5 47.2 15.2 47.1 28.2 C47 44.5 41.2 55.3 31.9 56 C22 55.1 16.5 43 17.1 26.4 Z",
    earY: 31.5,
    leftEarX: 17,
    rightEarX: 47,
    earRadiusX: 2.9,
    earRadiusY: 3.35,
  },
  "soft-square": {
    path:
      "M14.9 26.1 C15 15.5 20.4 9.3 30.4 8.7 C42 8.1 48.7 13.9 49.1 25.3 L48.2 41.8 C46.3 50.9 40.3 54.8 31.4 55.3 C22.5 54.7 16.9 50.1 15.3 41.4 Z",
    earY: 32,
    leftEarX: 15.2,
    rightEarX: 48.8,
    earRadiusX: 3,
    earRadiusY: 3.15,
  },
  wide: {
    path:
      "M12.8 27 C13 16.1 20.8 9.8 31.8 9.4 C44 9.1 51.1 16.3 51.3 27.7 L49.6 41.2 C45.9 50.8 40.5 54.1 31.6 54.2 C22.3 54.1 16.6 50.2 13.9 41 Z",
    earY: 32,
    leftEarX: 13.3,
    rightEarX: 50.7,
    earRadiusX: 3.2,
    earRadiusY: 3,
  },
  heart: {
    path:
      "M14.6 26.2 C14.8 15 22.1 8.4 31.8 9.6 C41.8 7.9 49.5 15 49.5 26.8 C49 41.1 42.1 52.8 32 57 C21.5 52.7 15.2 41.4 14.6 26.2 Z",
    earY: 31.5,
    leftEarX: 15,
    rightEarX: 49,
    earRadiusX: 3,
    earRadiusY: 3.2,
  },
  pear: {
    path:
      "M18.1 24.1 C19.2 13.8 24 8 32 8 C40.2 8 45 13.9 46 24.4 C51.2 34.8 48.5 47.8 40.5 53 C34.7 56.8 27.4 56.6 21.6 52.5 C14 47.2 11.9 34.8 18.1 24.1 Z",
    earY: 34,
    leftEarX: 14.5,
    rightEarX: 49.5,
    earRadiusX: 3.1,
    earRadiusY: 3.25,
  },
  long: {
    path:
      "M18.7 24.2 C19 12.3 24.1 5.9 32 5.8 C40.1 5.8 45.6 12.7 45.8 24.7 C46.4 41.7 41.1 56.8 32 58.2 C22.6 56.8 17.7 41.8 18.7 24.2 Z",
    earY: 32,
    leftEarX: 18.2,
    rightEarX: 45.8,
    earRadiusX: 2.7,
    earRadiusY: 3.4,
  },
  diamond: {
    path:
      "M20.4 17.1 C23.3 10.3 28.2 7 32.2 7 C36.5 7 41.2 10.6 44.3 17.6 C50.2 25.9 50.2 38 44.1 46.2 C40.1 52 36.1 55.8 31.9 57.4 C27.5 55.6 23.2 51.8 19.3 45.5 C13.4 36.8 14.3 25.3 20.4 17.1 Z",
    earY: 32,
    leftEarX: 15.8,
    rightEarX: 48.2,
    earRadiusX: 2.8,
    earRadiusY: 3.2,
  },
};

interface HeadProps {
  readonly shape: HeadShape;
}

export function Head({ shape }: HeadProps) {
  const definition = headDefinitions[shape];

  return (
    <g className="agent-avatar__head-lines">
      <ellipse
        className="agent-avatar__ear"
        cx={definition.leftEarX}
        cy={definition.earY}
        rx={definition.earRadiusX}
        ry={definition.earRadiusY}
      />
      <ellipse
        className="agent-avatar__ear"
        cx={definition.rightEarX}
        cy={definition.earY}
        rx={definition.earRadiusX}
        ry={definition.earRadiusY}
      />
      <path className="agent-avatar__head-fill" d={definition.path} />
      <path className="agent-avatar__head-echo" d={definition.path} />
      <path className="agent-avatar__head-outline" d={definition.path} />
    </g>
  );
}
