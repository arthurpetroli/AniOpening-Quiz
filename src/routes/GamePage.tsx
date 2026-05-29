import { useEffect, useMemo, useState } from "react";
import AttemptList from "../components/AttemptList";
import ErrorState from "../components/ErrorState";
import GameHeader from "../components/GameHeader";
import GamePlayer from "../components/GamePlayer";
import GuessInput from "../components/GuessInput";
import Lives from "../components/Lives";
import LoadingState from "../components/LoadingState";
import ResultModal from "../components/ResultModal";
import { gameModes } from "../config/gameModes";
import { useChallengePool } from "../hooks/useChallengePool";
import { useGame } from "../hooks/useGame";
import { searchAnimeNames } from "../services/animeThemesApi";
import type { GameModeId } from "../types/game";

type GamePageProps = {
  modeId: GameModeId;
};

export default function GamePage({ modeId }: GamePageProps) {
  const mode = gameModes[modeId];
  const [fullReplaySignal, setFullReplaySignal] = useState(0);
  const [videoErrorMessage, setVideoErrorMessage] = useState<string | null>(null);
  const [remoteSuggestions, setRemoteSuggestions] = useState<string[]>([]);
  const { knownNames } = useChallengePool();

  const challenge = useGame((state) => state.challenge);
  const status = useGame((state) => state.status);
  const lives = useGame((state) => state.lives);
  const stepIndex = useGame((state) => state.stepIndex);
  const attempts = useGame((state) => state.attempts);
  const currentGuess = useGame((state) => state.currentGuess);
  const inputError = useGame((state) => state.inputError);
  const errorMessage = useGame((state) => state.errorMessage);
  const startGame = useGame((state) => state.startGame);
  const loadNextChallenge = useGame((state) => state.loadNextChallenge);
  const discardCurrentChallenge = useGame((state) => state.discardCurrentChallenge);
  const submitGuess = useGame((state) => state.submitGuess);
  const skip = useGame((state) => state.skip);
  const setCurrentGuess = useGame((state) => state.setCurrentGuess);

  useEffect(() => {
    void startGame(mode);
  }, [mode, startGame]);

  useEffect(() => {
    setVideoErrorMessage(null);
  }, [challenge?.videoUrl]);

  useEffect(() => {
    let active = true;
    const minChars = mode.hard ? 3 : 2;
    const query = currentGuess.trim();

    if (query.length < minChars) {
      setRemoteSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      searchAnimeNames(query)
        .then((names) => {
          if (active) {
            setRemoteSuggestions(names);
          }
        })
        .catch(() => {
          if (active) {
            setRemoteSuggestions([]);
          }
        });
    }, 120);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [currentGuess, mode.hard]);

  const currentStep = useMemo(
    () => mode.revealSteps[Math.min(stepIndex, mode.revealSteps.length - 1)],
    [mode.revealSteps, stepIndex],
  );

  const suggestions = useMemo(
    () => Array.from(new Set([...knownNames, ...remoteSuggestions])),
    [knownNames, remoteSuggestions],
  );

  if (status === "error") {
    return <ErrorState message={errorMessage} onRetry={() => void startGame(mode)} />;
  }

  if (status === "loading" || !challenge) {
    return <LoadingState message={errorMessage} />;
  }

  const resolved = status === "won" || status === "lost";

  return (
    <div className="space-y-5">
      <GameHeader mode={mode} challenge={challenge} status={status} currentStep={currentStep} stepIndex={stepIndex} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <GamePlayer
            videoUrl={challenge.videoUrl}
            currentStep={currentStep}
            status={status}
            isHardMode={mode.hard}
            fullReplaySignal={fullReplaySignal}
            videoErrorMessage={videoErrorMessage}
            onVideoError={setVideoErrorMessage}
            onTryAnotherVideo={() => void discardCurrentChallenge()}
          />

          <GuessInput
            value={currentGuess}
            suggestions={suggestions}
            attempts={attempts}
            hard={mode.hard}
            disabled={resolved}
            inputError={inputError}
            onChange={setCurrentGuess}
            onSubmit={() => submitGuess()}
            onSkip={skip}
          />

          <ResultModal
            status={status}
            challenge={challenge}
            onWatchFull={() => setFullReplaySignal((value) => value + 1)}
            onNext={() => void loadNextChallenge()}
          />
        </div>

        <aside className="space-y-5">
          <Lives current={lives} total={mode.lives} />
          <AttemptList attempts={attempts} />
        </aside>
      </div>
    </div>
  );
}
