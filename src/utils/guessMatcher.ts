import type { Challenge } from "../types/game";
import { normalizeForLooseTitle, normalizeText } from "./normalizeText";

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, (_, index) => [index]);

  for (let column = 1; column <= b.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;

      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarity(a: string, b: string) {
  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const longest = Math.max(a.length, b.length);

  return (longest - levenshtein(a, b)) / longest;
}

function titleCandidates(challenge: Challenge) {
  return [challenge.animeName, ...challenge.alternativeNames]
    .map((name) => name.trim())
    .filter(Boolean);
}

export function hasRepeatedGuess(guess: string, attemptedValues: string[]) {
  const normalizedGuess = normalizeText(guess);
  return attemptedValues.some((value) => normalizeText(value) === normalizedGuess);
}

export function isCorrectGuess(guess: string, challenge: Challenge, hard: boolean) {
  const normalizedGuess = normalizeForLooseTitle(guess);

  if (!normalizedGuess || normalizedGuess.length < 2) {
    return false;
  }

  const threshold = hard ? 0.92 : 0.85;
  const candidates = titleCandidates(challenge)
    .flatMap((candidate) => [normalizeText(candidate), normalizeForLooseTitle(candidate)])
    .filter(Boolean);

  return candidates.some((candidate) => {
    if (normalizedGuess === candidate) {
      return true;
    }

    if (!hard && normalizedGuess.length >= 6 && candidate.includes(normalizedGuess)) {
      return true;
    }

    return similarity(normalizedGuess, candidate) >= threshold;
  });
}
