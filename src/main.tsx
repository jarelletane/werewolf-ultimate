import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Moon,
  Sun,
  Users,
  Settings,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Shield,
  Skull,
  Eye,
  Vote,
  BookOpen,
  Check,
  ArrowLeft,
  Trophy,
  Menu,
  Trash2,
  Home,
  Plus,
  Minus,
} from "lucide-react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Game,
  initialGame,
  ROLES,
  RoleId,
  roleOf,
  nightSteps,
  alive,
  resolveNight,
  eliminate,
  checkWinner,
  inferCardsOnlyWinner,
  Action,
} from "./engine/game";
import "./style.css";
type SavedGame = { id: string; name: string; updatedAt: number; game: Game };
type Store = {
  game: Game;
  saves: SavedGame[];
  currentId: string | null;
  set: (g: Game) => void;
  createGame: (g: Game, name: string) => void;
  loadGame: (id: string) => void;
  deleteGame: (id: string) => void;
  reset: () => void;
};
const useGame = create<Store>()(
  persist(
    (set) => ({
      game: initialGame(),
      saves: [],
      currentId: null,
      set: (game) =>
        set((state) => ({
          game,
          saves: state.currentId
            ? state.saves.map((save) =>
                save.id === state.currentId
                  ? { ...save, game, updatedAt: Date.now() }
                  : save,
              )
            : state.saves,
        })),
      createGame: (game, name) =>
        set((state) => {
          const id = crypto.randomUUID();
          return {
            game,
            currentId: id,
            saves: [{ id, name, updatedAt: Date.now(), game }, ...state.saves],
          };
        }),
      loadGame: (id) =>
        set((state) => {
          const save = state.saves.find((item) => item.id === id);
          return save ? { game: save.game, currentId: id } : {};
        }),
      deleteGame: (id) =>
        set((state) => ({
          saves: state.saves.filter((save) => save.id !== id),
          currentId: state.currentId === id ? null : state.currentId,
        })),
      reset: () => set({ game: initialGame(), currentId: null }),
    }),
    { name: "werewolf-ultimate-v2" },
  ),
);

const AMBIENCE_VOLUME = 0.18;
const DUCKED_VOLUME = 0.0015;
let ambienceFade: number | undefined;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeNarrationAudio: HTMLAudioElement | null = null;
let narrationRun = 0;
let resumeAmbienceAfterNarration = false;

const fadeAmbience = (target: number, duration = 360) => {
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
  activeUtterance = null;
  if (resumeAmbienceAfterNarration && audio?.paused) {
    void audio.play().catch(() => {
      // Some mobile browsers require another tap after taking audio focus.
    });
  }
  resumeAmbienceAfterNarration = false;
};

const stopNarration = () => {
  const run = ++narrationRun;
  activeNarrationAudio?.pause();
  activeNarrationAudio = null;
  activeUtterance = null;
  window.speechSynthesis?.cancel();
  restoreAmbience(run);
};

const say = (text: string, onComplete?: () => void) => {
  if (!("speechSynthesis" in window)) {
    onComplete?.();
    return;
  }
  const audio = document.querySelector<HTMLAudioElement>("#ambience-audio");
  const run = ++narrationRun;
  resumeAmbienceAfterNarration = Boolean(audio && !audio.paused);
  window.speechSynthesis.cancel();
  fadeAmbience(DUCKED_VOLUME, 60);
  const utter = new SpeechSynthesisUtterance(text);
  activeUtterance = utter;
  utter.rate = 0.83;
  utter.pitch = 0.75;
  const voices = window.speechSynthesis.getVoices();
  utter.voice =
    voices.find(
      (voice) =>
        voice.lang.startsWith("en") &&
        /Daniel|Samantha|Karen|Moira|Google UK English/i.test(voice.name),
    ) ||
    voices.find((voice) => voice.lang.startsWith("en")) ||
    null;
  utter.onend = () => {
    if (activeUtterance === utter) {
      restoreAmbience(run);
      onComplete?.();
    }
  };
  utter.onerror = () => {
    if (activeUtterance === utter) {
      restoreAmbience(run);
      onComplete?.();
    }
  };
  window.speechSynthesis.speak(utter);
};

type NarrationClip = { src: string; text: string };

