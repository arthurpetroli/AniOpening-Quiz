import { RotateCcw } from "lucide-react";

type ErrorStateProps = {
  message: string | null;
  onRetry: () => void;
};

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <section className="grid min-h-96 place-items-center rounded-lg border border-rose-300/25 bg-rose-300/10 p-8 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-white">Não consegui carregar</h1>
        <p className="mt-3 text-sm leading-6 text-rose-100">
          {message || "A API ou o vídeo falhou por um momento."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200"
        >
          <RotateCcw size={17} aria-hidden="true" />
          Tentar outro
        </button>
      </div>
    </section>
  );
}
