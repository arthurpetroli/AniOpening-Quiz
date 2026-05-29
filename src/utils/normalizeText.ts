export function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeForLooseTitle(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/\b(season|part|cour|the final season|final season)\b/g, " ")
    .replace(/\b(tv|movie|ova|ona|specials?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