const playNarrationClips = (
  clips: NarrationClip[],
  fallbackText: string,
  onComplete?: () => void,
  duckedVolume = DUCKED_VOLUME,
) => {
  if (clips.length === 0) {
    say(fallbackText, onComplete);
    return;
  }
  const background = document.querySelector<HTMLAudioElement>("#ambience-audio");
  const run = ++narrationRun;
  activeNarrationAudio?.pause();
  activeNarrationAudio = null;
  activeUtterance = null;
  window.speechSynthesis?.cancel();
  resumeAmbienceAfterNarration = Boolean(background && !background.paused);
  fadeAmbience(duckedVolume, duckedVolume === 0 ? 30 : 60);

  const playAt = (index: number) => {
    if (run !== narrationRun) return;
    if (index >= clips.length) {
      activeNarrationAudio = null;
      restoreAmbience(run);
      onComplete?.();
      return;
    }
    const recording = new Audio(clips[index].src);
    activeNarrationAudio = recording;
    recording.preload = "auto";
    recording.volume = 1;
    recording.onended = () => playAt(index + 1);
    recording.onerror = () => {
      activeNarrationAudio = null;
      say(clips.slice(index).map((clip) => clip.text).join(" "), onComplete);
    };
    void recording.play().catch(() => {
      activeNarrationAudio = null;
      say(clips.slice(index).map((clip) => clip.text).join(" "), onComplete);
    });
  };

  playAt(0);
};
function Timer({ seconds, label, paused = false }: { seconds: number; label: string; paused?: boolean }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    setRemaining(seconds);
    setRunning(true);
  }, [seconds, label]);
  useEffect(() => {
    if (!running || paused) return;
    const t = setInterval(() => {
      setRemaining((current) => {
        const next = Math.max(0, current - 1);
        if (next === 0) setRunning(false);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, label, paused]);
  const format = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  return (
    <div className="timer">
      <div className="eyebrow">{label}</div>
      <div className="time">{format(remaining)}</div>
      <div className="progress">
        <div
          style={{ width: `${(remaining / Math.max(1, seconds)) * 100}%` }}
        />
      </div>
      <div className="timerbuttons">
        <button onClick={() => setRunning(!running)}>
          {running ? <Pause size={15} /> : <Play size={15} />}{" "}
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={() => {
            setRunning(true);
            setRemaining(seconds);
          }}
        >
          <RotateCcw size={15} /> Reset
        </button>
        <button onClick={() => setRemaining((r) => r + 30)}>+30s</button>
      </div>
    </div>
  );
}

function AmbienceControl({ phase, paused = false }: { phase: Game["phase"]; paused?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [enabled, setEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);
  const source =
    phase === "night"
      ? "/audio/night-ambience.mp3"
      : phase === "day" || phase === "vote"
        ? "/audio/day-ambience.mp3?v=forest-30746"
        : "/audio/horror-ambience.mp3";

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
        fadeAmbience(
          activeNarrationAudio || activeUtterance
            ? DUCKED_VOLUME
            : AMBIENCE_VOLUME,
        );
      } catch {
        setPlaying(false);
      }
    };

    if (!enabled || paused) {
      fadeAmbience(0);
      transitionTimer = window.setTimeout(() => audio.pause(), 380);
    } else if (
      audio.getAttribute("src") &&
      audio.getAttribute("src") !== source
    ) {
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

  function toggle() {
    setEnabled((current) => !current);
  }

  return (
    <div className="ambience-control">
      <audio
        id="ambience-audio"
        ref={audioRef}
        preload="auto"
        loop
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <audio id="morning-rooster" src="/audio/rooster.mp3" preload="auto" />
      <button
        className={enabled ? "ambience-button active" : "ambience-button"}
        onClick={toggle}
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

function WelcomeScreen({
  showGuide,
  onShowGuide,
  onStartGame,
  onBack,
}: {
  showGuide: boolean;
  onShowGuide: () => void;
  onStartGame: () => void;
  onBack: () => void;
}) {
  const teamObjective: Record<string, string> = {
    village: "Find and eliminate every wolf-aligned player.",
    wolf: "Survive until the wolves equal or outnumber the Village.",
    neutral: "Complete the unique win condition printed on the role card.",
  };
  const introduction =
    "Welcome to the village. By day, the village debates and votes. By night, hidden roles wake and act. Keep your card secret, listen carefully, and decide whom to trust before the wolves take control.";
  const gameExplanation =
    "First, deal the physical role cards. Each player secretly checks their card. When night falls, everyone closes their eyes and the moderator follows the prompts while active roles silently choose their targets. At dawn, reveal the victims and discuss what happened. Every surviving player may make their case before the village votes to eliminate one suspect. Continue through night and day until a faction or special role completes its objective.";
  return (
    <div className="welcome-screen">
      <section className="panel welcome-hero">
        <div className="moonart"><Moon size={42} /></div>
        <div className="eyebrow">A SOCIAL DEDUCTION GAME</div>
        <h2>The village is ready</h2>
        <p>
          By day, the village debates and votes. By night, hidden roles wake
          and act. Keep your card secret, listen carefully, and decide whom to
          trust before the wolves take control.
        </p>
        <button
          className="narrate-guide"
          onClick={() =>
            playNarrationClips(
              [{ src: "/audio/narration/01-welcome.mp3", text: introduction }],
              introduction,
              undefined,
              0,
            )
          }
        >
          <Volume2 size={16} /> Play introduction
        </button>
        <div className="welcome-actions">
          <button className="primary" onClick={onStartGame}>
            Start game <ChevronRight size={17} />
          </button>
          <button className="secondary" onClick={onShowGuide}>
            <BookOpen size={17} /> {showGuide ? "Hide guide" : "How to play"}
          </button>
        </div>
        <button className="back-to-setup" onClick={onBack}><ArrowLeft size={14} /> Back to player setup</button>
      </section>
      {showGuide && (
        <div className="guide-content">
          <section className="panel">
            <div className="panelhead"><BookOpen size={18} /><h2>How a game works</h2><button className="smallbtn" onClick={() => playNarrationClips([{ src: "/audio/narration/02-how-to-play.mp3", text: gameExplanation }], gameExplanation)}><Volume2 size={14} /> Listen</button></div>
            <div className="game-steps">
              <div><span>1</span><strong>Deal the cards</strong><p>Each player secretly checks their physical role card. The app only needs the cards included in the deck.</p></div>
              <div><span>2</span><strong>Play the night</strong><p>Everyone closes their eyes. The moderator follows the app’s prompts while active roles silently choose targets.</p></div>
              <div><span>3</span><strong>Debate by day</strong><p>Reveal the night’s victims, discuss suspicions, and let every surviving player make their case.</p></div>
              <div><span>4</span><strong>Vote and survive</strong><p>The village votes to eliminate one suspect. Continue until a faction or special role reaches its objective.</p></div>
            </div>
          </section>
          <section className="panel">
            <div className="panelhead"><Shield size={18} /><h2>Role objectives</h2></div>
            <p className="muted">Your card is secret. Follow its objective without openly revealing your role.</p>
            <div className="role-guide-grid">
              {ROLES.map((role) => (
                <article className={`role-guide-card ${role.team}`} key={role.id}>
                  <div><strong>{role.name}</strong><span>{role.team}</span></div>
                  <p>{role.description}</p>
                  <small><b>Objective:</b> {teamObjective[role.team]}</small>
                  <button
                    className="role-narrate"
                    aria-label={`Narrate the ${role.name} objective`}
                    onClick={() => say(`${role.name}. ${role.description} Your objective is to ${teamObjective[role.team].replace(/^[A-Z]/, (letter) => letter.toLowerCase())}`)}
                  >
                    <Volume2 size={13} /> Listen
                  </button>
                </article>
              ))}
            </div>
          </section>
          <button className="primary big guide-start" onClick={onStartGame}>
            Start the game <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

function HomeScreen({
  saves,
  onNew,
  onContinue,
  onDelete,
}: {
  saves: SavedGame[];
  onNew: () => void;
  onContinue: (save: SavedGame) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-crest"><Moon size={30} /></div>
        <div className="eyebrow">THE MODERATOR'S DESK</div>
        <h1>Welcome to Werewolf</h1>
        <p>Guide your village through suspicion, darkness, and the hunt.</p>
        <button className="primary home-new" onClick={onNew}>
          Create new game <ChevronRight size={18} />
        </button>
      </section>
      <section className="saved-games">
        <div className="saved-heading">
          <div><span className="eyebrow">YOUR CHRONICLES</span><h2>Continue a game</h2></div>
          <span className="pill">{saves.length} saved</span>
        </div>
        {saves.length === 0 ? (
          <div className="empty-saves"><BookOpen size={28} /><p>No saved games yet.</p><small>Create a game and it will autosave here.</small></div>
        ) : (
          <div className="save-list">
            {saves.map((save) => (
              <article className="save-card" key={save.id}>
                <button className="save-main" onClick={() => onContinue(save)}>
                  <span className="save-icon"><Moon size={18} /></span>
                  <span><strong>{save.name}</strong><small>{save.game.phase === "setup" ? "Ready to begin" : `Round ${save.game.round} · ${save.game.phase}`} · {alive(save.game).length} alive</small></span>
                  <ChevronRight size={18} />
                </button>
                <button className="delete-save" aria-label={`Delete ${save.name}`} onClick={() => onDelete(save.id)}><Trash2 size={16} /></button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function App() {
  const { game: g, saves, set, createGame, loadGame, deleteGame, reset } = useGame();
  const [screen, setScreen] = useState<"home" | "create" | "intro" | "game">("home");
  const [tab, setTab] = useState<"game" | "players" | "log">("game");
  const [voices, setVoices] = useState(false);
  const [setupView, setSetupView] = useState<"intro" | "guide" | "setup">("setup");
  const [confirmReset, setConfirmReset] = useState(false);
  const [showEndGame, setShowEndGame] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [suggestedWinner, setSuggestedWinner] = useState<"Village" | "Werewolves" | "Serial Killer" | null>(null);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const [names, setNames] = useState("");
  const [playerCount, setPlayerCount] = useState(12);
  const [counts, setCounts] = useState<Partial<Record<RoleId, number>>>({ werewolf: 2, seer: 1, doctor: 1, witch: 1, hunter: 1, villager: 6 });
  const [setupError, setSetupError] = useState("");
  const [selection, setSelection] = useState("");
  const [secondary, setSecondary] = useState("");
  const [witchMode, setWitchMode] = useState<"heal" | "poison">("heal");
  const [witchInstructionReady, setWitchInstructionReady] = useState(false);
  const [manualTarget, setManualTarget] = useState("");
  const [eliminatedRole, setEliminatedRole] = useState<RoleId | "">("");
  const [voteTarget, setVoteTarget] = useState("");
  const [dawnTransition, setDawnTransition] = useState(false);
  const previousPhase = useRef(g.phase);
  const skipNextAutomaticNarration = useRef(false);
  const players = alive(g),
    steps = nightSteps(g),
    current = steps[g.step],
    actor = current?.actors[0],
    cardTotal = Object.values(counts).reduce((sum, count) => sum + (count || 0), 0),
    people = names
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
  const awaitingReveal = g.cardsOnly
    ? g.players.find((player) => !player.alive && !player.revealedRole)
    : undefined;
  const narration =
    g.phase === "night"
      ? (current
          ? `${g.step === 0 ? (g.round === 1 ? "Night one begins. Everyone, close your eyes. Keep your head lowered and remain silent. " : "Night has fallen once again. Everyone, close your eyes. Keep your head lowered and remain silent. ") : ""}${
              current.key === "wolves"
                ? g.round === 1
                  ? "Werewolves, open your eyes. Look around and recognise your fellow Werewolves."
                  : "Werewolves, awaken. Silently choose one player to eliminate."
                : current.key === "seer"
                  ? g.round === 1
                    ? "Seer, open your eyes. Point to one player whose allegiance you wish to discover."
                    : "Seer, awaken. Point to one player whose allegiance you wish to discover."
                  : current.key === "doctor-intro"
                    ? "Doctor, open your eyes so the moderator may identify you."
                    : current.key === "witch-intro"
                      ? "Witch, open your eyes so the moderator may identify you."
                      : current.key === "doctor"
                        ? "Doctor, awaken. Choose one player to protect tonight."
                        : current.key === "witch"
                          ? "Witch, awaken. The moderator will now reveal whether someone was attacked."
                          : current.key === "cupid"
                            ? "Cupid, open your eyes. Choose two players who shall be bound together by love."
                            : current.key === "lovers"
                              ? "Lovers, open your eyes and recognise one another."
                              : current.key === "detective"
                                ? "Detective, open your eyes. Point to one player whose identity you wish to investigate."
                                : current.key === "bodyguard"
                                  ? "Bodyguard, open your eyes and choose one player to protect."
                                  : current.key === "silencer"
                                    ? "Silencer, open your eyes and choose one player who must remain silent during the coming day."
                                    : current.key === "serial"
                                      ? "Serial Killer, open your eyes and choose your victim."
                          : current.prompt
            }`
          : "The night is over. Keep your eyes closed. The first light of dawn breaks over the village. Everyone, open your eyes.")
      : g.phase === "day"
        ? g.round === 1
          ? "The village awakens peacefully, unaware of the danger lurking among its people. Open your eyes. Introduce yourselves, and decide who can be trusted."
          : g.nightResult.length
          ? "Morning has come, and a murder has taken place. Moderator, please reveal who was murdered. Those who have fallen must remain silent for the rest of the game."
          : "The sun rises. Against all odds, everyone has survived the night. Open your eyes and begin your discussion."
        : g.phase === "vote"
          ? "The discussion is over. The village must now choose whether someone will be eliminated."
          : g.phase === "ended"
            ? `The final bell tolls. ${g.winner} have won the game.`
            : "A darkness gathers over the village.";
  const narrationCanPlay = true;
  const dawnInstruction =
    "Everyone, keep your eyes closed. The night is ending. Wait for the morning call before opening your eyes.";
  const narrationClips: NarrationClip[] = (() => {
    if (g.phase === "night" && current) {
      const clips: NarrationClip[] = [];
      if (g.step === 0) {
        clips.push({
          src: `/audio/narration/${g.round === 1 ? "10-night-one-begins" : "11-night-begins"}.mp3`,
          text:
            g.round === 1
              ? "Night one begins. Everyone, close your eyes. Keep your head lowered and remain silent."
              : "Night has fallen once again. Everyone, close your eyes. Keep your head lowered and remain silent.",
        });
      }
      if (current.key === "wolves") {
        clips.push({
          src: `/audio/narration/${g.round === 1 ? "20-wolves-recognise" : "40-wolves-hunt"}.mp3`,
          text:
            g.round === 1
              ? "Werewolves, open your eyes. Look around and recognise your fellow Werewolves."
              : "Werewolves, awaken. Silently choose one player to eliminate.",
        });
      } else if (current.key === "seer") {
        clips.push({
          src: `/audio/narration/${g.round === 1 ? "22-seer-first-choice" : "42-seer-investigate"}.mp3`,
          text:
            g.round === 1
              ? "Seer, open your eyes. Point to one player whose allegiance you wish to discover."
              : "Seer, awaken. Point to one player whose allegiance you wish to discover.",
        });
      } else if (current.key === "doctor-intro") {
        clips.push({
          src: "/audio/narration/30-doctor-recognition.mp3",
          text: "Doctor, open your eyes so the moderator may identify you.",
        });
      } else if (current.key === "witch-intro") {
        clips.push({
          src: "/audio/narration/32-witch-recognition.mp3",
          text: "Witch, open your eyes so the moderator may identify you.",
        });
      } else if (current.key === "doctor") {
        clips.push({
          src: "/audio/narration/43-doctor-protect.mp3",
          text: "Doctor, awaken. Choose one player to protect tonight.",
        });
      } else if (current.key === "witch") {
        clips.push({
          src: "/audio/narration/45-witch-awaken.mp3",
          text: "Witch, awaken. The moderator will now reveal whether someone was attacked.",
        });
      } else if (current.key === "cupid") {
        clips.push({
          src: "/audio/narration/24-cupid-choice.mp3",
          text: "Cupid, open your eyes. Choose two players who shall be bound together by love.",
        });
      } else if (current.key === "lovers") {
        clips.push({
          src: "/audio/narration/26-lovers-recognise.mp3",
          text: "Lovers, open your eyes and recognise one another.",
        });
      } else if (current.key === "detective") {
        clips.push({
          src: "/audio/narration/50-detective-investigate.mp3",
          text: "Detective, open your eyes. Point to one player whose identity you wish to investigate.",
        });
      } else if (current.key === "bodyguard") {
        clips.push({
          src: "/audio/narration/51-bodyguard-protect.mp3",
          text: "Bodyguard, open your eyes and choose one player to protect.",
        });
      } else if (current.key === "silencer") {
        clips.push({
          src: "/audio/narration/53-silencer-action.mp3",
          text: "Silencer, open your eyes and choose one player who must remain silent during the coming day.",
        });
      } else if (current.key === "serial") {
        clips.push({
          src: "/audio/narration/48-serial-killer-action.mp3",
          text: "Serial Killer, open your eyes and choose your victim.",
        });
      }
      return clips;
    }
    if (g.phase === "day" && g.round === 1) {
      return [{ src: "/audio/narration/61-first-morning.mp3", text: narration }];
    }
    if (g.phase === "day" && g.nightResult.length === 0) {
      return [{ src: "/audio/narration/62-morning-no-deaths.mp3", text: narration }];
    }
    if (g.phase === "day" && g.nightResult.length > 0) {
      return [{ src: "/audio/narration/65-murder-reveal.mp3", text: narration }];
    }
    if (g.phase === "vote") {
      return [{ src: "/audio/narration/64-voting-begins.mp3", text: narration }];
    }
    return [];
  })();
  const closingNarration: NarrationClip | null =
    g.phase === "night" && current?.key === "wolves"
      ? {
          src: `/audio/narration/${g.round === 1 ? "21-wolves-close-first-night" : "41-wolves-close"}.mp3`,
          text:
            g.round === 1
              ? "Werewolves, close your eyes. No one is eliminated on the first night."
              : "Werewolves, close your eyes.",
        }
      : g.phase === "night" && current?.key === "seer"
        ? {
            src: "/audio/narration/23-seer-close.mp3",
            text: "Seer, close your eyes.",
          }
        : g.phase === "night" && current?.key === "doctor-intro"
          ? {
              src: "/audio/narration/31-doctor-close-first-night.mp3",
              text: "Doctor, close your eyes. You do not protect anyone on the first night.",
            }
          : g.phase === "night" && current?.key === "witch-intro"
            ? {
                src: "/audio/narration/33-witch-close-first-night.mp3",
                text: "Witch, close your eyes. Your potions are not used on the first night.",
              }
            : g.phase === "night" && current?.key === "doctor"
              ? {
                  src: "/audio/narration/44-doctor-close.mp3",
                  text: "Doctor, close your eyes.",
                }
              : g.phase === "night" && current?.key === "witch"
                ? {
                    src: "/audio/narration/47-witch-close.mp3",
                    text: "Witch, close your eyes.",
                  }
                : g.phase === "night" && current?.key === "cupid"
                  ? {
                      src: "/audio/narration/25-cupid-close.mp3",
                      text: "Cupid, close your eyes.",
                    }
                  : g.phase === "night" && current?.key === "lovers"
                    ? {
                        src: "/audio/narration/27-lovers-close.mp3",
                        text: "Lovers, close your eyes.",
                      }
                    : g.phase === "night" && current?.key === "detective"
                      ? {
                          src: "/audio/narration/29-detective-close.mp3",
                          text: "Detective, close your eyes.",
                        }
                      : g.phase === "night" && current?.key === "bodyguard"
                        ? {
                            src: "/audio/narration/52-bodyguard-close.mp3",
                            text: "Bodyguard, close your eyes.",
                          }
                        : g.phase === "night" && current?.key === "silencer"
                          ? {
                              src: "/audio/narration/54-silencer-close.mp3",
                              text: "Silencer, close your eyes.",
                            }
                          : g.phase === "night" && current?.key === "serial"
                            ? {
                                src: "/audio/narration/49-serial-killer-close.mp3",
                                text: "Serial Killer, close your eyes.",
                              }
                : null;
  useEffect(() => {
    const prior = previousPhase.current;
    previousPhase.current = g.phase;
    if (prior !== "night" || g.phase !== "day") return;
    const rooster = document.querySelector<HTMLAudioElement>("#morning-rooster");
    const ambience = document.querySelector<HTMLAudioElement>("#ambience-audio");
    if (!rooster) return;
    const restoreBackground = Boolean(ambience && !ambience.paused);
    if (restoreBackground) fadeAmbience(0.035);
    rooster.currentTime = 0;
    rooster.volume = 0.82;
    let morningStarted = false;
    const beginMorning = () => {
      if (morningStarted) return;
      morningStarted = true;
      if (restoreBackground) fadeAmbience(AMBIENCE_VOLUME);
      if (narrationCanPlay) {
        playNarrationClips(narrationClips, narration);
        setVoices(true);
      }
    };
    rooster.onended = beginMorning;
    rooster.onerror = beginMorning;
    void rooster.play().catch(beginMorning);
  }, [g.phase]);
  useEffect(() => {
    if (g.phase !== "night" && g.phase !== "vote") return;
    if (skipNextAutomaticNarration.current) {
      skipNextAutomaticNarration.current = false;
      return;
    }
    if (!narrationCanPlay) return;
    playNarrationClips(narrationClips, narration);
    setVoices(true);
  }, [g.phase, g.round, g.step]);
  function update(patch: Partial<Game>) {
    set({ ...g, ...patch });
  }
  function changePlayerCount(count: number) {
    const currentNames = names
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);
    setNames(currentNames.slice(0, count).join("\n"));
    setPlayerCount(count);
    setCounts((current) => {
      const nextCounts = { ...current };
      let total = Object.values(nextCounts).reduce((sum, value) => sum + (value || 0), 0);
      while (total > count && (nextCounts.villager || 0) > 0) {
        nextCounts.villager = (nextCounts.villager || 0) - 1;
        total -= 1;
      }
      const removable: RoleId[] = ["hunter", "priest", "tough", "bodyguard", "detective", "apprentice", "cupid", "witch", "doctor", "seer", "serial", "jester", "silencer", "alpha"];
      for (const role of removable) {
        while (total > count && (nextCounts[role] || 0) > 0) {
          nextCounts[role] = (nextCounts[role] || 0) - 1;
          total -= 1;
        }
      }
      while (total > count && (nextCounts.werewolf || 0) > 1) {
        nextCounts.werewolf = (nextCounts.werewolf || 0) - 1;
        total -= 1;
      }
      if (total < count) nextCounts.villager = (nextCounts.villager || 0) + (count - total);
      return nextCounts;
    });
  }
  function changeRoleCount(role: RoleId, delta: 1 | -1) {
    setCounts((current) => {
      const next = { ...current };
      const currentValue = next[role] || 0;
      if (delta === -1) {
        if (currentValue === 0 || role === "villager") return current;
        next[role] = currentValue - 1;
        next.villager = (next.villager || 0) + 1;
        return next;
      }
      if (roleOf(role).unique && currentValue > 0) return current;
      if ((next.villager || 0) > 0 && role !== "villager") {
        next.villager = (next.villager || 0) - 1;
        next[role] = currentValue + 1;
        return next;
      }
      const total = Object.values(next).reduce((sum, value) => sum + (value || 0), 0);
      if (total >= playerCount) return current;
      next[role] = currentValue + 1;
      return next;
    });
  }
  function continueSetup() {
    if (people.length < 5) {
      setSetupError("Add at least five players.");
      return;
    }
    if (people.length !== playerCount) {
      setSetupError(`Enter a name for all ${playerCount} players. The moderator is not included.`);
      return;
    }
    if (new Set(people.map((p) => p.toLowerCase())).size !== people.length) {
      setSetupError("Player names must be unique.");
      return;
    }
    if (cardTotal !== playerCount) {
      setSetupError(`Choose exactly ${playerCount} physical cards (currently ${cardTotal}).`);
      return;
    }
    if (!Object.entries(counts).some(([role, count]) => count && roleOf(role as RoleId).team === "wolf")) {
      setSetupError("Include at least one Werewolf card.");
      return;
    }
    const game: Game = {
      ...initialGame(),
      players: people.map((name) => ({
        id: crypto.randomUUID(),
        name,
        alive: true,
      })),
      phase: "setup",
      cardsOnly: true,
      deckRoles: counts,
      settings: g.settings,
    };
    createGame(game, `Village of ${people[0]}${people.length > 1 ? ` + ${people.length - 1}` : ""}`);
    setSetupError("");
    setSetupView("intro");
    setScreen("intro");
  }
  function startGame() {
    skipNextAutomaticNarration.current = true;
    set({ ...g, phase: "night", round: 1, step: 0, actions: [], votes: {}, history: [] });
    setTab("game");
    setScreen("game");
    const ambience = document.querySelector<HTMLAudioElement>("#ambience-audio");
    if (ambience?.paused) void ambience.play().catch(() => undefined);
    const opening =
      "The village is seated. The cards have been dealt. Your role must remain secret. The game now begins.";
    playNarrationClips(
      [{ src: "/audio/narration/03-game-begins.mp3", text: opening }],
      opening,
      () => {
        const firstNight =
          "Night one begins. Everyone, close your eyes. Keep your head lowered and remain silent. Werewolves, open your eyes. Look around and recognise your fellow Werewolves.";
        playNarrationClips(
          [
            {
              src: "/audio/narration/10-night-one-begins.mp3",
              text: "Night one begins. Everyone, close your eyes. Keep your head lowered and remain silent.",
            },
            {
              src: "/audio/narration/20-wolves-recognise.mp3",
              text: "Werewolves, open your eyes. Look around and recognise your fellow Werewolves.",
            },
          ],
          firstNight,
        );
        setVoices(true);
      },
    );
  }
  function record() {
    if (!current || !actor) return;
    const type = current.key === "witch" ? witchMode : current.ability;
    if (
      (type === "heal" && !g.potions.heal) ||
      (type === "poison" && !g.potions.poison)
    )
      return;
    if (!selection) return;
    if (type === "link" && (!secondary || selection === secondary)) return;
    const action: Action = {
      actor: actor.id,
      type,
      target: selection,
      secondary: type === "link" ? secondary : undefined,
    };
    const actions = g.actions.filter(
      (a) => !(a.actor === actor.id && a.type === type),
    );
    update({ actions: [...actions, action] });
    setSelection("");
    setSecondary("");
  }
  function advance() {
    const continueAfterClosing = () => {
      if (g.step < steps.length - 1) {
        update({ step: g.step + 1 });
        setSelection("");
        setSecondary("");
        setWitchMode("heal");
        setWitchInstructionReady(false);
      } else {
        beginDawnTransition();
      }
    };
    if (closingNarration) {
      playNarrationClips(
        [closingNarration],
        closingNarration.text,
        continueAfterClosing,
      );
      return;
    }
    continueAfterClosing();
  }
  function beginDawnTransition() {
    setDawnTransition(true);
    playNarrationClips(
      [{ src: "/audio/narration/60-night-ending.mp3", text: dawnInstruction }],
      dawnInstruction,
      finishDawnTransition,
    );
    setVoices(true);
  }
  function finishDawnTransition() {
    set(resolveNight(g));
    setDawnTransition(false);
    setSelection("");
    setSecondary("");
  }
  function resolveHunter() {
    if (!g.pendingHunter || !manualTarget) return;
    const next = eliminate(
      { ...g, pendingHunter: null },
      [manualTarget],
      "Hunter retaliation",
    );
    const winner = checkWinner(next);
    set({
      ...next,
      pendingHunter: null,
      winner,
      phase: winner ? "ended" : g.phase === "day" ? "day" : "night",
      round: g.phase === "vote" ? g.round + 1 : g.round,
      step: 0,
    });
    setManualTarget("");
  }
  function revealElimination() {
    if (!awaitingReveal || !eliminatedRole) return;
    const revealed = roleOf(eliminatedRole);
    const remainingRoleCount = Math.max(0, (g.deckRoles[eliminatedRole] || 0) - 1);
    const wasDayVote = g.history.at(-1)?.includes(" vote") ?? false;
    const jesterWon = eliminatedRole === "jester" && wasDayVote;
    const players = g.players.map((player) =>
      player.id === awaitingReveal.id
        ? { ...player, revealedRole: eliminatedRole }
        : player,
    );
    const publicAnnouncement = g.settings.revealRoles
      ? `${awaitingReveal.name}, the ${revealed.name}, has been eliminated.`
      : `${awaitingReveal.name} has been eliminated.`;
    const privateRecord = `${awaitingReveal.name} was the ${revealed.name}.`;
    const nextGame: Game = {
      ...g,
      players,
      deckRoles: { ...g.deckRoles, [eliminatedRole]: remainingRoleCount },
      history: [...g.history, g.settings.revealRoles ? publicAnnouncement : privateRecord],
      pendingHunter: eliminatedRole === "hunter" ? awaitingReveal.id : g.pendingHunter,
      winner: jesterWon ? "Jester" : g.winner,
      phase: jesterWon ? "ended" : g.phase,
    };
    set(nextGame);
    if (!jesterWon && !nextGame.pendingHunter) {
      setSuggestedWinner(inferCardsOnlyWinner(nextGame));
    }
    if (eliminatedRole === "hunter") {
      const hunterNarration =
        "Hunter, before you fall, choose one living player to take with you.";
      playNarrationClips(
        [{ src: "/audio/narration/55-hunter-final-shot.mp3", text: hunterNarration }],
        hunterNarration,
      );
    }
    if (jesterWon) {
      const jesterNarration =
        "The village has been deceived. By condemning the Jester, you have fulfilled the Jester’s design. The Jester has won.";
      playNarrationClips(
        [{ src: "/audio/narration/75-jester-victory.mp3?v=corrected-20261105", text: jesterNarration }],
        jesterNarration,
      );
    }
    setEliminatedRole("");
  }
  function declareWinner(winner: "Village" | "Werewolves" | "Serial Killer") {
    setGamePaused(false);
    const narration = winner === "Village"
      ? "The final shadow has fallen. The Werewolves have been destroyed. The Village has won."
      : winner === "Werewolves"
        ? "The village has fallen. The monsters have won. The Werewolves have claimed the village."
        : "Silence falls over the village. One figure remains among the dead. The Serial Killer has claimed the final victory.";
    const narrationFile = winner === "Village"
      ? "70-village-victory"
      : winner === "Werewolves"
        ? "71-werewolf-victory"
        : "76-serial-killer-victory";
    set({ ...g, winner, phase: "ended", history: [...g.history, `${winner} victory declared by the moderator`] });
    playNarrationClips(
      [
        {
          src: `/audio/narration/${narrationFile}.mp3`,
          text: narration,
        },
      ],
      narration,
    );
    setShowEndGame(false);
    setSuggestedWinner(null);
  }
  function endWithoutWinner() {
    setGamePaused(false);
    set({ ...g, winner: "No winner", phase: "ended", history: [...g.history, "The moderator ended the game"] });
    const ending =
      "The tale ends here, though no victor has been declared. The village’s fate shall remain unknown.";
    playNarrationClips(
      [{ src: "/audio/narration/74-game-ended.mp3", text: ending }],
      ending,
    );
    setShowEndGame(false);
    setSuggestedWinner(null);
  }
  function finishDayElimination(target: string | null) {
    if (!target) {
      const noElimination =
        "The village has failed to reach a decision. No one will be eliminated today. Night will soon fall once again.";
      skipNextAutomaticNarration.current = true;
      playNarrationClips(
        [{ src: "/audio/narration/73-no-elimination.mp3?v=corrected-20261105", text: noElimination }],
        noElimination,
        () => {
          set({ ...g, phase: "night", round: g.round + 1, step: 0, actions: [], votes: {}, silenced: [], tieCandidates: [], isRevote: false, history: [...g.history, `Day ${g.round}: no elimination`] });
          const nightOpening =
            "Night has fallen once again. Everyone, close your eyes. Keep your head lowered and remain silent. Werewolves, awaken. Silently choose one player to eliminate.";
          playNarrationClips(
            [
              { src: "/audio/narration/11-night-begins.mp3", text: "Night has fallen once again. Everyone, close your eyes. Keep your head lowered and remain silent." },
              { src: "/audio/narration/40-wolves-hunt.mp3", text: "Werewolves, awaken. Silently choose one player to eliminate." },
            ],
            nightOpening,
          );
        },
      );
    } else {
      const next = eliminate(g, [target], `Day ${g.round} vote`);
      set({ ...next, phase: "night", round: g.round + 1, step: 0, actions: [], votes: {}, silenced: [], tieCandidates: [], isRevote: false });
    }
    setVoteTarget("");
  }
  const currentActions = current
    ? g.actions.filter((a) => current.actors.some((p) => p.id === a.actor))
    : [];
  const hasAction = currentActions.length > 0;
  if (screen === "home") {
    return (
      <HomeScreen
        saves={saves || []}
        onNew={() => {
          setGamePaused(false);
          reset();
          setSuggestedWinner(null);
          setNames("");
          setPlayerCount(12);
          setCounts({ werewolf: 2, seer: 1, doctor: 1, witch: 1, hunter: 1, villager: 6 });
          setSetupView("setup");
          setScreen("create");
        }}
        onContinue={(save) => {
          setGamePaused(false);
          loadGame(save.id);
          setSetupView(save.game.phase === "setup" ? "intro" : "setup");
          setScreen(save.game.phase === "setup" ? "intro" : "game");
        }}
        onDelete={(id) => {
          if (window.confirm("Remove this saved game?")) deleteGame(id);
        }}
      />
    );
  }
  return (
    <div className={`app ${g.phase === "day" || g.phase === "vote" ? "day-theme" : "dark-theme"}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brandmark">
            <Moon size={21} />
          </div>
          <div>
            WEREWOLF <span>ULTIMATE</span>
            <small>THE MODERATOR'S DESK</small>
          </div>
        </div>
        <div className="sidebottom">
          <div className="online">
            <span /> Local game · Autosaved
          </div>
          <button className="ghost" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={15} /> New game
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div className="headerleft">
            <span className="eyebrow">THE MODERATOR'S DESK</span>
            <h1>
              {g.phase === "setup"
                ? "Prepare the village"
                : g.phase === "ended"
                  ? "The final chapter"
                  : g.phase === "night"
                    ? "The village sleeps"
                    : g.phase === "day"
                      ? "The village awakens"
                      : "The village decides"}
            </h1>
            <p>
              {g.phase === "setup"
                ? "Gather your players and cast the roles."
                : g.phase === "ended"
                  ? "The story has reached its end."
                  : `Round ${g.round} · ${players.length} souls remain`}
            </p>
          </div>
          <div className="header-actions">
            <AmbienceControl phase={g.phase} paused={gamePaused} />
            <div className="phasebadge">
              {g.phase === "night" ? (
                <Moon size={16} />
              ) : g.phase === "day" ? (
                <Sun size={16} />
              ) : g.phase === "ended" ? (
                <Trophy size={16} />
              ) : (
                <Users size={16} />
              )}{" "}
              {g.phase.toUpperCase()}
            </div>
            <div className="game-menu">
              <button
                className="game-menu-trigger"
                aria-label="Open game menu"
                aria-expanded={gameMenuOpen}
                onClick={() => setGameMenuOpen((open) => !open)}
              >
                <Menu size={19} />
              </button>
              {gameMenuOpen && (
                <div className="game-menu-popover">
                  <strong>Game menu</strong>
                  <button onClick={() => { setGameMenuOpen(false); setScreen("home"); }}>
                    <Home size={15} /> Home and saved games
                  </button>
                  {g.phase !== "setup" && (
                    <>
                      {tab !== "game" && (
                        <button onClick={() => { setGameMenuOpen(false); setTab("game"); }}>
                          <Moon size={15} /> Game director
                        </button>
                      )}
                      <button onClick={() => { setGameMenuOpen(false); setTab("players"); }}>
                        <Users size={15} /> Player roster
                      </button>
                      <button onClick={() => { setGameMenuOpen(false); setTab("log"); }}>
                        <BookOpen size={15} /> Game chronicle
                      </button>
                    </>
                  )}
                  {g.phase !== "setup" && g.phase !== "ended" && (
                    <>
                      <button onClick={() => {
                        setGameMenuOpen(false);
                        stopNarration();
                        setGamePaused(true);
                      }}>
                        <Pause size={15} /> Pause game
                      </button>
                      <button onClick={() => { setGameMenuOpen(false); setShowEndGame(true); }}>
                        <Skull size={15} /> End current game
                      </button>
                    </>
                  )}
                  <button onClick={() => { setGameMenuOpen(false); setConfirmReset(true); }}>
                    <RotateCcw size={15} /> Restart game
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {g.phase === "setup" ? setupView !== "setup" ? (
          <WelcomeScreen
            showGuide={setupView === "guide"}
            onShowGuide={() => setSetupView(setupView === "guide" ? "intro" : "guide")}
            onStartGame={startGame}
            onBack={() => setSetupView("setup")}
          />
        ) : (
          <div className="setupgrid no-role-setup">
            <section className="panel">
              <div className="panelhead">
                <Users size={18} />
                <h2>Players</h2>
                <span className="pill">{playerCount}</span>
              </div>
              <p className="muted">
                Enter one player name per line. Player names are never filled
                in or assigned automatically.
              </p>
              <label className="player-count-label">
                Number of players <small>(not including the moderator)</small>
                <select value={playerCount} onChange={(event) => changePlayerCount(Number(event.target.value))}>
                  {Array.from({ length: 16 }, (_, index) => index + 5).map((count) => <option key={count} value={count}>{count} players</option>)}
                </select>
              </label>
              <textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                rows={14}
                spellCheck={false}
                placeholder={Array.from({ length: Math.min(playerCount, 5) }, (_, index) => `Player ${index + 1} name`).join("\n")}
              />
            </section>
            <section className="panel">
              <div className="panelhead">
                <Shield size={18} />
                <h2>Physical cards used</h2>
                <span className="pill">{cardTotal} / {playerCount}</span>
              </div>
              <p className="muted">Choose the cards being dealt. The app uses this only to build the correct narration order—it never assigns a card to a player.</p>
              <div className="rolelist">
                {ROLES.map((role) => (
                  <div className="roleline" key={role.id}>
                    <div>
                      <strong>{role.name}</strong>
                      <small>{role.description}</small>
                    </div>
                    <div className="counter">
                      <button aria-label={`Remove ${role.name}`} disabled={role.id === "villager" || !(counts[role.id] || 0)} onClick={() => changeRoleCount(role.id, -1)}><Minus size={13} /></button>
                      <span>{counts[role.id] || 0}</span>
                      <button aria-label={`Add ${role.name}`} disabled={(!!role.unique && !!counts[role.id]) || (role.id === "villager" && cardTotal >= playerCount) || (role.id !== "villager" && cardTotal >= playerCount && !(counts.villager || 0))} onClick={() => changeRoleCount(role.id, 1)}><Plus size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel settings">
              <div className="panelhead">
                <Settings size={18} />
                <h2>Game settings</h2>
              </div>
              <div className="settingsgrid">
                {(
                  [
                    ["discussion", "Discussion timer"],
                    ["vote", "Voting timer"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <div className="inputrow">
                      <input
                        type="number"
                        min="10"
                        value={g.settings[key]}
                        onChange={(e) =>
                          update({
                            settings: {
                              ...g.settings,
                              [key]: Math.max(10, Number(e.target.value) || 10),
                            },
                          })
                        }
                      />
                      <span>sec</span>
                    </div>
                  </label>
                ))}
              </div>
              <label className="checkline">
                <input
                  type="checkbox"
                  checked={g.settings.revealRoles}
                  onChange={(e) =>
                    update({
                      settings: {
                        ...g.settings,
                        revealRoles: e.target.checked,
                      },
                    })
                  }
                />{" "}
                Announce eliminated players' roles
              </label>
              {setupError && <p className="error">{setupError}</p>}
              <button className="primary big" onClick={continueSetup}>
                Continue <ChevronRight size={18} />
              </button>
            </section>
          </div>
        ) : (
          <div className="dashboard">
            <div className="primarycolumn">
              {g.phase === "ended" ? (
                <section className="panel hero">
                  <Trophy className="gold" size={36} />
                  <div className="eyebrow">THE FINAL CHAPTER</div>
                  <h2>{g.winner === "No winner" ? "Game ended" : `${g.winner} win!`}</h2>
                  <p>
                    The village's fate has been sealed. Reveal the roles below,
                    or begin a new story.
                  </p>
                  <button
                    className="primary"
                    onClick={() => setConfirmReset(true)}
                  >
                    Play again <ChevronRight size={17} />
                  </button>
                </section>
              ) : (
                <>
                  <section className="panel hero">
                    <div className="sectiontag">
                      {g.phase === "night"
                        ? `NIGHT ${g.round} · ${current?.name.toUpperCase() || "DAWN"}`
                        : g.phase === "day"
                          ? `DAY ${g.round} · DISCUSSION`
                          : `DAY ${g.round} · VOTING`}
                    </div>
                    <div className="moonart">
                      {g.phase === "night" ? (
                        <Moon size={42} />
                      ) : (
                        <Sun size={42} />
                      )}
                    </div>
                    <h2>
                      {g.phase === "night"
                        ? current?.name || "Dawn approaches"
                        : g.phase === "day"
                          ? "Let the accusations begin"
                          : "The village must choose"}
                    </h2>
                    <div className="script-label">
                      <BookOpen size={14} /> Script — read aloud
                    </div>
                    <p className="narration">“{narration}”</p>
                    <div className="speech">
                      {narrationCanPlay ? (
                        <>
                          <button
                            onClick={() => {
                              playNarrationClips(
                                narrationClips,
                                narration,
                              );
                              setVoices(true);
                            }}
                          >
                            <Volume2 size={17} /> Replay narration
                          </button>
                          <button
                            onClick={() => {
                              stopNarration();
                              setVoices(false);
                            }}
                          >
                            <VolumeX size={17} /> Stop
                          </button>
                        </>
                      ) : null}
                      <span>
                        {narrationCanPlay
                          ? voices
                            ? "Narration enabled"
                            : "Optional recorded narration"
                          : "Moderator reads this passage because it contains player names"}
                      </span>
                    </div>
                  </section>
                  {g.phase !== "night" && (
                    <Timer
                      seconds={g.phase === "day" ? g.settings.discussion : g.settings.vote}
                      label={`${g.phase} countdown`}
                      paused={gamePaused}
                    />
                  )}
                </>
              )}
              {g.pendingHunter && !awaitingReveal && (
                <section className="panel danger">
                  <h3>Hunter's final shot</h3>
                  <p>
                    The Hunter was eliminated. Select a living target before
                    continuing.
                  </p>
                  <select
                    value={manualTarget}
                    onChange={(e) => setManualTarget(e.target.value)}
                  >
                    <option value="">Choose target</option>
                    {players.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="primary"
                    disabled={!manualTarget}
                    onClick={resolveHunter}
                  >
                    Resolve shot
                  </button>
                </section>
              )}
              {g.phase === "night" && !g.pendingHunter && !awaitingReveal && (
                <section className="panel">
                  <div className="panelhead">
                    <Eye size={18} />
                    <h2>
                      {current ? "Secret night action" : "Night complete"}
                    </h2>
                    <span className="pill">
                      {Math.min(g.step + 1, steps.length)} / {steps.length}
                    </span>
                  </div>
                  {current ? (
                    <>
                      <p className="muted">
                        {current.actors.map((p) => p.name).join(", ")} ·{" "}
                        {current.name}
                      </p>
                      <p className="muted">
                        {current.ability === "none"
                          ? "No app entry is needed for this step. Follow the narration, handle any private response, then continue."
                          : "Select the player indicated by the active role. The moderator records the action privately."}
                      </p>
                      {current.key === "witch" && !witchInstructionReady && (
                        <div className="role-instruction">
                          <div className="script-label">
                            <BookOpen size={14} /> Next script
                          </div>
                          <p>“You may use one potion, or save your potions for another night. Indicate your choice now.”</p>
                          <button
                            className="primary"
                            onClick={() =>
                              playNarrationClips(
                                [
                                  {
                                    src: "/audio/narration/46-witch-action.mp3",
                                    text: "You may use one potion, or save your potions for another night. Indicate your choice now.",
                                  },
                                ],
                                "You may use one potion, or save your potions for another night. Indicate your choice now.",
                                () => setWitchInstructionReady(true),
                              )
                            }
                          >
                            <Volume2 size={16} /> Continue Witch narration
                          </button>
                        </div>
                      )}
                      {current.key === "witch" && witchInstructionReady && (
                        <div className="switch">
                          <button
                            className={witchMode === "heal" ? "selected" : ""}
                            disabled={!g.potions.heal}
                            onClick={() => {
                              setWitchMode("heal");
                              setSelection("");
                            }}
                          >
                            Heal {g.potions.heal ? "(1 left)" : "(used)"}
                          </button>
                          <button
                            className={witchMode === "poison" ? "selected" : ""}
                            disabled={!g.potions.poison}
                            onClick={() => {
                              setWitchMode("poison");
                              setSelection("");
                            }}
                          >
                            Poison {g.potions.poison ? "(1 left)" : "(used)"}
                          </button>
                        </div>
                      )}
                      {current.key === "witch" && witchInstructionReady && (
                        <p className="muted">
                          House rule: the moderator selects the heal target
                          manually; potion use is optional.
                        </p>
                      )}
                      {current.ability !== "none" && (current.key !== "witch" || witchInstructionReady) && <div className="targets">
                        {players
                          .filter(
                            (p) =>
                              current.ability === "link" ||
                              p.id !== actor?.id ||
                              current.key === "wolves",
                          )
                          .map((p) => (
                            <button
                              key={p.id}
                              className={selection === p.id ? "selected" : ""}
                              onClick={() => setSelection(p.id)}
                            >
                              {p.name}
                              {selection === p.id && <Check size={15} />}
                            </button>
                          ))}
                      </div>}
                      {current.ability === "link" && (
                        <>
                          <p className="muted">Choose the second lover</p>
                          <div className="targets">
                            {players
                              .filter((p) => p.id !== selection)
                              .map((p) => (
                                <button
                                  key={p.id}
                                  className={
                                    secondary === p.id ? "selected" : ""
                                  }
                                  onClick={() => setSecondary(p.id)}
                                >
                                  {p.name}
                                </button>
                              ))}
                          </div>
                        </>
                      )}
                      {!g.cardsOnly && current.ability === "inspect" && hasAction && (
                        <div className="result">
                          Investigation:{" "}
                          {(() => {
                            const target = g.players.find(
                              (p) => p.id === currentActions[0].target,
                            );
                            return target
                              ? `${target.name} — ${current.key === "seer" ? (roleOf(target.role!).team === "wolf" ? "Wolf-aligned" : "Not wolf-aligned") : roleOf(target.role!).name}`
                              : "Unknown";
                          })()}
                        </div>
                      )}
                      <div className="actionrow">
                        {current.ability !== "none" && (current.key !== "witch" || witchInstructionReady) && <button
                          className="secondary"
                          onClick={record}
                          disabled={
                            !selection ||
                            (current.ability === "link" && !secondary) ||
                            (current.key === "witch" &&
                              !(witchMode === "heal"
                                ? g.potions.heal
                                : g.potions.poison))
                          }
                        >
                          <Check size={16} /> {current.ability === "kill" ? "Record elimination target" : current.ability === "inspect" ? "Record pointed player" : "Record action"}
                        </button>}
                        <button className="primary" onClick={advance} disabled={current.key === "witch" && !witchInstructionReady}>
                          {g.step === steps.length - 1
                            ? "Resolve night"
                            : "Next role"}{" "}
                          <ChevronRight size={17} />
                        </button>
                      </div>
                      <small className="muted">
                        {current.ability === "none"
                          ? "Night One is recognition only. No wolf target is selected."
                          : hasAction
                          ? "✓ Action recorded. You can change it before advancing."
                          : "Skipping a role records no action."}
                      </small>
                    </>
                  ) : (
                    <button
                      className="primary"
                      onClick={beginDawnTransition}
                    >
                      Bring on the dawn <Sun size={17} />
                    </button>
                  )}
                </section>
              )}
              {g.phase === "day" && !g.pendingHunter && !awaitingReveal && (
                <section className="panel">
                  <div className="panelhead">
                    <Sun size={18} />
                    <h2>{g.round === 1 ? "First day introductions" : `Day ${g.round} discussion`}</h2>
                  </div>
                  <p className="muted">{g.round === 1 ? "Invite each player to introduce themselves. When everyone is ready, begin the timed discussion." : g.nightResult.length ? `Lost last night: ${g.nightResult.join(", ")}` : "No one died last night."}</p>
                  {g.round > 1 && g.nightResult.length > 0 && (
                    <div className="moderator-reveal">
                      <strong>Moderator reveal</strong>
                      <p>{g.nightResult.join(" and ")} {g.nightResult.length === 1 ? "was" : "were"} murdered. Ask {g.nightResult.length === 1 ? "this player" : "these players"} to remain silent.</p>
                    </div>
                  )}
                  {g.silenced.length > 0 && (
                    <p className="muted">
                      Silenced:{" "}
                      {g.silenced
                        .map((id) => g.players.find((p) => p.id === id)?.name)
                        .join(", ")}
                    </p>
                  )}
                  <button className="primary big" onClick={() => update({ phase: "vote", votes: {} })}>Record round elimination <Vote size={18} /></button>
                </section>
              )}
              {g.phase === "vote" && !g.pendingHunter && !awaitingReveal && (
                <section className="panel">
                  <div className="panelhead">
                    <Vote size={18} />
                    <h2>Record the elimination</h2>
                  </div>
                  <p className="muted">
                    Run the vote with the group, then record only the final player removed from the round.
                  </p>
                  <select className="elimination-select" value={voteTarget} onChange={(event) => setVoteTarget(event.target.value)}>
                    <option value="">Choose the eliminated player…</option>
                    {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
                  </select>
                  <button
                    className="primary big"
                    disabled={!voteTarget}
                    onClick={() => finishDayElimination(voteTarget)}
                  >
                    Confirm elimination <ChevronRight size={18} />
                  </button>
                  <button
                    className="secondary big"
                    onClick={() => {
                      const tiedVote =
                        "The vote is tied. The village has failed to reach a decision. The tied players will now face a final vote.";
                      playNarrationClips(
                        [{ src: "/audio/narration/72-tied-vote.mp3", text: tiedVote }],
                        tiedVote,
                      );
                    }}
                  >
                    Announce tie and revote
                  </button>
                  <button className="secondary big" onClick={() => finishDayElimination(null)}>No elimination this round</button>
                </section>
              )}
            </div>
            <div className="sidecolumn">
              <section className="panel">
                <div className="panelhead">
                  <Users size={18} />
                  <h2>Village roster</h2>
                  <span className="pill">{players.length} alive</span>
                </div>
                <div className="roster">
                  {g.players.map((p) => (
                    <div
                      className={"person " + (!p.alive ? "dead" : "")}
                      key={p.id}
                    >
                      <div className="avatar">
                        {p.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="personinfo">
                        <strong>{p.name}</strong>
                      </div>
                      <span
                        className={"status " + (p.alive ? "living" : "fallen")}
                      >
                        {p.alive ? "Alive" : "Dead"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel victory-control">
                <div className="panelhead">
                  <Trophy size={18} />
                  <h2>Victory check</h2>
                </div>
                <p className="muted">
                  Because physical cards remain secret, the moderator confirms when all Werewolves are gone or when they equal the remaining non-Werewolves.
                </p>
                <div className="victory-buttons">
                  <button onClick={() => declareWinner("Village")}>Village wins</button>
                  <button onClick={() => declareWinner("Werewolves")}>Werewolves win</button>
                </div>
              </section>
              <section className="panel">
                <div className="panelhead">
                  <BookOpen size={18} />
                  <h2>Chronicle</h2>
                </div>
                {g.history.length === 0 ? (
                  <p className="muted">
                    The story has yet to claim its first victim.
                  </p>
                ) : (
                  g.history
                    .slice(-5)
                    .reverse()
                    .map((h, i) => (
                      <div className="logline" key={i}>
                        {h}
                      </div>
                    ))
                )}
              </section>
            </div>
          </div>
        )}
        {tab === "players" && g.phase !== "setup" && (
          <div className="overlaypanel">
            <button className="back" onClick={() => setTab("game")}>
              <ArrowLeft size={16} /> Back to game
            </button>
            <h2>Full player roster</h2>
            <div className="roster full">
              {g.players.map((p) => (
                <div className="person" key={p.id}>
                  <div className="avatar">{p.name[0]}</div>
                  <div className="personinfo">
                    <strong>{p.name}</strong>
                  </div>
                  <span className={"status " + (p.alive ? "living" : "fallen")}>
                    {p.alive ? "Alive" : "Dead"}
                  </span>
                </div>
              ))}
            </div>
            <p className="muted">
              Moderator-only screen. Keep it hidden from players.
            </p>
          </div>
        )}
        {tab === "log" && g.phase !== "setup" && (
          <div className="overlaypanel">
            <button className="back" onClick={() => setTab("game")}>
              <ArrowLeft size={16} /> Back to game
            </button>
            <h2>The chronicle</h2>
            {g.history.length === 0 ? (
              <p>No events recorded yet.</p>
            ) : (
              g.history.map((h, i) => (
                <div className="logline" key={i}>
                  {h}
                </div>
              ))
            )}
          </div>
        )}
      </main>
      {awaitingReveal && (
        <div className="modalback required-role-reveal" role="dialog" aria-modal="true" aria-labelledby="role-reveal-title">
          <div className="modal">
            <Skull size={30} />
            <div className="eyebrow">Required before continuing</div>
            <h2 id="role-reveal-title">Record {awaitingReveal.name}’s role</h2>
            <p>
              Check the fallen player’s physical card and select the matching role. This keeps the remaining deck and victory check accurate.
            </p>
            <label>
              Revealed physical card
              <select
                autoFocus
                value={eliminatedRole}
                onChange={(event) => setEliminatedRole(event.target.value as RoleId | "")}
              >
                <option value="">Choose the revealed role…</option>
                {ROLES.filter((role) => (g.deckRoles[role.id] || 0) > 0).map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </label>
            <small>
              {g.settings.revealRoles
                ? "This role will be announced to the group."
                : "This role is recorded privately for the moderator."}
            </small>
            {g.players.filter((player) => !player.alive && !player.revealedRole).length > 1 && (
              <p className="muted">
                More fallen players remain. Their cards will be recorded next.
              </p>
            )}
            <button className="primary big" disabled={!eliminatedRole} onClick={revealElimination}>
              <Check size={17} /> Record role and continue
            </button>
          </div>
        </div>
      )}
      {dawnTransition && (
        <div className="modalback dawn-transition" role="dialog" aria-modal="true" aria-labelledby="dawn-title">
          <div className="modal">
            <Eye size={30} />
            <div className="script-label">
              <BookOpen size={14} /> Script — read aloud
            </div>
            <h2 id="dawn-title">Keep every player’s eyes closed</h2>
            <p>“{dawnInstruction}”</p>
            <div className="dawn-status" aria-live="polite">
              <Volume2 size={18} /> Narration playing…
            </div>
            <small>Daytime will begin automatically when the narration finishes.</small>
            <button
              className="secondary dawn-fallback"
              onClick={() => {
                stopNarration();
                finishDawnTransition();
              }}
            >
              Narration not playing? Continue to dawn
            </button>
          </div>
        </div>
      )}
      {suggestedWinner && (
        <div className="modalback" role="dialog" aria-modal="true" aria-labelledby="winner-check-title">
          <div className="modal inferred-winner">
            <Trophy size={30} />
            <div className="eyebrow">Victory condition reached</div>
            <h2 id="winner-check-title">
              {suggestedWinner === "Werewolves"
                ? "The Werewolves have reached parity"
                : suggestedWinner === "Serial Killer"
                  ? "The Serial Killer stands alone"
                  : "No Werewolves remain"}
            </h2>
            <p>
              {suggestedWinner === "Werewolves"
                ? `Based on the revealed cards, the remaining wolf-aligned cards now equal or outnumber the other ${players.length === 2 ? "player" : "players"}.`
                : suggestedWinner === "Serial Killer"
                  ? "Based on the revealed cards, the Serial Killer is the final surviving player."
                  : "Based on the revealed cards, every wolf-aligned card has been eliminated."}
            </p>
            <p className="muted">
              Confirm the result to end the game and play the final narration. If a fallen role was entered incorrectly, keep the game open and correct the record manually.
            </p>
            <div className="end-game-options">
              <button className="primary" onClick={() => declareWinner(suggestedWinner)}>
                <Volume2 size={16} /> Confirm and play ending
              </button>
              <button className="secondary" onClick={() => setSuggestedWinner(null)}>
                Keep game open
              </button>
            </div>
          </div>
        </div>
      )}
      {showEndGame && (
        <div className="modalback">
          <div className="modal">
            <Trophy size={28} />
            <h2>End the current game</h2>
            <p>Choose a winner to play the final announcement, or end the session without declaring one.</p>
            <div className="end-game-options">
              <button onClick={() => declareWinner("Village")}>Village wins</button>
              <button onClick={() => declareWinner("Werewolves")}>Werewolves win</button>
              <button className="secondary" onClick={endWithoutWinner}>End without winner</button>
              <button className="ghost" onClick={() => setShowEndGame(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {confirmReset && (
        <div className="modalback">
          <div className="modal">
            <Skull size={28} />
            <h2>Begin a new story?</h2>
            <p>
              This will erase the current game. Your current progress is saved
              only in this browser.
            </p>
            <div className="actionrow">
              <button
                className="secondary"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>
              <button
                className="primary"
                onClick={() => {
                  setGamePaused(false);
                  reset();
                  setSuggestedWinner(null);
                  setTab("game");
                  setSetupView("setup");
                  setConfirmReset(false);
                }}
              >
                Reset game
              </button>
            </div>
          </div>
        </div>
      )}
      {gamePaused && (
        <div className="modalback pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <div className="modal pause-modal">
            <Pause size={32} />
            <div className="eyebrow">Progress autosaved</div>
            <h2 id="pause-title">Game paused</h2>
            <p>Ambience, narration, and the current countdown are paused. The village will wait here until the moderator is ready.</p>
            <button className="primary big" autoFocus onClick={() => setGamePaused(false)}>
              <Play size={17} /> Resume game
            </button>
            <small>If narration was interrupted, use Replay narration after resuming.</small>
          </div>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
