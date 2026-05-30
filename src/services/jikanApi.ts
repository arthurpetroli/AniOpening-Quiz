import type { PopularityData } from "../types/popularity";
import { getCache, setCache } from "../utils/localCache";
import { normalizeText } from "../utils/normalizeText";
import { enqueueRateLimited } from "../utils/rateLimiter";
import { getBestPopularityTitleSimilarity } from "../utils/titleMatcher";

const JIKAN_BASE_URL = "https://api.jikan.moe/v4/";
const JIKAN_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SEARCH_MATCH_THRESHOLD = 0.72;

type CachedAnimeResult = {
  result: PopularityData | null;
};

type CachedSearchResult = {
  result: PopularityData | null;
};

const byIdMemoryCache = new Map<number, PopularityData | null>();
const bySearchMemoryCache = new Map<string, PopularityData | null>();
const byIdInFlight = new Map<number, Promise<PopularityData | null>>();
const bySearchInFlight = new Map<string, Promise<PopularityData | null>>();

function wait(ms: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function toStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isNotFoundError(error: unknown) {
  return error instanceof Error && error.message.includes("404");
}

async function requestJikan<T>(url: URL): Promise<T> {
  return enqueueRateLimited(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(url);

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN;
        await wait(Number.isFinite(retryAfter) ? retryAfter * 1000 : 1500 + attempt * 1000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Jikan respondeu ${response.status}`);
      }

      return (await response.json()) as T;
    }

    throw new Error("Jikan rate limit excedido.");
  });
}

export function mapJikanAnimeToPopularityData(data: any): PopularityData {
  return {
    source: "jikan",
    malId: toNumber(data?.mal_id),
    title: toStringValue(data?.title) ?? "Anime sem titulo",
    titleEnglish: toStringValue(data?.title_english),
    titleJapanese: toStringValue(data?.title_japanese),
    titles: Array.isArray(data?.titles)
      ? data.titles
          .map((title: any) => ({
            type: toStringValue(title?.type) ?? "Other",
            title: toStringValue(title?.title) ?? "",
          }))
          .filter((title: { title: string }) => title.title)
      : undefined,
    members: toNumber(data?.members),
    popularity: toNumber(data?.popularity),
    favorites: toNumber(data?.favorites),
    score: toNumber(data?.score),
    scoredBy: toNumber(data?.scored_by),
    rank: toNumber(data?.rank),
    year: toNumber(data?.year),
    season: toStringValue(data?.season),
    type: toStringValue(data?.type),
  };
}

export async function fetchAnimeMalDataById(malId: number): Promise<PopularityData | null> {
  if (byIdMemoryCache.has(malId)) {
    return byIdMemoryCache.get(malId) ?? null;
  }

  if (byIdInFlight.has(malId)) {
    return byIdInFlight.get(malId) ?? null;
  }

  const key = `jikan:anime-v3:${malId}`;
  const cached = getCache<CachedAnimeResult>(key);

  if (cached) {
    byIdMemoryCache.set(malId, cached.result);
    return cached.result;
  }

  const request = (async () => {
    const url = new URL(`anime/${malId}`, JIKAN_BASE_URL);
    const response = await requestJikan<{ data?: any }>(url);
    const result = response.data ? mapJikanAnimeToPopularityData(response.data) : null;

    byIdMemoryCache.set(malId, result);
    setCache<CachedAnimeResult>(key, { result }, JIKAN_CACHE_TTL_MS);

    return result;
  })();

  byIdInFlight.set(malId, request);

  try {
    return await request;
  } catch (error) {
    if (!isNotFoundError(error)) {
      console.warn("Failed to fetch Jikan anime by MAL ID", error);
      return null;
    }

    byIdMemoryCache.set(malId, null);
    setCache<CachedAnimeResult>(key, { result: null }, JIKAN_CACHE_TTL_MS);
    return null;
  } finally {
    byIdInFlight.delete(malId);
  }
}

export async function searchAnimeOnMalByTitle(title: string): Promise<PopularityData | null> {
  const normalizedTitle = normalizeText(title);

  if (!normalizedTitle) {
    return null;
  }

  if (bySearchMemoryCache.has(normalizedTitle)) {
    return bySearchMemoryCache.get(normalizedTitle) ?? null;
  }

  if (bySearchInFlight.has(normalizedTitle)) {
    return bySearchInFlight.get(normalizedTitle) ?? null;
  }

  const key = `jikan:search-v3:${normalizedTitle}`;
  const cached = getCache<CachedSearchResult>(key);

  if (cached) {
    bySearchMemoryCache.set(normalizedTitle, cached.result);
    return cached.result;
  }

  const request = (async () => {
    const url = new URL("anime", JIKAN_BASE_URL);
    url.searchParams.set("q", title);
    url.searchParams.set("limit", "5");

    const response = await requestJikan<{ data?: any[] }>(url);
    const candidates = (response.data ?? []).map(mapJikanAnimeToPopularityData);
    const best = candidates
      .map((candidate) => ({
        candidate,
        similarity: getBestPopularityTitleSimilarity(title, candidate),
      }))
      .sort((a, b) => b.similarity - a.similarity)[0];
    const result = best && best.similarity >= SEARCH_MATCH_THRESHOLD ? best.candidate : null;

    bySearchMemoryCache.set(normalizedTitle, result);
    setCache<CachedSearchResult>(key, { result }, JIKAN_CACHE_TTL_MS);

    return result;
  })();

  bySearchInFlight.set(normalizedTitle, request);

  try {
    return await request;
  } catch (error) {
    console.warn("Failed to search Jikan anime by title", error);
    return null;
  } finally {
    bySearchInFlight.delete(normalizedTitle);
  }
}
