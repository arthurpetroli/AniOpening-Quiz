import type {
  AnimeThemesAnime,
  AnimeThemesApiResponse,
  AnimeThemesArtist,
  AnimeThemesEntry,
  AnimeThemesSearchResponse,
  AnimeThemesTheme,
  AnimeThemesVideo,
} from "../types/animeThemes";
import type { Challenge, ThemeType } from "../types/game";
import { getCache, setCache } from "../utils/localCache";
import { normalizeText } from "../utils/normalizeText";
import { randomInt, shuffle, uniqueBy } from "../utils/random";
import {
  enrichChallengePoolWithPopularity,
  getPoolForMode,
  splitChallengesByDifficulty,
} from "./popularityService";

const API_BASE_URL = "https://api.animethemes.moe";
const VIDEO_BASE_URL = "https://v.animethemes.moe";
const INCLUDE = "synonyms,resources,animethemes.animethemeentries.videos,animethemes.song.artists";
const CACHE_TTL_MS = 1000 * 60 * 60 * 4;
const SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const FAILED_VIDEO_TTL_MS = 1000 * 60 * 60 * 24;
const PLAYED_ANIME_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PAGE_SIZE = 50;
const POOL_TARGET_SIZE = 12;
const POOL_MIN_SIZE = 4;
const MAX_RANDOM_PAGES_PER_POOL = 8;
const CHALLENGES_PER_RANDOM_PAGE = 2;
const FALLBACK_LAST_PAGE = 180;

const allPoolCache: Partial<Record<ThemeType, Challenge[]>> = {};
const modePoolCache: Partial<Record<string, Challenge[]>> = {};
const allPoolInFlight: Partial<Record<ThemeType, Promise<Challenge[]>>> = {};
const modePoolInFlight: Partial<Record<string, Promise<Challenge[]>>> = {};
const searchCache = new Map<string, string[]>();
const failedVideoUrls = new Set<string>();

function cacheKey(themeType: ThemeType) {
  return `ani-opening-quiz:pool-v5:${themeType}`;
}

function modePoolKey(themeType: ThemeType, hard: boolean) {
  return `${themeType}:${hard ? "hard" : "normal"}`;
}

function playedAnimeCacheKey(key: string) {
  return `ani-opening-quiz:played-anime-v1:${key}`;
}

function getPlayedAnimeIds(key: string) {
  return new Set(getCache<number[]>(playedAnimeCacheKey(key)) ?? []);
}

function setPlayedAnimeIds(key: string, animeIds: Set<number>) {
  setCache(playedAnimeCacheKey(key), Array.from(animeIds), PLAYED_ANIME_TTL_MS);
}

function markAnimeAsPlayed(key: string, animeId: number) {
  const playedAnimeIds = getPlayedAnimeIds(key);
  playedAnimeIds.add(animeId);
  setPlayedAnimeIds(key, playedAnimeIds);
}

function clearPlayedAnimeHistory(key: string) {
  setPlayedAnimeIds(key, new Set());
}

function withoutPlayedAnime(challenges: Challenge[], key: string) {
  const playedAnimeIds = getPlayedAnimeIds(key);
  return challenges.filter((challenge) => !playedAnimeIds.has(challenge.animeId));
}

function metaCacheKey() {
  return "ani-opening-quiz:anime-meta";
}

function failedVideoCacheKey() {
  return "ani-opening-quiz:failed-videos-v1";
}

function getFailedVideoUrls() {
  const cachedUrls = getCache<string[]>(failedVideoCacheKey()) ?? [];

  for (const url of cachedUrls) {
    failedVideoUrls.add(url);
  }

  return failedVideoUrls;
}

function isUnavailableVideoUrl(videoUrl: string) {
  return getFailedVideoUrls().has(videoUrl);
}

function withoutUnavailableVideos(challenges: Challenge[]) {
  const unavailableUrls = getFailedVideoUrls();
  return challenges.filter((challenge) => !unavailableUrls.has(challenge.videoUrl));
}

