import type { DifficultyLevel, PopularityData } from "../types/popularity";

export function getDifficultyScore(anime: PopularityData): number {
  let points = 0;

  if (anime.members && anime.members >= 1000000) points += 5;
  else if (anime.members && anime.members >= 500000) points += 4;
  else if (anime.members && anime.members >= 300000) points += 3;
  else if (anime.members && anime.members >= 150000) points += 2;
  else if (anime.members && anime.members >= 80000) points += 1;

  if (anime.popularity && anime.popularity <= 300) points += 5;
  else if (anime.popularity && anime.popularity <= 800) points += 4;
  else if (anime.popularity && anime.popularity <= 1200) points += 3;
  else if (anime.popularity && anime.popularity <= 2000) points += 2;
  else if (anime.popularity && anime.popularity <= 3500) points += 1;

  if (anime.favorites && anime.favorites >= 50000) points += 4;
  else if (anime.favorites && anime.favorites >= 20000) points += 3;
  else if (anime.favorites && anime.favorites >= 8000) points += 2;
  else if (anime.favorites && anime.favorites >= 3000) points += 1;

  if (anime.score && anime.score >= 8.5) points += 2;
  else if (anime.score && anime.score >= 8.0) points += 1;

  if (anime.rank && anime.rank <= 300) points += 2;
  else if (anime.rank && anime.rank <= 1000) points += 1;

  return points;
}

export function classifyAnimeDifficulty(anime: PopularityData): DifficultyLevel {
  const score = getDifficultyScore(anime);
  const hasPrimaryData = Boolean(anime.members || anime.popularity || anime.favorites);
  const clearlyNormal =
    Boolean(anime.members && anime.members >= 300000) ||
    Boolean(anime.popularity && anime.popularity <= 1200) ||
    Boolean(anime.favorites && anime.favorites >= 8000);
  const clearlyHard =
    Boolean(anime.members && anime.members < 150000) &&
    Boolean(anime.popularity && anime.popularity > 2000);

  if (!hasPrimaryData) {
    return "mixed";
  }

  if (score >= 10 || clearlyNormal) {
    return "normal";
  }

  if (score <= 4 || clearlyHard) {
    return "hard";
  }

  return "mixed";
}
