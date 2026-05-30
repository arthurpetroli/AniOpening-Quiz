import { create } from "zustand";
import type { Attempt, Challenge, GameMode, GameState } from "../types/game";
import { getChallengeNames, getRandomChallenge } from "../services/animeThemesApi";
import { hasRepeatedGuess, isCorrectGuess } from "../utils/guessMatcher";
import { normalizeText } from "../utils/normalizeText";

type GameActions = {
  startGame: (mode: GameMode) => Promise<void>;
  loadNextChallenge: () => Promise<void>;
  discardCurrentChallenge: () => Promise<void>;
  submitGuess: (guess?: string) => void;
  skip: () => void;
  setCurrentGuess: (guess: string) => void;
  clearInputError: () => void;
};

function createAttempt(type: Attempt["type"], value: string): Attempt {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  return {
    id,
    type,
    value,
    normalizedValue: normalizeText(value),
  };
}

async function drawPair(mode: GameMode, preferredCurrent?: Challenge | null) {
  const current = preferredCurrent ?? (await getRandomChallenge(mode.themeType, mode.hard));
  let next: Challenge | null = null;

  try {
    next = await getRandomChallenge(mode.themeType, mode.hard);
  } catch {
    next = null;
  }

  return {
    current,
    next,
  };
}

function resultStateForChallenge(mode: GameMode, challenge: Challenge, nextChallenge: Challenge | null): Partial<GameState> {
  return {
    mode,
    challenge,
    nextChallenge,
    status: "playing",
    lives: mode.lives,
    stepIndex: 0,
    attempts: [],
    currentGuess: "",
    inputError: null,
    errorMessage: null,
  };
}

export const useGame = create<GameState & GameActions>((set, get) => ({
  mode: null,
  challenge: null,
  nextChallenge: null,
  status: "loading",
  lives: 0,
  stepIndex: 0,
  attempts: [],
  currentGuess: "",
  inputError: null,
  errorMessage: null,

  startGame: async (mode) => {
    set({
      mode,
      status: "loading",
      lives: mode.lives,
      stepIndex: 0,
      attempts: [],
      currentGuess: "",
      inputError: null,
      errorMessage: null,
      challenge: null,
      nextChallenge: null,
    });

    try {
      const { current, next } = await drawPair(mode);
      set(resultStateForChallenge(mode, current, next));
    } catch (error) {
      set({
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Falha ao carregar o desafio.",
      });
    }
  },

  loadNextChallenge: async () => {
    const { mode, nextChallenge } = get();

    if (!mode) {
      return;
    }

    set({
      status: "loading",
      inputError: null,
      errorMessage: null,
    });

    try {
      const { current, next } = await drawPair(mode, nextChallenge);
      set(resultStateForChallenge(mode, current, next));
    } catch (error) {
      set({
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Falha ao carregar o próximo desafio.",
      });
    }
  },

  discardCurrentChallenge: async () => {
    const { mode } = get();

    if (!mode) {
      return;
    }

    set({
      status: "loading",
      inputError: null,
      errorMessage: "Esse vídeo não carregou. Sorteando outro...",
    });

    try {
      const { current, next } = await drawPair(mode);
      set(resultStateForChallenge(mode, current, next));
    } catch (error) {
      set({
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Não consegui trocar o vídeo.",
      });
    }
  },

  submitGuess: (guess) => {
    const state = get();

    if (state.status !== "playing" || !state.challenge || !state.mode) {
      return;
    }

    const value = (guess ?? state.currentGuess).trim();

    if (!value) {
      set({ inputError: "Digite um palpite antes de enviar." });
      return;
    }

    if (hasRepeatedGuess(value, state.attempts.filter((attempt) => attempt.type === "guess").map((attempt) => attempt.value))) {
      set({ inputError: "Você já tentou esse nome." });
      return;
    }

    if (isCorrectGuess(value, state.challenge, state.mode.hard)) {
      set({
        status: "won",
        stepIndex: state.mode.revealSteps.length - 1,
        currentGuess: "",
        inputError: null,
      });
      return;
    }

    const nextLives = state.lives - 1;
    const attempt = createAttempt("guess", value);

    set({
      attempts: [...state.attempts, attempt],
      lives: Math.max(0, nextLives),
      stepIndex: Math.min(state.stepIndex + 1, state.mode.revealSteps.length - 1),
      status: nextLives <= 0 ? "lost" : "playing",
      currentGuess: "",
      inputError: null,
    });
  },

  skip: () => {
    const state = get();

    if (state.status !== "playing" || !state.mode) {
      return;
    }

    const nextLives = state.lives - 1;
    const attempt = createAttempt("skip", "Skip");

    set({
      attempts: [...state.attempts, attempt],
      lives: Math.max(0, nextLives),
      stepIndex: Math.min(state.stepIndex + 1, state.mode.revealSteps.length - 1),
      status: nextLives <= 0 ? "lost" : "playing",
      currentGuess: "",
      inputError: null,
    });
  },

  setCurrentGuess: (guess) => {
    set({
      currentGuess: guess,
      inputError: null,
    });
  },

  clearInputError: () => {
    set({ inputError: null });
  },
}));

export function getKnownNamesForCurrentGame() {
  const { mode, challenge, nextChallenge } = useGame.getState();

  if (!mode) {
    return [];
  }

  return getChallengeNames(mode.themeType, [challenge, nextChallenge].filter(Boolean) as Challenge[]);
}
