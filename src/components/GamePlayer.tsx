import { Loader2, Maximize2, Minimize2, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GameStatus, RevealStep } from "../types/game";

type GamePlayerProps = {
  videoUrl: string;
  currentStep: RevealStep;
  status: GameStatus;
  isHardMode: boolean;
  fullReplaySignal: number;
  videoErrorMessage: string | null;
  onVideoError: (message: string | null) => void;
  onTryAnotherVideo: () => void;
};

function formatTime(value: number) {
  if (!Number.isFinite(value)) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export default function GamePlayer({
  videoUrl,
  currentStep,
  status,
  isHardMode,
  fullReplaySignal,
  videoErrorMessage,
  onVideoError,
  onTryAnotherVideo,
}: GamePlayerProps) {
  const playerRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const delayedErrorRef = useRef<number | null>(null);
  const reachedLimitRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const isResolved = status === "won" || status === "lost";

  const limit = useMemo(() => {
    if (isResolved) {
      return duration || currentStep.time;
    }

    return currentStep.time;
  }, [currentStep.time, duration, isResolved]);

  const progress = limit > 0 ? Math.min(100, (currentTime / limit) * 100) : 0;

  function clearDelayedError() {
    if (delayedErrorRef.current) {
      window.clearTimeout(delayedErrorRef.current);
      delayedErrorRef.current = null;
    }
  }

  function clearVideoError() {
    clearDelayedError();
    onVideoError(null);
  }

  function reportVideoError(message: string) {
    clearDelayedError();
    delayedErrorRef.current = window.setTimeout(() => {
      setIsBuffering(false);
      onVideoError(message);
    }, 1600);
  }

  function isBenignPlaybackAbort(error: unknown) {
    const name = error instanceof DOMException ? error.name.toLowerCase() : "";
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    return (
      name === "aborterror" ||
      message.includes("aborted") ||
      message.includes("interrupted") ||
      message.includes("pause")
    );
  }

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || isResolved) {
      return;
    }

    video.pause();
    video.currentTime = 0;
    reachedLimitRef.current = false;
    setCurrentTime(0);
    setIsPlaying(false);
    setIsBuffering(false);
    clearVideoError();
  }, [currentStep.time, isResolved, videoUrl]);

  useEffect(() => {
    setRetryNonce(0);
    reachedLimitRef.current = false;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsBuffering(false);
    clearVideoError();

    return clearDelayedError;
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || fullReplaySignal === 0 || !isResolved) {
      return;
    }

    video.currentTime = 0;
    void video.play();
  }, [fullReplaySignal, isResolved]);

  function handleTimeUpdate() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!isResolved && video.currentTime >= currentStep.time) {
      reachedLimitRef.current = true;
      video.pause();
      video.currentTime = currentStep.time;
      setCurrentTime(currentStep.time);
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }

    setCurrentTime(video.currentTime);
  }

  async function playSegment() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!isResolved && video.currentTime >= currentStep.time - 0.05) {
      video.currentTime = 0;
      reachedLimitRef.current = false;
    }

    clearVideoError();
    setIsBuffering(true);

    try {
      await video.play();
      setIsPlaying(true);
      setIsBuffering(false);
    } catch (error) {
      setIsPlaying(false);
      setIsBuffering(false);

      if (isBenignPlaybackAbort(error)) {
        return;
      }

      reportVideoError(
        error instanceof Error
          ? `O navegador nao conseguiu iniciar esse video: ${error.message}`
          : "O navegador nao conseguiu iniciar esse video.",
      );
    }
  }

  function pauseVideo() {
    reachedLimitRef.current = false;
    videoRef.current?.pause();
    setIsPlaying(false);
    setIsBuffering(false);
  }

  function replay() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime = 0;
    reachedLimitRef.current = false;
    void playSegment();
  }

  function retryCurrentVideo() {
    clearVideoError();
    setIsBuffering(false);
    setCurrentTime(0);
    setDuration(0);
    setRetryNonce((value) => value + 1);
  }

  function seekToClientX(clientX: number) {
    const video = videoRef.current;
    const track = progressRef.current;

    if (!video || !track || limit <= 0) {
      return;
    }

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const targetTime = Math.min(limit, ratio * limit);

    reachedLimitRef.current = false;
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
  }

  function handleProgressPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    seekToClientX(event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleProgressPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1) {
      return;
    }

    seekToClientX(event.clientX);
  }

  async function toggleFullscreen() {
    if (!playerRef.current) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await playerRef.current.requestFullscreen();
    } catch {
      onVideoError("Nao foi possivel alternar a tela cheia neste navegador.");
    }
  }

  function handleVideoError() {
    const code = videoRef.current?.error?.code;

    if (code === 1 || reachedLimitRef.current) {
      return;
    }

    const messageByCode: Record<number, string> = {
      2: "Falha de rede ao carregar o video da AnimeThemes.",
      3: "O navegador nao conseguiu decodificar esse video.",
      4: "Esse formato de video nao esta disponivel para o navegador.",
    };

    setIsPlaying(false);
    reportVideoError(
      code
        ? messageByCode[code] ?? "Nao foi possivel carregar esse video."
        : "Nao foi possivel carregar esse video.",
    );
  }

  return (
    <section ref={playerRef} className="game-player rounded-lg border border-white/10 bg-zinc-950/75 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="game-player-video overflow-hidden rounded-2xl bg-black">
        <video
          key={`${videoUrl}-${retryNonce}`}
          ref={videoRef}
          className="aspect-video w-full scale-105 object-cover"
          src={videoUrl}
          preload="metadata"
          playsInline
          controls={isResolved}
          onLoadStart={() => {
            setIsBuffering(true);
            clearVideoError();
          }}
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration);
            setIsBuffering(false);
            clearVideoError();
          }}
          onCanPlay={() => {
            setIsBuffering(false);
            clearVideoError();
          }}
          onWaiting={() => setIsBuffering(true)}
          onStalled={() => reportVideoError("O carregamento do video demorou demais. Tente recarregar este video ou sortear outro.")}
          onTimeUpdate={handleTimeUpdate}
          onPlaying={() => {
            setIsPlaying(true);
            setIsBuffering(false);
            clearVideoError();
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={handleVideoError}
          style={{
            filter: `blur(${isResolved ? 0 : currentStep.blur}px)`,
            transition: "filter 0.5s ease",
          }}
        />
      </div>

      {videoErrorMessage ? (
        <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4">
          <p className="text-sm font-medium text-amber-100">{videoErrorMessage}</p>
          <p className="mt-1 text-sm text-zinc-300">
            Isso costuma acontecer quando o servidor de videos da AnimeThemes fica indisponivel por alguns instantes.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={retryCurrentVideo}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-cyan-300 px-4 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200"
            >
              Recarregar video
            </button>
            <button
              type="button"
              onClick={onTryAnotherVideo}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Tentar outro video
            </button>
          </div>
        </div>
      ) : null}

      <div className="px-2 pb-1 pt-4">
        <div
          ref={progressRef}
          role="slider"
          aria-label={isResolved ? "Navegar pelo video" : "Navegar pelo trecho liberado"}
          aria-valuemin={0}
          aria-valuemax={Math.round(limit)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
              return;
            }

            const video = videoRef.current;

            if (!video) {
              return;
            }

            const direction = event.key === "ArrowRight" ? 1 : -1;
            const targetTime = Math.min(limit, Math.max(0, video.currentTime + direction * 0.5));
            video.currentTime = targetTime;
            setCurrentTime(targetTime);
          }}
          className="group h-5 cursor-pointer touch-none rounded-full py-[7px] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
        >
          <div className="relative h-[6px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300 transition-all"
              style={{ width: `${progress}%` }}
            />
            <span
              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-black/40 bg-white opacity-0 shadow transition group-hover:opacity-100"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-300">
            {isResolved ? `${formatTime(currentTime)} / ${formatTime(duration)}` : `${formatTime(currentTime)} / ${currentStep.time}s`}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={isPlaying ? pauseVideo : playSegment}
              disabled={isBuffering && !isPlaying}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200"
            >
              {isBuffering && !isPlaying ? (
                <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              ) : isPlaying ? (
                <Pause size={17} aria-hidden="true" />
              ) : (
                <Play size={17} aria-hidden="true" />
              )}
              {isBuffering && !isPlaying ? "Carregando" : isPlaying ? "Pausar" : isResolved ? "Tocar" : "Tocar trecho"}
            </button>

            <button
              type="button"
              onClick={replay}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <RotateCcw size={17} aria-hidden="true" />
              Replay
            </button>

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {isFullscreen ? <Minimize2 size={17} aria-hidden="true" /> : <Maximize2 size={17} aria-hidden="true" />}
              {isFullscreen ? "Sair" : "Tela cheia"}
            </button>

            {isHardMode && !isResolved ? (
              <span className="inline-flex h-11 items-center rounded-lg border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 text-xs font-semibold uppercase text-fuchsia-100">
                Hard
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