export function markVideoAsUnavailable(challenge: Pick<Challenge, "themeType" | "videoUrl">) {
  if (!challenge.videoUrl) {
    return;
  }

  failedVideoUrls.add(challenge.videoUrl);
  setCache(failedVideoCacheKey(), Array.from(failedVideoUrls), FAILED_VIDEO_TTL_MS);

  allPoolCache[challenge.themeType] = withoutUnavailableVideos(allPoolCache[challenge.themeType] ?? []);

  for (const [key, pool] of Object.entries(modePoolCache)) {
    if (key.startsWith(`${challenge.themeType}:`)) {
      modePoolCache[key] = withoutUnavailableVideos(pool ?? []);
    }
  }

  const cachedPool = getCache<Challenge[]>(cacheKey(challenge.themeType)) ?? [];
  setCache(cacheKey(challenge.themeType), withoutUnavailableVideos(cachedPool), CACHE_TTL_MS);
}

function getResponseAnime(response: AnimeThemesApiResponse) {
  return response.anime ?? response.data ?? [];
}

function numberFromUnknown(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function extractLastPage(response: AnimeThemesApiResponse) {
  const meta = response.meta ?? {};
  const links = response.links ?? {};
  const nestedPagination =
    typeof meta.pagination === "object" && meta.pagination !== null
      ? (meta.pagination as Record<string, unknown>)
      : {};

  const direct =
    numberFromUnknown(meta.last_page) ??
    numberFromUnknown(meta.lastPage) ??
    numberFromUnknown(nestedPagination.last_page) ??
    numberFromUnknown(nestedPagination.lastPage);

  if (direct) {
    return direct;
  }

  const total = numberFromUnknown(meta.total) ?? numberFromUnknown(nestedPagination.total);
  const perPage =
    numberFromUnknown(meta.per_page) ??
    numberFromUnknown(meta.perPage) ??
    numberFromUnknown(nestedPagination.per_page) ??
    PAGE_SIZE;

  if (total && perPage) {
    return Math.ceil(total / perPage);
  }

  const lastLink = typeof links.last === "string" ? links.last : "";

  if (lastLink) {
    const match = lastLink.match(/page%5Bnumber%5D=(\d+)|page\[number\]=(\d+)/);
    const parsed = Number(match?.[1] ?? match?.[2]);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return FALLBACK_LAST_PAGE;
}

function normalizeThemeType(value: string | undefined) {
  if (value?.toUpperCase().startsWith("OP")) {
    return "OP";
  }

  if (value?.toUpperCase().startsWith("ED")) {
    return "ED";
  }

  return null;
}

function getSequence(theme: AnimeThemesTheme) {
  const raw = theme.sequence ?? theme.slug?.match(/\d+/)?.[0] ?? "";
  const sequence = String(raw).trim();

  return sequence || "?";
}

function getVideoUrl(video: AnimeThemesVideo) {
  const explicitLink = video.link?.trim();

  if (explicitLink?.startsWith("http")) {
    return explicitLink;
  }

  const path = video.path?.trim();

  if (path?.startsWith("http")) {
    return path;
  }

  if (path?.startsWith("/")) {
    return `${VIDEO_BASE_URL}${path}`;
  }

  const filename = video.basename ?? video.filename ?? path;

  if (!filename) {
    return null;
  }

  return `${VIDEO_BASE_URL}/${filename}`;
}

function getVideoFilename(video: AnimeThemesVideo, videoUrl: string) {
  return video.basename ?? video.filename ?? videoUrl.split("/").pop() ?? "theme.webm";
}

function getVideos(entry: AnimeThemesEntry) {
  const directVideos = entry.videos ?? [];
  const pivotVideos = entry.animethemeentryvideos?.flatMap((item) => (item.video ? [item.video] : [])) ?? [];

  return [...directVideos, ...pivotVideos];
}

function getBestVideo(entries: AnimeThemesEntry[]) {
  const videos = entries.flatMap(getVideos);
  const sortedVideos = [...videos].sort((a, b) => {
    const aResolution = Number(a.resolution) || 0;
    const bResolution = Number(b.resolution) || 0;

    if (a.nc !== b.nc) {
      return a.nc ? -1 : 1;
    }

    return bResolution - aResolution;
  });

  for (const video of sortedVideos) {
    const videoUrl = getVideoUrl(video);

    if (videoUrl && !isUnavailableVideoUrl(videoUrl)) {
      return {
        video,
        videoUrl,
      };
    }
  }

  return null;
}

function artistName(artist: AnimeThemesArtist | undefined) {
  return artist?.name?.trim() ?? "";
}

function getArtists(theme: AnimeThemesTheme) {
  const song = theme.song;
  const directArtists = song?.artists?.map(artistName) ?? [];
  const performanceArtists =
    song?.performances
      ?.map((performance) => performance.alias?.trim() || artistName(performance.artist))
      .filter(Boolean) ?? [];

  return [...new Set([...directArtists, ...performanceArtists].filter(Boolean))];
}

function getAlternativeNames(anime: AnimeThemesAnime) {
  return (
    anime.synonyms
      ?.map((synonym) => {
        if (typeof synonym === "string") {
          return synonym;
        }

        return synonym.text ?? synonym.name ?? "";
      })
      .filter(Boolean) ?? []
  );
}

function getMalId(anime: AnimeThemesAnime) {
  const resource = anime.resources?.find((item) => item.site?.toLowerCase() === "myanimelist");
  const id = Number(resource?.external_id);

  return Number.isFinite(id) && id > 0 ? id : undefined;
}

function getAnimeNames(animeList: AnimeThemesAnime[]) {
  return uniqueBy(
    animeList
      .flatMap((anime) => [anime.name, ...getAlternativeNames(anime)])
      .map((name) => name.trim())
      .filter(Boolean),
    (name) => normalizeText(name),
  );
}

export async function fetchAnimePage(page: number, pageSize = PAGE_SIZE) {
  const url = new URL("/anime", API_BASE_URL);
  url.searchParams.set("include", INCLUDE);
  url.searchParams.set("page[number]", String(page));
  url.searchParams.set("page[size]", String(pageSize));

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`AnimeThemes respondeu ${response.status}`);
  }

  return (await response.json()) as AnimeThemesApiResponse;
}

