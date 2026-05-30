import type { DifficultyLevel, PopularityData } from "./popularity";

export type ThemeType = "OP" | "ED";

export type GameModeId = "opening" | "ending" | "hardOpening" | "hardEnding";

export type GameStatus = "loading" | "playing" | "won" | "lost" | "error";

export type AttemptType = "guess" | "skip";

export type RevealStep = {
  time: number;
  blur: number;
};

export type GameMode = {
  id: GameModeId;
  label: string;
  path: string;
  themeType: ThemeType;
  lives: number;
  revealSteps: RevealStep[];
  hard: boolean;
};

export type Challenge = {
  animeId: number;
  animeName: string;
  animeSlug: string;
  alternativeNames: string[];
  themeType: ThemeType;
  sequence: string;
  songTitle: string;
  artists: string[];
  videoUrl: string;
  videoFilename: string;
  year?: number;
  season?: string;
  malId?: number;
  popularityData?: PopularityData;
  difficultyLevel?: DifficultyLevel;
};

export type Attempt = {
  id: string;
  type: AttemptType;
  value: string;
  normalizedValue: string;
};

export type GameState = {
  mode: GameMode | null;
  challenge: Challenge | null;
  nextChallenge: Challenge | null;
  status: GameStatus;
  lives: number;
  stepIndex: number;
  attempts: Attempt[];
  currentGuess: string;
  inputError: string | null;
  errorMessage: string | null;
};
