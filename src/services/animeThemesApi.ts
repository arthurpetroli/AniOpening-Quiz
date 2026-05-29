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
import { randomInt, uniqueBy } from "../utils/random";

const API_BASE_URL = "https://api.animethemes.moe";
const VIDEO_BASE_URL = "https://v.animethemes.moe";
const INCLUDE = "synonyms,animethemes.animethemeentries.videos,animethemes.song.artists";
const CACHE_TTL_MS = 1000 * 60 * 60 * 4;
const SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const PAGE_SIZE = 50;
const POOL_TARGET_SIZE = 40;
const POOL_MIN_SIZE = 12;
const FALLBACK_LAST_PAGE = 180;

const poolCache: Partial<Record<ThemeType, Challenge[]>> = {};
const searchCache = new Map<string, string[]>();

function cacheKey(themeType: ThemeType) {
  return `ani-opening-quiz:pool:${themeType}`;
}

function metaCacheKey() {
  return "ani-opening-quiz:anime-meta";
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

    if (videoUrl) {
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
        },
      ];
    });
  });

  return uniqueBy(challenges, (challenge) => `${challenge.animeId}:${challenge.themeType}:${challenge.sequence}:${challenge.videoFilename}`);
}

async function fetchChallengePool(themeType: ThemeType) {
  const collected: Challenge[] = [];
  let attempts = 0;

  while (collected.length < POOL_TARGET_SIZE && attempts < 5) {
    attempts += 1;
    const page = await fetchRandomAnimePage();
    const challenges = mapAnimeToChallenges(getResponseAnime(page), themeType);
    collected.push(...challenges);
  }

  return uniqueBy(collected, (challenge) => challenge.videoUrl);
}

export async function getChallengePool(themeType: ThemeType) {
  const memoryPool = poolCache[themeType] ?? [];

  if (memoryPool.length >= POOL_MIN_SIZE) {
    return memoryPool;
  }

  const cachedPool = getCache<Challenge[]>(cacheKey(themeType)) ?? [];

  if (cachedPool.length >= POOL_MIN_SIZE) {
    poolCache[themeType] = uniqueBy([...memoryPool, ...cachedPool], (challenge) => challenge.videoUrl);
    return poolCache[themeType] ?? [];
  }

  const freshPool = await fetchChallengePool(themeType);
  const nextPool = uniqueBy([...memoryPool, ...cachedPool, ...freshPool], (challenge) => challenge.videoUrl);

  if (nextPool.length === 0) {
    throw new Error("Não encontrei vídeos válidos para esse modo.");
  }

  poolCache[themeType] = nextPool;
  setCache(cacheKey(themeType), nextPool, CACHE_TTL_MS);

  return nextPool;
}

export async function getRandomChallenge(themeType: ThemeType) {
  const pool = await getChallengePool(themeType);
  const index = randomInt(0, pool.length - 1);
  const [challenge] = pool.splice(index, 1);

  poolCache[themeType] = pool;

  if (!challenge) {
    throw new Error("Não foi possível sortear um desafio.");
  }

  return challenge;
}

export function getChallengeNames(themeType: ThemeType, extraChallenges: Challenge[] = []) {
  const pool = poolCache[themeType] ?? getCache<Challenge[]>(cacheKey(themeType)) ?? [];

  return uniqueBy([...extraChallenges, ...pool], (challenge) => challenge.animeName)
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