async function getLastAnimePage() {
  const cached = getCache<number>(metaCacheKey());

  if (cached) {
    return cached;
  }

  const firstPage = await fetchAnimePage(1, 1);
  const lastPage = extractLastPage(firstPage);
  setCache(metaCacheKey(), lastPage, CACHE_TTL_MS);

  return lastPage;
}

export async function fetchRandomAnimePage() {
  const lastPage = await getLastAnimePage();
  const page = randomInt(1, Math.max(1, lastPage));

  return fetchAnimePage(page, PAGE_SIZE);
}

function pickRandomPageNumber(lastPage: number, usedPages: Set<number>) {
  const safeLastPage = Math.max(1, lastPage);

  if (usedPages.size >= safeLastPage) {
    return randomInt(1, safeLastPage);
  }

  let page = randomInt(1, safeLastPage);

  while (usedPages.has(page)) {
    page = randomInt(1, safeLastPage);
  }

  usedPages.add(page);

  return page;
}

export function mapAnimeToChallenges(animeList: AnimeThemesAnime[], themeType: ThemeType) {
  const challenges = animeList.flatMap((anime): Challenge[] => {
    const themes = anime.animethemes ?? anime.themes ?? [];

    return themes.flatMap((theme) => {
      if (normalizeThemeType(theme.type) !== themeType) {
        return [];
      }

      const entries = theme.animethemeentries ?? theme.entries ?? [];
      const bestVideo = getBestVideo(entries);

      if (!bestVideo) {
        return [];
      }

      const sequence = getSequence(theme);

      return [
        {
          animeId: anime.id,
          animeName: anime.name,
          animeSlug: anime.slug ?? String(anime.id),
          alternativeNames: getAlternativeNames(anime),
          themeType,
          sequence,
          songTitle: theme.song?.title?.trim() || "Tema sem título",
          artists: getArtists(theme),
          videoUrl: bestVideo.videoUrl,
          videoFilename: getVideoFilename(bestVideo.video, bestVideo.videoUrl),
          year: anime.year,
          season: anime.season,
          malId: getMalId(anime),
        },
      ];
    });
  });

  return uniqueBy(challenges, (challenge) => `${challenge.animeId}:${challenge.themeType}:${challenge.sequence}:${challenge.videoFilename}`);
}

