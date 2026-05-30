import type { ThemeType } from "./game";

export type AnimeThemesApiResponse = {
  anime?: AnimeThemesAnime[];
  data?: AnimeThemesAnime[];
  meta?: Record<string, unknown>;
  links?: Record<string, unknown>;
};

export type AnimeThemesSearchResponse = {
  search?: {
    anime?: AnimeThemesAnime[];
  };
};

export type AnimeThemesAnime = {
  id: number;
  name: string;
  slug?: string;
  year?: number;
  season?: string;
  synonyms?: Array<string | { text?: string; name?: string }>;
  resources?: AnimeThemesResource[];
  animethemes?: AnimeThemesTheme[];
  themes?: AnimeThemesTheme[];
};

export type AnimeThemesResource = {
  id?: number;
  external_id?: number | string | null;
  link?: string | null;
  site?: string | null;
};

export type AnimeThemesTheme = {
  id?: number;
  slug?: string;
  type?: ThemeType | string;
  sequence?: number | string | null;
  group?: { slug?: string; name?: string } | string | null;
  song?: AnimeThemesSong | null;
  animethemeentries?: AnimeThemesEntry[];
  entries?: AnimeThemesEntry[];
};

export type AnimeThemesEntry = {
  id?: number;
  version?: number | string | null;
  episodes?: string | null;
  videos?: AnimeThemesVideo[];
  animethemeentryvideos?: Array<{ video?: AnimeThemesVideo }>;
};

export type AnimeThemesSong = {
  id?: number;
  title?: string | null;
  artists?: AnimeThemesArtist[];
  performances?: Array<{
    artist?: AnimeThemesArtist;
    alias?: string | null;
    as?: string | null;
  }>;
};

export type AnimeThemesArtist = {
  id?: number;
  name?: string | null;
  slug?: string;
};

export type AnimeThemesVideo = {
  id?: number;
  link?: string | null;
  path?: string | null;
  basename?: string | null;
  filename?: string | null;
  size?: number | null;
  mimetype?: string | null;
  resolution?: number | string | null;
  nc?: boolean | null;
  subbed?: boolean | null;
};
