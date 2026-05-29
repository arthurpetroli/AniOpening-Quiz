type LoadingStateProps = {
  message?: string | null;
};

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <section className="grid min-h-96 place-items-center rounded-lg border border-white/10 bg-white/[0.055] p-8 text-center">
      <div>
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
        <h1 className="mt-6 text-2xl font-bold text-white">Carregando desafio</h1>
        <p className="mt-2 text-sm text-zinc-400">{message || "Buscando openings e endings na AnimeThemes API."}</p>
      </div>
    </section>
  );
}
