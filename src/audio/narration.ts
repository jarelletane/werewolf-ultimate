import { audioUrl } from "./urls";

export const AMBIENCE_VOLUME = 0.18;
export const DUCKED_VOLUME = AMBIENCE_VOLUME * 0.1;
const NARRATION_GAIN = 3;

export type NarrationClip = { src: string; text: string };

let ambienceFade: number | undefined;
let activeNarrationAudio: HTMLAudioElement | null = null;
let activeNarrationContext: AudioContext | null = null;
let narrationRun = 0;
let resumeAmbienceAfterNarration = false;

export const isNarrationPlaying = () => activeNarrationAudio !== null;

export const fadeAmbience = (target: number, duration = 360) => {
  const audio = document.querySelector<HTMLAudioElement>("#ambience-audio");
  if (!audio) return;
  window.clearInterval(ambienceFade);
  const start = audio.volume;
  const steps = Math.max(1, Math.round(duration / 30));
  let step = 0;
  ambienceFade = window.setInterval(() => {
    step += 1;
    audio.volume = start + (target - start) * (step / steps);
    if (step >= steps) window.clearInterval(ambienceFade);
  }, duration / steps);
};

const restoreAmbience = (run: number) => {
  if (run !== narrationRun) return;
  const audio = document.querySelector<HTMLAudioElement>("#ambience-audio");
  fadeAmbience(AMBIENCE_VOLUME);
  if (resumeAmbienceAfterNarration && audio?.paused) void audio.play().catch(() => undefined);
  resumeAmbienceAfterNarration = false;
};

export const stopNarration = () => {
  const run = ++narrationRun;
  activeNarrationAudio?.pause();
  activeNarrationAudio = null;
  restoreAmbience(run);
};

export const unlockNarrationAudio = () => {
  if (!("AudioContext" in window)) return null;
  activeNarrationContext ??= new AudioContext();
  void activeNarrationContext.resume();
  return activeNarrationContext;
};

export const playNarrationClips = (
  clips: NarrationClip[],
  _fallbackText: string,
  onComplete?: () => void,
  duckedVolume = DUCKED_VOLUME,
  playbackGain = NARRATION_GAIN,
) => {
  if (clips.length === 0) {
    onComplete?.();
    return;
  }
  const background = document.querySelector<HTMLAudioElement>("#ambience-audio");
  const run = ++narrationRun;
  activeNarrationAudio?.pause();
  activeNarrationAudio = null;
  resumeAmbienceAfterNarration = Boolean(background && !background.paused);
  fadeAmbience(duckedVolume, 60);
  const narrationContext = playbackGain > 1 ? unlockNarrationAudio() : null;

  const playAt = (index: number) => {
    if (run !== narrationRun) return;
    if (index >= clips.length) {
      activeNarrationAudio = null;
      restoreAmbience(run);
      onComplete?.();
      return;
    }
    const recording = new Audio(audioUrl(clips[index].src));
    let playbackFailed = false;
    const handlePlaybackFailure = () => {
      if (playbackFailed || run !== narrationRun) return;
      playbackFailed = true;
      activeNarrationAudio = null;
      playAt(index + 1);
    };
    activeNarrationAudio = recording;
    recording.preload = "auto";
    recording.volume = 1;
    if (narrationContext) {
      const source = narrationContext.createMediaElementSource(recording);
      const gain = narrationContext.createGain();
      gain.gain.value = playbackGain;
      source.connect(gain).connect(narrationContext.destination);
    }
    recording.onended = () => playAt(index + 1);
    recording.onerror = handlePlaybackFailure;
    void recording.play().catch(handlePlaybackFailure);
  };

  playAt(0);
};
