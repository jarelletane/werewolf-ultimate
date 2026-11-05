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
const DUCKED_VOLUME = 0.05;
let ambienceFade: number | undefined;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let narrationRun = 0;
let resumeAmbienceAfterNarration = false;

const fadeAmbience = (target: number) => {
  const audio = document.querySelector<HTMLAudioElement>("#ambience-audio");
  if (!audio) return;
  window.clearInterval(ambienceFade);
  const start = audio.volume;
  const steps = 12;
  let step = 0;
  ambienceFade = window.setInterval(() => {
    step += 1;
    audio.volume = start + (target - start) * (step / steps);
    if (step >= steps) window.clearInterval(ambienceFade);
  }, 30);
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
  window.speechSynthesis?.cancel();
  restoreAmbience(run);
};

const say = (text: string) => {
  if (!("speechSynthesis" in window)) return;
  const audio = document.querySelector<HTMLAudioElement>("#ambience-audio");
  const run = ++narrationRun;
  resumeAmbienceAfterNarration = Boolean(audio && !audio.paused);
  window.speechSynthesis.cancel();
  fadeAmbience(DUCKED_VOLUME);
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
    if (activeUtterance === utter) restoreAmbience(run);
  };
  utter.onerror = () => {
    if (activeUtterance === utter) restoreAmbience(run);
  };
  window.speechSynthesis.speak(utter);
};
const defaultNames = [
  "Alex",
  "Sam",
  "Jordan",
  "Taylor",
  "Morgan",
  "Casey",
  "Riley",
  "Jamie",
  "Charlie",
  "Avery",
  "Drew",
  "Robin",
];
function Timer({ seconds, label }: { seconds: number; label: string }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    setRemaining(seconds);
    setRunning(false);
  }, [seconds, label]);
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const initial = remaining;
    const t = setInterval(() => {
      const n = Math.max(0, initial - Math.floor((Date.now() - start) / 1000));
      setRemaining(n);
      if (n === 0) setRunning(false);
    }, 200);
    return () => clearInterval(t);
  }, [running]);
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
            setRunning(false);
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