async function fetchChallengePool(themeType: ThemeType) {
  let collected: Challenge[] = [];
  const lastPage = await getLastAnimePage();
  const usedPages = new Set<number>();
  let attempts = 0;

  while (collected.length < POOL_TARGET_SIZE && attempts < MAX_RANDOM_PAGES_PER_POOL) {
    attempts += 1;
    const pageNumber = pickRandomPageNumber(lastPage, usedPages);
    const page = await fetchAnimePage(pageNumber, PAGE_SIZE);
    const challenges = shuffle(mapAnimeToChallenges(getResponseAnime(page), themeType)).slice(
      0,
      CHALLENGES_PER_RANDOM_PAGE,
    );
    collected = uniqueBy([...collected, ...withoutUnavailableVideos(challenges)], (challenge) => challenge.videoUrl);
  }

  return collected;
}

export async function getChallengePool(themeType: ThemeType) {
  return getModeChallengePool(themeType, false);
}

async function getAllChallengePool(themeType: ThemeType) {
  const memoryPool = withoutUnavailableVideos(allPoolCache[themeType] ?? []);

  if (memoryPool.length >= POOL_MIN_SIZE) {
    allPoolCache[themeType] = memoryPool;
    return memoryPool;
  }

  if (allPoolInFlight[themeType]) {
    return allPoolInFlight[themeType] ?? [];
  }

  const cachedPool = withoutUnavailableVideos(getCache<Challenge[]>(cacheKey(themeType)) ?? []);

  if (cachedPool.length >= POOL_MIN_SIZE) {
    allPoolCache[themeType] = uniqueBy([...memoryPool, ...cachedPool], (challenge) => challenge.videoUrl);
    return allPoolCache[themeType] ?? [];
  }

  const request = (async () => {
    const freshPool = await fetchChallengePool(themeType);
    const enrichedFreshPool = await enrichChallengePoolWithPopularity(freshPool);
    const nextPool = uniqueBy([...memoryPool, ...cachedPool, ...enrichedFreshPool], (challenge) => challenge.videoUrl);

    if (nextPool.length === 0) {
      throw new Error("Não encontrei vídeos válidos para esse modo.");
    }

    allPoolCache[themeType] = nextPool;
    setCache(cacheKey(themeType), nextPool, CACHE_TTL_MS);

    return nextPool;
  })();

  allPoolInFlight[themeType] = request;

  try {
    return await request;
  } finally {
    delete allPoolInFlight[themeType];
  }
}

function selectChallengesForMode(challenges: Challenge[], hard: boolean) {
  const pools = splitChallengesByDifficulty(withoutUnavailableVideos(challenges));
  const preferredPool = getPoolForMode(hard, pools);

  return uniqueBy(preferredPool, (challenge) => challenge.videoUrl);
}

