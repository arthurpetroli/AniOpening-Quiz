import { ArrowRight, Flame, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { GameMode } from "../types/game";

type ModeCardProps = {
  mode: GameMode;
  description: string;
};

export default function ModeCard({ mode, description }: ModeCardProps) {
  const accent = mode.themeType === "OP" ? "cyan" : "amber";
  const palette =
    accent === "cyan"
      ? {
          border: "hover:border-cyan-300/45",
          icon: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
          bar: "from-cyan-300 to-emerald-300",
          text: "text-cyan-200",
        }
      : {
          border: "hover:border-amber-300/45",
          icon: "border-amber-300/20 bg-amber-300/10 text-amber-200",
          bar: "from-amber-300 to-rose-300",
          text: "text-amber-200",
        };

  return (
    <Link
      to={mode.path}
      className={`group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-lg border border-white/10 bg-[#101114]/90 p-6 transition hover:-translate-y-1 hover:bg-[#15171c] ${palette.border}`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${palette.bar}`} />
      <span className="absolute bottom-0 right-0 h-24 w-24 translate-x-8 translate-y-8 border-l border-t border-white/10" />
      <div>
        <div className="mb-5 flex items-center justify-between gap-4">
          <span className={`grid h-12 w-12 place-items-center rounded-lg border ${palette.icon}`}>
            {mode.hard ? <Flame size={22} aria-hidden="true" /> : <PlayCircle size={22} aria-hidden="true" />}
          </span>
          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-medium uppercase text-zinc-300">
            {mode.lives} vidas
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white">{mode.label}</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">{description}</p>
      </div>

      <span className={`mt-8 inline-flex items-center gap-2 text-sm font-semibold transition group-hover:gap-3 ${palette.text}`}>
        Jogar
        <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}
