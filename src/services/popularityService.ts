import type { Challenge } from "../types/game";
import type { DifficultyLevel } from "../types/popularity";
import { classifyAnimeDifficulty } from "../utils/difficultyClassifier";
import { fetchAnimeMalDataById, searchAnimeOnMalByTitle } from "./jikanApi";

export type DifficultyPools = {
  normalPool: Challenge[];
  hardPool: Challenge[];
  mixedPool: Challenge[];
  all: Challenge[];
};

export async function getPopularityDataForChallenge(challenge: Challenge) {
  if (challenge.malId) {
    const byId = await fetchAnimeMalDataById(challenge.malId);

    if (byId) {
      return byId;
    }
  }

  const byTitle = await searchAnimeOnMalByTitle(challenge.animeName);

  if (byTitle) {
    return byTitle;
  }

  for (const alternativeName of challenge.alternativeNames.slice(0, 2)) {
    const byAlternativeTitle = await searchAnimeOnMalByTitle(alternativeName);

    if (byAlternativeTitle) {
      return byAlternativeTitle;
    }
  }

  return null;
}

export async function enrichChallengeWithPopularity(challenge: Challenge): Promise<Challenge> {
  try {
    const popularityData = await getPopularityDataForChallenge(challenge);

    if (!popularityData) {
      return {
        ...challenge,
        difficultyLevel: "mixed",
      };
    }

    return {
      ...challenge,
      popularityData,
      malId: popularityData.malId ?? challenge.malId,
      difficultyLevel: classifyAnimeDifficulty(popularityData),
    };
  } catch (error) {
    console.warn("Failed to enrich challenge with Jikan data", error);

    return {
      ...challenge,
      difficultyLevel: "mixed",
    };
  }
}

export async function enrichChallengePoolWithPopularity(challenges: Challenge[]) {
  const byAnime = new Map<string, Challenge>();

  for (const challenge of challenges) {
    const key = challenge.malId ? `mal:${challenge.malId}` : `title:${challenge.animeName}`;

    if (!byAnime.has(key)) {
      byAnime.set(key, challenge);
    }
  }

  const enrichmentByKey = new Map<string, Challenge>();

  for (const [key, challenge] of byAnime) {
    enrichmentByKey.set(key, await enrichChallengeWithPopularity(challenge));
  }

  const enriched = challenges.map((challenge) => {
    const key = challenge.malId ? `mal:${challenge.malId}` : `title:${challenge.animeName}`;
    const enrichedReference = enrichmentByKey.get(key);

    return {
      ...challenge,
      malId: enrichedReference?.malId ?? challenge.malId,
      popularityData: enrichedReference?.popularityData,
      difficultyLevel: enrichedReference?.difficultyLevel,
    };
  });

  return enriched.map((challenge) => ({
    ...challenge,
    difficultyLevel: challenge.difficultyLevel ?? "mixed" as DifficultyLevel,
  }));
}

export function splitChallengesByDifficulty(challenges: Challenge[]): DifficultyPools {
  return {
    normalPool: challenges.filter((challenge) => challenge.difficultyLevel === "normal"),
    hardPool: challenges.filter((challenge) => challenge.difficultyLevel === "hard"),
    mixedPool: challenges.filter((challenge) => challenge.difficultyLevel === "mixed" || !challenge.difficultyLevel),
    all: challenges,
  };
}

export function getPoolForMode(hard: boolean, pools: DifficultyPools) {
  if (hard) {
    return pools.hardPool;
  }

  return [...pools.normalPool, ...pools.mixedPool];
}
