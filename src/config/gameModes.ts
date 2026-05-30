import type { GameMode, GameModeId } from "../types/game";

const standardRevealSteps = [
  { time: 1, blur: 30 },
  { time: 3, blur: 22 },
  { time: 5, blur: 15 },
  { time: 8, blur: 8 },
  { time: 12, blur: 3 },
  { time: 20, blur: 1 },
];

export const gameModes = {
  opening: {
    id: "opening",
    label: "Opening",
    path: "/opening",
    themeType: "OP",
    lives: 6,
    revealSteps: standardRevealSteps,
    hard: false,
  },
  ending: {
    id: "ending",
    label: "Ending",
    path: "/ending",
    themeType: "ED",
    lives: 6,
    revealSteps: standardRevealSteps,
    hard: false,
  },
  hardOpening: {
    id: "hardOpening",
    label: "Hard Opening",
    path: "/hard-opening",
    themeType: "OP",
    lives: 6,
    revealSteps: standardRevealSteps,
    hard: true,
  },
  hardEnding: {
    id: "hardEnding",
    label: "Hard Ending",
    path: "/hard-ending",
    themeType: "ED",
    lives: 6,
    revealSteps: standardRevealSteps,
    hard: true,
  },
} satisfies Record<GameModeId, GameMode>;

export const gameModeList = Object.values(gameModes);
