import { Heart } from "lucide-react";

type LivesProps = {
  current: number;
  total: number;
};

export default function Lives({ current, total }: LivesProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#101114]/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase text-zinc-300">Vidas</h2>
        <span className="text-sm text-zinc-400">
          {current}/{total}
        </span>
      </div>

      <div className="flex gap-2">
        {Array.from({ length: total }, (_, index) => {
          const active = index < current;

          return (
            <span key={index} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/30">
              <Heart
                size={20}
                aria-hidden="true"
                className={active ? "fill-rose-400 text-rose-300" : "text-zinc-700"}
              />
            </span>
          );
        })}
      </div>
    </section>
  );
}
