import type { AvatarPaletteName } from "../types";

export interface AvatarPalette {
  readonly accent: string;
  readonly eye: string;
  readonly face: string;
  readonly hair: string;
  readonly hairLine: string;
  readonly ink: string;
  readonly paper: string;
  readonly paperDeep: string;
}

export const avatarPalettes: Record<AvatarPaletteName, AvatarPalette> = {
  ink: {
    accent: "#a96149",
    eye: "#fffaf1",
    face: "#f8f3e9",
    hair: "#302d29",
    hairLine: "#e8dfd0",
    ink: "#302d29",
    paper: "#f2ecdf",
    paperDeep: "#e8dfd0",
  },
  clay: {
    accent: "#b95f43",
    eye: "#fff9ef",
    face: "#d8a27d",
    hair: "#54372e",
    hairLine: "#d79a77",
    ink: "#392c28",
    paper: "#efe4d7",
    paperDeep: "#dfcebc",
  },
  cocoa: {
    accent: "#d0916d",
    eye: "#fff8ed",
    face: "#93634e",
    hair: "#292321",
    hairLine: "#8a5a47",
    ink: "#2c2522",
    paper: "#eadfd2",
    paperDeep: "#d7c4b2",
  },
  ochre: {
    accent: "#bb7140",
    eye: "#fff9ef",
    face: "#c79862",
    hair: "#5b3d2e",
    hairLine: "#c78d56",
    ink: "#382a24",
    paper: "#efe3d2",
    paperDeep: "#dfcbb4",
  },
  rose: {
    accent: "#b46b64",
    eye: "#fff9f0",
    face: "#dfb2a7",
    hair: "#54383a",
    hairLine: "#d9a09a",
    ink: "#392b2d",
    paper: "#f0e4dd",
    paperDeep: "#dfcbc4",
  },
  umber: {
    accent: "#c7835e",
    eye: "#fff8ed",
    face: "#714b3d",
    hair: "#211f1d",
    hairLine: "#684236",
    ink: "#292321",
    paper: "#eadfd4",
    paperDeep: "#d5c2b2",
  },
};

export function getAvatarPalette(name: AvatarPaletteName): AvatarPalette {
  return avatarPalettes[name];
}