export async function getModeChallengePool(themeType: ThemeType, hard: boolean) {
  const key = modePoolKey(themeType, hard);
  const rawExistingModePool = withoutUnavailableVideos(modePoolCache[key] ?? []);
  const existingModePool = withoutPlayedAnime(rawExistingModePool, key);

  if (existingModePool.length >= POOL_MIN_SIZE) {
    modePoolCache[key] = existingModePool;
    return existingModePool;
  }

  if (modePoolInFlight[key]) {
    return modePoolInFlight[key] ?? [];
  }

  const request = (async () => {
    let allPool = await getAllChallengePool(themeType);
    let modePool = withoutPlayedAnime(
      uniqueBy([...existingModePool, ...selectChallengesForMode(allPool, hard)], (challenge) => challenge.videoUrl),
      key,
    );
    let attempts = 0;

    while (modePool.length < POOL_MIN_SIZE && attempts < 2) {
      attempts += 1;
      const freshPool = await fetchChallengePool(themeType);
      const enrichedFreshPool = await enrichChallengePoolWithPopularity(freshPool);
      allPool = uniqueBy([...allPool, ...enrichedFreshPool], (challenge) => challenge.videoUrl);
      allPoolCache[themeType] = allPool;
      setCache(cacheKey(themeType), allPool, CACHE_TTL_MS);
      modePool = withoutPlayedAnime(
        uniqueBy([...modePool, ...selectChallengesForMode(allPool, hard)], (challenge) => challenge.videoUrl),
        key,
      );
    }

    if (modePool.length === 0 && getPlayedAnimeIds(key).size > 0) {
      clearPlayedAnimeHistory(key);
      modePool = uniqueBy(
        [...rawExistingModePool, ...selectChallengesForMode(allPool, hard)],
        (challenge) => challenge.videoUrl,
      );
    }

    if (modePool.length === 0) {
      throw new Error("Não encontrei vídeos válidos para esse modo.");
    }

    modePoolCache[key] = modePool;

    return modePool;
  })();

  modePoolInFlight[key] = request;

  try {
    return await request;
  } finally {
    delete modePoolInFlight[key];
  }
}

export async function getRandomChallenge(themeType: ThemeType, hard = false) {
  const key = modePoolKey(themeType, hard);
  let pool = withoutPlayedAnime(withoutUnavailableVideos(await getModeChallengePool(themeType, hard)), key);

  if (pool.length === 0 && getPlayedAnimeIds(key).size > 0) {
    clearPlayedAnimeHistory(key);
    pool = withoutUnavailableVideos(await getModeChallengePool(themeType, hard));
  }

  const index = randomInt(0, pool.length - 1);
  const [challenge] = pool.splice(index, 1);

  if (!challenge) {
    throw new Error("Não foi possível sortear um desafio.");
  }

  modePoolCache[key] = pool.filter((item) => item.animeId !== challenge.animeId);
  markAnimeAsPlayed(key, challenge.animeId);

  return challenge;
}

export function getChallengeNames(themeType: ThemeType, extraChallenges: Challenge[] = []) {
  const allPool = allPoolCache[themeType] ?? getCache<Challenge[]>(cacheKey(themeType)) ?? [];
  const modePools = Object.entries(modePoolCache)
    .filter(([key]) => key.startsWith(`${themeType}:`))
    .flatMap(([, pool]) => pool ?? []);

  return uniqueBy([...extraChallenges, ...allPool, ...modePools], (challenge) => challenge.animeName)
    .flatMap((challenge) => [challenge.animeName, ...challenge.alternativeNames])
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export async function searchAnimeNames(query: string) {
  const normalizedQuery = normalizeText(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  const key = `ani-opening-quiz:anime-search:${normalizedQuery}`;
  const memoryHit = searchCache.get(normalizedQuery);

  if (memoryHit) {
    return memoryHit;
  }

  const cached = getCache<string[]>(key);

  if (cached) {
    searchCache.set(normalizedQuery, cached);
    return cached;
  }

  const url = new URL("/search", API_BASE_URL);
  url.searchParams.set("q", query.trim());

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Busca da AnimeThemes respondeu ${response.status}`);
  }

  const data = (await response.json()) as AnimeThemesSearchResponse;
  const names = getAnimeNames(data.search?.anime ?? []).sort((a, b) => a.localeCompare(b));

  searchCache.set(normalizedQuery, names);
  setCache(key, names, SEARCH_CACHE_TTL_MS);

  return names;
}
