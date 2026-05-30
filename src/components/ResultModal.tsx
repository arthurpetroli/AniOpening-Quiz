import type { Ref } from "react";
import { ArrowRight, Play, Trophy } from "lucide-react";
import type { Challenge, GameStatus } from "../types/game";
import { normalizeText } from "../utils/normalizeText";

type ResultModalProps = {
  status: GameStatus;
  challenge: Challenge;
  actionsRef?: Ref<HTMLDivElement>;
  onWatchFull: () => void;
  onNext: () => void;
};

function themeLabel(challenge: Challenge) {
  return `${challenge.themeType}${challenge.sequence}`;
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString("pt-BR") : "-";
}

function difficultyLabel(level: Challenge["difficultyLevel"]) {
  if (level === "normal") return "Normal";
  if (level === "hard") return "Hard";
  return "Mixed";
}

function titleFromJikanType(challenge: Challenge, type: string) {
  return challenge.popularityData?.titles?.find((title) => title.type.toLowerCase() === type)?.title;
}

function getEnglishTitle(challenge: Challenge) {
  return challenge.popularityData?.titleEnglish ?? titleFromJikanType(challenge, "english");
}

function getJapaneseTitle(challenge: Challenge) {
  return challenge.popularityData?.titleJapanese ?? titleFromJikanType(challenge, "japanese");
}

function getAlternativeTitles(challenge: Challenge, visibleTitles: string[]) {
  const seen = new Set(visibleTitles.filter(Boolean).map((title) => normalizeText(title)));

  return challenge.alternativeNames
    .filter((title) => {
      const normalizedTitle = normalizeText(title);

      if (!normalizedTitle || seen.has(normalizedTitle)) {
        return false;
      }

      seen.add(normalizedTitle);
      return true;
    })
    .slice(0, 4);
}

export default function ResultModal({ status, challenge, actionsRef, onWatchFull, onNext }: ResultModalProps) {
  if (status !== "won" && status !== "lost") {
    return null;
  }

  const won = status === "won";
  const artists = challenge.artists.length > 0 ? challenge.artists.join(", ") : "Artista não informado";
  const englishTitle = getEnglishTitle(challenge);
  const japaneseTitle = getJapaneseTitle(challenge);
  const alternativeTitles = getAlternativeTitles(challenge, [challenge.animeName, englishTitle ?? "", japaneseTitle ?? ""]);

  return (
    <section
      role="dialog"
      aria-live="polite"
      className={[
        "rounded-lg border p-5",
        won
          ? "border-emerald-300/25 bg-emerald-300/10"
          : "border-rose-300/25 bg-rose-300/10",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-black/25">
          <Trophy size={21} aria-hidden="true" className={won ? "text-emerald-200" : "text-rose-200"} />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">{won ? "Você acertou!" : "Fim das vidas!"}</h2>
          <p className="text-sm text-zinc-300">{won ? "O vídeo completo está liberado." : "A resposta correta era:"}</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-black/25 p-4">
        <h3 className="text-2xl font-bold text-white">{challenge.animeName}</h3>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-400">Título em inglês</dt>
            <dd className="mt-1 font-semibold text-white">{englishTitle ?? "Não informado"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Título japonês</dt>
            <dd className="mt-1 font-semibold text-white">{japaneseTitle ?? "Não informado"}</dd>
          </div>
          {alternativeTitles.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-zinc-400">Também conhecido como</dt>
              <dd className="mt-1 font-semibold text-white">{alternativeTitles.join(", ")}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-zinc-400">Tipo</dt>
            <dd className="mt-1 font-semibold text-white">{themeLabel(challenge)}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Música</dt>
            <dd className="mt-1 font-semibold text-white">{challenge.songTitle}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-400">Artista</dt>
            <dd className="mt-1 font-semibold text-white">{artists}</dd>
          </div>
        </dl>
      </div>

      {challenge.popularityData ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-4">
          <h3 className="text-sm font-semibold uppercase text-zinc-300">MyAnimeList</h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-400">Score</dt>
              <dd className="mt-1 font-semibold text-white">{challenge.popularityData.score ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Members</dt>
              <dd className="mt-1 font-semibold text-white">{formatNumber(challenge.popularityData.members)}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Popularity</dt>
              <dd className="mt-1 font-semibold text-white">
                {challenge.popularityData.popularity ? `#${challenge.popularityData.popularity}` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400">Favorites</dt>
              <dd className="mt-1 font-semibold text-white">{formatNumber(challenge.popularityData.favorites)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-400">Dificuldade</dt>
              <dd className="mt-1 font-semibold text-white">{difficultyLabel(challenge.difficultyLevel)}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div ref={actionsRef} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onWatchFull}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <Play size={17} aria-hidden="true" />
          Assistir completo
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200"
        >
          Próximo desafio
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
