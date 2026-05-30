import type { PopularityData } from "../types/popularity";
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

export function calculateTitleSimilarity(a: string, b: string) {
  const normalizedA = normalizeForLooseTitle(a);
  const normalizedB = normalizeForLooseTitle(b);

  if (!normalizedA || !normalizedB) {
    return 0;
  }

  if (normalizedA === normalizedB) {
    return 1;
  }

  if (normalizedA.length >= 6 && normalizedB.includes(normalizedA)) {
    return 0.94;
  }

  if (normalizedB.length >= 6 && normalizedA.includes(normalizedB)) {
    return 0.9;
  }

  const longest = Math.max(normalizedA.length, normalizedB.length);

  return (longest - levenshtein(normalizedA, normalizedB)) / longest;
}

export function getPopularityTitleCandidates(anime: PopularityData) {
  return [
    anime.title,
    anime.titleEnglish,
    anime.titleJapanese,
    ...(anime.titles?.map((title) => title.title) ?? []),
  ]
    .filter(Boolean)
    .map((title) => String(title).trim())
    .filter(Boolean);
}

export function getBestPopularityTitleSimilarity(sourceTitle: string, anime: PopularityData) {
  return Math.max(
    ...getPopularityTitleCandidates(anime).map((candidate) =>
      Math.max(
        calculateTitleSimilarity(sourceTitle, candidate),
        normalizeText(sourceTitle) === normalizeText(candidate) ? 1 : 0,
      ),
    ),
  );
}
