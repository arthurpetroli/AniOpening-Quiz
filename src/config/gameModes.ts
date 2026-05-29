import type { GameMode, GameModeId } from "../types/game";

export const gameModes = {
  opening: {
    id: "opening",
    label: "Opening",
    path: "/opening",
    themeType: "OP",
    lives: 6,
    revealSteps: [
      { time: 1, blur: 30 },
      { time: 3, blur: 22 },
      { time: 5, blur: 15 },
      { time: 8, blur: 8 },
      { time: 12, blur: 3 },
      { time: 20, blur: 1 },
    ],
    hard: false,
  },
  ending: {
    id: "ending",
    label: "Ending",
    path: "/ending",
    themeType: "ED",
    lives: 6,
    revealSteps: [
      { time: 1, blur: 30 },
      { time: 3, blur: 22 },
      { time: 5, blur: 15 },
      { time: 8, blur: 8 },
      { time: 12, blur: 3 },
      { time: 20, blur: 1 },
    ],
    hard: false,
  },
  hardOpening: {
    id: "hardOpening",
    label: "Hard Opening",
    path: "/hard-opening",
    themeType: "OP",
    lives: 5,
    revealSteps: [
      { time: 0.75, blur: 45 },
      { time: 1.5, blur: 35 },
      { time: 3, blur: 25 },
      { time: 5, blur: 12 },
      { time: 8, blur: 4 },
    ],
    hard: true,
  },
  hardEnding: {
    id: "hardEnding",
    label: "Hard Ending",
    path: "/hard-ending",
    themeType: "ED",
    lives: 5,
    revealSteps: [
      { time: 0.75, blur: 45 },
      { time: 1.5, blur: 35 },
      { time: 3, blur: 25 },
      { time: 5, blur: 12 },
      { time: 8, blur: 4 },
    ],
    hard: true,
  },
} satisfies Record<GameModeId, GameMode>;

export const gameModeList = Object.values(gameModes);
