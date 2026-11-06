import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Game } from "../engine/game";
import { audioUrl } from "../audio/urls";
import { AMBIENCE_VOLUME, DUCKED_VOLUME, fadeAmbience, isNarrationPlaying } from "../audio/narration";

export function AmbienceControl({ phase, paused = false }: { phase: Game["phase"]; paused?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [enabled, setEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);
  const source = phase === "night"
    ? audioUrl("/audio/night-ambience.mp3")
    : phase === "day" || phase === "vote"
      ? audioUrl("/audio/day-ambience.mp3?v=clock-405471")
      : audioUrl("/audio/horror-ambience.mp3");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0;
    return () => audio.pause();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let transitionTimer: number | undefined;
    const playSource = async () => {
      if (audio.getAttribute("src") !== source) {
        audio.src = source;
        audio.load();
      }
      try {
        await audio.play();
        fadeAmbience(isNarrationPlaying() ? DUCKED_VOLUME : AMBIENCE_VOLUME);
      } catch {
        setPlaying(false);
      }
    };
    if (!enabled || paused) {
      fadeAmbience(0);
      transitionTimer = window.setTimeout(() => audio.pause(), 380);
    } else if (audio.getAttribute("src") && audio.getAttribute("src") !== source) {
      fadeAmbience(0);
      transitionTimer = window.setTimeout(() => {
        audio.volume = 0;
        void playSource();
      }, 380);
    } else {
      void playSource();
    }
    return () => window.clearTimeout(transitionTimer);
  }, [source, enabled, paused]);

  useEffect(() => {
    if (!enabled || paused) return;
    const unlockAudio = () => {
      const audio = audioRef.current;
      if (audio?.paused) void audio.play().catch(() => undefined);
    };
    document.addEventListener("pointerdown", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
  }, [enabled, source, paused]);

  return (
    <div className="ambience-control">
      <audio id="ambience-audio" ref={audioRef} preload="auto" loop onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <audio id="morning-rooster" src={audioUrl("/audio/rooster.mp3")} preload="auto" />
      <button
        className={enabled ? "ambience-button active" : "ambience-button"}
        onClick={() => setEnabled((current) => !current)}
        aria-pressed={enabled}
        aria-label={enabled ? "Turn off background ambience" : "Turn on background ambience"}
        title={enabled ? "Turn off ambience" : "Turn on ambience"}
      >
        {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        <span>{enabled ? (playing ? "Ambience on" : "Ambience ready") : "Ambience off"}</span>
      </button>
    </div>
  );
}
