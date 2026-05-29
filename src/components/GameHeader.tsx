import { Gauge, Music, Sparkles } from "lucide-react";
import type { Challenge, GameMode, GameStatus, RevealStep } from "../types/game";

type GameHeaderProps = {
  mode: GameMode;
  challenge: Challenge;
  status: GameStatus;
  currentStep: RevealStep;
  stepIndex: number;
};

function themeLabel(challenge: Challenge) {
  return `${challenge.themeType}${challenge.sequence}`;
}

export default function GameHeader({ mode, challenge, status, currentStep, stepIndex }: GameHeaderProps) {
  const isResolved = status === "won" || status === "lost";
  const showHints = !mode.hard || isResolved;
  const artists = challenge.artists.length > 0 ? challenge.artists.join(", ") : "Artista não informado";

  return (
    <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[#101114]/90 p-5">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-amber-300 to-rose-300" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-cyan-200">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1">
              <Music size={14} aria-hidden="true" />
              {mode.label}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-emerald-100">
              On air
            </span>
            {mode.hard ? (
              <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-fuchsia-100">
                Hard
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Adivinhe o anime</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-black/35 px-4 py-3">
            <span className="flex items-center gap-2 text-zinc-400">
              <Gauge size={15} aria-hidden="true" />
              Trecho
            </span>
            <strong className="mt-1 block text-white">{currentStep.time}s</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/35 px-4 py-3">
            <span className="flex items-center gap-2 text-zinc-400">
              <Sparkles size={15} aria-hidden="true" />
              Blur
            </span>
            <strong className="mt-1 block text-white">{isResolved ? 0 : currentStep.blur}px</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/35 px-4 py-3">
            <span className="text-zinc-400">Etapa</span>
            <strong className="mt-1 block text-white">
              {stepIndex + 1}/{mode.revealSteps.length}
            </strong>
          </div>
        </div>
      </div>

      {showHints ? (
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
            <span className="text-zinc-400">Tipo</span>
            <strong className="mt-1 block text-white">{themeLabel(challenge)}</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
            <span className="text-zinc-400">Ano</span>
            <strong className="mt-1 block text-white">{challenge.year ?? "?"}</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
            <span className="text-zinc-400">Temporada</span>
            <strong className="mt-1 block text-white capitalize">{challenge.season ?? "?"}</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
            <span className="text-zinc-400">Artista</span>
            <strong className="mt-1 block truncate text-white" title={artists}>
              {artists}
            </strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}
