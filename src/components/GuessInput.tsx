import Fuse from "fuse.js";
import { Send, SkipForward } from "lucide-react";
import { FormEvent, useMemo } from "react";
import type { Attempt } from "../types/game";
import { normalizeText } from "../utils/normalizeText";

type GuessInputProps = {
  value: string;
  suggestions: string[];
  attempts: Attempt[];
  hard: boolean;
  disabled: boolean;
  inputError: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
};

export default function GuessInput({
  value,
  suggestions,
  attempts,
  hard,
  disabled,
  inputError,
  onChange,
  onSubmit,
  onSkip,
}: GuessInputProps) {
  const minChars = hard ? 3 : 2;
  const attemptedValues = useMemo(
    () => new Set(attempts.filter((attempt) => attempt.type === "guess").map((attempt) => attempt.normalizedValue)),
    [attempts],
  );

  const availableSuggestions = useMemo(() => {
    const uniqueNames = Array.from(new Set(suggestions)).filter((name) => !attemptedValues.has(normalizeText(name)));

    if (value.trim().length < minChars) {
      return [];
    }

    const fuse = new Fuse(uniqueNames, {
      threshold: hard ? 0.25 : 0.38,
      ignoreLocation: true,
      minMatchCharLength: minChars,
    });

    return fuse
      .search(value)
      .slice(0, 7)
      .map((result) => result.item);
  }, [attemptedValues, hard, minChars, suggestions, value]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="relative rounded-lg border border-white/10 bg-[#101114]/90 p-4">
      <label htmlFor="guess" className="mb-2 block text-sm font-semibold uppercase text-zinc-300">
        Seu palpite
      </label>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <input
          id="guess"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoComplete="off"
          placeholder={hard ? "Digite pelo menos 3 letras" : "Nome do anime"}
          className="h-12 rounded-lg border border-white/10 bg-black/45 px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-amber-300 px-5 text-sm font-bold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={17} aria-hidden="true" />
          Enviar
        </button>

        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SkipForward size={17} aria-hidden="true" />
          Skip
        </button>
      </div>

      {inputError ? <p className="mt-3 text-sm font-medium text-rose-200">{inputError}</p> : null}

      {availableSuggestions.length > 0 ? (
        <div className="absolute left-4 right-4 top-full z-20 mt-2 overflow-hidden rounded-lg border border-white/10 bg-zinc-950 shadow-2xl">
          {availableSuggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => onChange(suggestion)}
              className="block w-full px-4 py-3 text-left text-sm text-zinc-200 transition hover:bg-amber-300/10 hover:text-amber-100"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