function AmbienceControl({ phase }: { phase: Game["phase"] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const source = phase === "night" ? "/audio/night-ambience.mp3" : "/audio/horror-ambience.mp3";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = AMBIENCE_VOLUME;
    return () => audio.pause();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audio.getAttribute("src") === source) return;
    const shouldContinue = !audio.paused || phase === "night";
    audio.src = source;
    audio.load();
    audio.volume = AMBIENCE_VOLUME;
    if (shouldContinue) void audio.play().catch(() => setPlaying(false));
  }, [source, phase]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  return (
    <div className="ambience-control">
      <audio
        id="ambience-audio"
        ref={audioRef}
        src={source}
        preload="none"
        loop
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <audio id="morning-rooster" src="/audio/rooster.mp3" preload="auto" />
      <button
        className={playing ? "ambience-button active" : "ambience-button"}
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? "Pause background ambience" : "Play background ambience"}
        title={playing ? "Pause ambience" : "Play ambience"}
      >
        {playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
        <span>{playing ? "Ambience on" : "Ambience off"}</span>
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
        <button className="narrate-guide" onClick={() => say(introduction)}>
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
            <div className="panelhead"><BookOpen size={18} /><h2>How a game works</h2><button className="smallbtn" onClick={() => say(gameExplanation)}><Volume2 size={14} /> Listen</button></div>
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
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const [names, setNames] = useState(defaultNames.join("\n"));
  const [counts, setCounts] = useState<Partial<Record<RoleId, number>>>({ werewolf: 2, seer: 1, doctor: 1, witch: 1, hunter: 1, villager: 6 });
  const [setupError, setSetupError] = useState("");
  const [selection, setSelection] = useState("");
  const [secondary, setSecondary] = useState("");
  const [witchMode, setWitchMode] = useState<"heal" | "poison">("heal");
  const [manualTarget, setManualTarget] = useState("");
  const [eliminatedRole, setEliminatedRole] = useState<RoleId | "">("");
  const [voteTarget, setVoteTarget] = useState("");
  const [discussionStarted, setDiscussionStarted] = useState(false);
  const previousPhase = useRef(g.phase);
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
          ? `${g.step === 0 ? (g.round === 1 ? "Night one begins. Everyone, close your eyes. " : `Night ${g.round} begins. Everyone, close your eyes. `) : ""}${current.prompt}`
          : "The night is over. Keep your eyes closed. The first light of dawn breaks over the village. Everyone, open your eyes.")
      : g.phase === "day"
        ? g.round === 1
          ? "The village awakens peacefully, unaware of the danger lurking among its people. Introduce yourselves, then decide who can be trusted."
          : g.nightResult.length
          ? `Morning has come. The village awakens to tragedy. ${g.nightResult.join(" and ")} did not survive the night.`
          : "The sun rises. Against all odds, every villager has survived the night."
        : g.phase === "vote"
          ? "The village has spoken. Cast your votes, and decide who will face the judgement of the crowd."
          : g.phase === "ended"
            ? `The final bell tolls. ${g.winner} have won the game.`
            : "A darkness gathers over the village.";
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
    const restore = () => {
      if (restoreBackground) fadeAmbience(AMBIENCE_VOLUME);
    };
    rooster.onended = restore;
    rooster.onerror = restore;
    void rooster.play().catch(restore);
  }, [g.phase]);
  function update(patch: Partial<Game>) {
    set({ ...g, ...patch });
  }
  function changePlayerCount(count: number) {
    const currentNames = names.split("\n").map((name) => name.trim());
    const next = Array.from({ length: count }, (_, index) => currentNames[index] || defaultNames[index] || `Player ${index + 1}`);
    setNames(next.join("\n"));
  }
  function continueSetup() {
    if (people.length < 5) {
      setSetupError("Add at least five players.");
      return;
    }
    if (new Set(people.map((p) => p.toLowerCase())).size !== people.length) {
      setSetupError("Player names must be unique.");
      return;
    }
    if (cardTotal !== people.length) {
      setSetupError(`Choose exactly ${people.length} physical cards (currently ${cardTotal}).`);
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
    set({ ...g, phase: "night", round: 1, step: 0, actions: [], votes: {}, history: [] });
    setTab("game");
    setScreen("game");
    const ambience = document.querySelector<HTMLAudioElement>("#ambience-audio");
    if (ambience?.paused) void ambience.play().catch(() => undefined);
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
    if (g.step < steps.length - 1) {
      update({ step: g.step + 1 });
      setSelection("");
      setSecondary("");
      setWitchMode("heal");
    } else {
      set(resolveNight(g));
      setSelection("");
      setSecondary("");
    }
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
    set({
      ...g,
      players,
      deckRoles: { ...g.deckRoles, [eliminatedRole]: remainingRoleCount },
      history: [...g.history, g.settings.revealRoles ? publicAnnouncement : privateRecord],
      pendingHunter: eliminatedRole === "hunter" ? awaitingReveal.id : g.pendingHunter,
      winner: jesterWon ? "Jester" : g.winner,
      phase: jesterWon ? "ended" : g.phase,
    });
    say(publicAnnouncement);
    setVoices(true);
    setEliminatedRole("");
  }
  function declareWinner(winner: "Village" | "Werewolves") {
    const narration = winner === "Village"
      ? "The final shadow has fallen. The Werewolves have been destroyed. The Village has won."
      : "The village has fallen. The monsters have won. The Werewolves have claimed the village.";
    set({ ...g, winner, phase: "ended", history: [...g.history, `${winner} victory declared by the moderator`] });
    say(narration);
    setShowEndGame(false);
  }
  function endWithoutWinner() {
    set({ ...g, winner: "No winner", phase: "ended", history: [...g.history, "The moderator ended the game"] });
    stopNarration();
    setShowEndGame(false);
  }
  function finishDayElimination(target: string | null) {
    if (!target) {
      set({ ...g, phase: "night", round: g.round + 1, step: 0, actions: [], votes: {}, silenced: [], tieCandidates: [], isRevote: false, history: [...g.history, `Day ${g.round}: no elimination`] });
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
          reset();
          setSetupView("setup");
          setScreen("create");
        }}
        onContinue={(save) => {
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
    <div className="app">
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
        <div className="nav">
          <button
            className={tab === "game" ? "active" : ""}
            onClick={() => setTab("game")}
          >
            <Moon size={18} /> Game director
          </button>
          <button
            className={tab === "players" ? "active" : ""}
            onClick={() => setTab("players")}
          >
            <Users size={18} /> Player roster
          </button>
          <button
            className={tab === "log" ? "active" : ""}
            onClick={() => setTab("log")}
          >
            <BookOpen size={18} /> Chronicle
          </button>
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
            <AmbienceControl phase={g.phase} />
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
                  {g.phase !== "setup" && g.phase !== "ended" && (
                    <button onClick={() => { setGameMenuOpen(false); setShowEndGame(true); }}>
                      <Skull size={15} /> End current game
                    </button>
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
                <span className="pill">{people.length}</span>
              </div>
              <p className="muted">
                Enter one name per line. These are sample names—replace them
                with your group.
              </p>
              <label className="player-count-label">
                Number of players
                <select value={people.length} onChange={(event) => changePlayerCount(Number(event.target.value))}>
                  {Array.from({ length: 16 }, (_, index) => index + 5).map((count) => <option key={count} value={count}>{count} players</option>)}
                </select>
              </label>
              <textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                rows={14}
                spellCheck={false}
              />
            </section>
            <section className="panel">
              <div className="panelhead">
                <Shield size={18} />
                <h2>Physical cards used</h2>
                <span className="pill">{cardTotal} / {people.length}</span>
              </div>
              <p className="muted">Choose the cards being dealt. The app uses this only to build the correct narration order—it never assigns a card to a player.</p>
              <div className="rolelist">
                {ROLES.map((role) => (
                  <div className="roleline" key={role.id}>
                    <div><strong>{role.name}</strong><small>{role.description}</small></div>
                    <div className="counter">
                      <button aria-label={`Remove ${role.name}`} onClick={() => setCounts({ ...counts, [role.id]: Math.max(0, (counts[role.id] || 0) - 1) })}><Minus size={13} /></button>
                      <span>{counts[role.id] || 0}</span>
                      <button aria-label={`Add ${role.name}`} disabled={!!role.unique && !!counts[role.id]} onClick={() => setCounts({ ...counts, [role.id]: (counts[role.id] || 0) + 1 })}><Plus size={13} /></button>
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
                    ["night", "Night action timer"],
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
                    <p className="narration">“{narration}”</p>
                    <div className="speech">
                      <button
                        onClick={() => {
                          say(narration);
                          setVoices(true);
                        }}
                      >
                        <Volume2 size={17} /> Read aloud
                      </button>
                      <button
                        onClick={() => {
                          stopNarration();
                          setVoices(false);
                        }}
                      >
                        <VolumeX size={17} /> Stop
                      </button>
                      <span>
                        {voices ? "Narration enabled" : "Dramatic narration"}
                      </span>
                    </div>
                  </section>
                  <Timer
                    seconds={
                      g.phase === "night"
                        ? g.settings.night
                        : g.phase === "day"
                          ? g.settings.discussion
                          : g.settings.vote
                    }
                    label={
                      g.phase === "night"
                        ? current?.name || "Night"
                        : `${g.phase} countdown`
                    }
                  />
                </>
              )}
              {awaitingReveal && (
                <section className="panel danger">
                  <h3>Reveal the eliminated card</h3>
                  <p>
                    Check {awaitingReveal.name}'s physical card, then select it
                    here. The role is {g.settings.revealRoles ? "announced aloud" : "recorded privately"}.
                  </p>
                  <select
                    value={eliminatedRole}
                    onChange={(event) => setEliminatedRole(event.target.value as RoleId | "")}
                  >
                    <option value="">Choose the revealed role…</option>
                    {ROLES.filter((role) => (g.deckRoles[role.id] || 0) > 0).map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <button className="primary" disabled={!eliminatedRole} onClick={revealElimination}>
                    <Volume2 size={16} /> {g.settings.revealRoles ? "Reveal and announce" : "Record role privately"}
                  </button>
                </section>
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
                      {current.key === "witch" && (
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
                      {current.key === "witch" && (
                        <p className="muted">
                          House rule: the moderator selects the heal target
                          manually; potion use is optional.
                        </p>
                      )}
                      {current.ability !== "none" && <div className="targets">
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
                        {current.ability !== "none" && <button
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
                        <button className="primary" onClick={advance}>
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
                      onClick={() => set(resolveNight(g))}
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
                  {g.silenced.length > 0 && (
                    <p className="muted">
                      Silenced:{" "}
                      {g.silenced
                        .map((id) => g.players.find((p) => p.id === id)?.name)
                        .join(", ")}
                    </p>
                  )}
                  {!discussionStarted ? (
                    <button className="primary big" onClick={() => setDiscussionStarted(true)}>Start discussion <Users size={18} /></button>
                  ) : (
                    <button className="primary big" onClick={() => { update({ phase: "vote", votes: {} }); setDiscussionStarted(false); }}>Record round elimination <Vote size={18} /></button>
                  )}
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
                  reset();
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
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
