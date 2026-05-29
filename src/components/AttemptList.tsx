import { CornerDownRight } from "lucide-react";
import type { Attempt } from "../types/game";

type AttemptListProps = {
  attempts: Attempt[];
};

export default function AttemptList({ attempts }: AttemptListProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#101114]/90 p-4">
      <h2 className="text-sm font-semibold uppercase text-zinc-300">Tentativas</h2>

      {attempts.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Nenhuma tentativa ainda.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {attempts.map((attempt, index) => (
            <li
              key={attempt.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 text-zinc-200">
                <CornerDownRight size={15} className="shrink-0 text-zinc-500" aria-hidden="true" />
                <span className="truncate">{attempt.value}</span>
              </span>
              <span className="shrink-0 rounded-full border border-rose-300/20 bg-rose-300/10 px-2 py-1 text-xs font-semibold text-rose-100">
                {attempt.type === "skip" ? "skip" : `erro ${index + 1}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
