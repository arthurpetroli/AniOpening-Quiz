import { useEffect, useMemo, useState } from "react";
import { getChallengeNames, getModeChallengePool } from "../services/animeThemesApi";
import type { Challenge } from "../types/game";
import { useGame } from "./useGame";

export function useChallengePool() {
  const mode = useGame((state) => state.mode);
  const challenge = useGame((state) => state.challenge);
  const nextChallenge = useGame((state) => state.nextChallenge);
  const [knownNames, setKnownNames] = useState<string[]>([]);

  const extraChallenges = useMemo(
    () => [challenge, nextChallenge].filter(Boolean) as Challenge[],
    [challenge, nextChallenge],
  );

  useEffect(() => {
    let active = true;

    if (!mode) {
      setKnownNames([]);
      return;
    }

    setKnownNames(getChallengeNames(mode.themeType, extraChallenges));

    getModeChallengePool(mode.themeType, mode.hard)
      .then(() => {
        if (active) {
          setKnownNames(getChallengeNames(mode.themeType, extraChallenges));
        }
      })
      .catch(() => {
        if (active) {
          setKnownNames(getChallengeNames(mode.themeType, extraChallenges));
        }
      });

    return () => {
      active = false;
    };
  }, [extraChallenges, mode]);

  useEffect(() => {
    if (!nextChallenge?.videoUrl) {
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = nextChallenge.videoUrl;

    return () => {
      video.removeAttribute("src");
      video.load();
    };
  }, [nextChallenge?.videoUrl]);

  return {
    knownNames,
  };
}
