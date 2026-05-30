export type PopularityData = {
  source: "jikan";
  malId?: number;
  title: string;
  titleEnglish?: string;
  titleJapanese?: string;
  titles?: {
    type: string;
    title: string;
  }[];
  members?: number;
  popularity?: number;
  favorites?: number;
  score?: number;
  scoredBy?: number;
  rank?: number;
  year?: number;
  season?: string;
  type?: string;
};

export type DifficultyLevel = "normal" | "hard" | "mixed";
