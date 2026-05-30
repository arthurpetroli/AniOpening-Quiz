import { AudioLines, Infinity, ShieldQuestion } from "lucide-react";
import ModeCard from "../components/ModeCard";
import { gameModeList } from "../config/gameModes";
import type { GameModeId } from "../types/game";

const descriptions: Record<GameModeId, string> = {
  opening: "Clipes de opening com 6 vidas, dicas durante a partida e blur progressivo mais gentil.",
  ending: "O mesmo fluxo do modo normal, mas usando endings da AnimeThemes API.",
  hardOpening: "Openings de animes menos conhecidos, com as mesmas vidas, tempo e blur do modo normal.",
  hardEnding: "Endings de animes mais nichados, com a mesma progressão visual do modo normal.",
};

export default function Home() {
  return (
    <div className="space-y-7">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#101114]/90 p-6 sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-amber-300 to-rose-300" />
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase text-cyan-100">
            <Infinity size={14} aria-hidden="true" />
            Modo infinito
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black text-white sm:text-6xl">AniOpening Quiz</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
            Adivinhe o anime pela opening ou ending. A imagem começa borrada, o trecho é curto e cada erro libera mais um pouco da cena.
          </p>

          <div className="mt-8 flex h-20 items-end gap-2 border-y border-white/10 py-4" aria-hidden="true">
            {[34, 72, 48, 88, 56, 64, 40, 78, 52, 92, 46, 70, 58, 84].map((height, index) => (
              <span
                key={index}
                className="w-full rounded-t bg-gradient-to-t from-cyan-300/35 to-amber-200"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border border-white/10 bg-[#101114]/90 p-5">
            <AudioLines className="text-amber-200" size={24} aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold text-white">OP / ED</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Todos os modos: 6 vidas e a mesma progressão.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#101114]/90 p-5">
            <ShieldQuestion className="text-cyan-200" size={24} aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold text-white">AnimeThemes</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Openings e endings em WebM.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {gameModeList.map((mode) => (
          <ModeCard key={mode.id} mode={mode} description={descriptions[mode.id]} />
        ))}
      </section>
    </div>
  );
}
