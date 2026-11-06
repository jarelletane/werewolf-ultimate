import { ArrowLeft, BookOpen, ChevronRight, Moon, Shield, Volume2 } from "lucide-react";
import { ObjectiveClip, roleObjectiveSequence, selectedRoleIds } from "../audio/roleObjectives";
import { Game, roleOf } from "../engine/game";

type Props = {
  deckRoles: Game["deckRoles"];
  showGuide: boolean;
  onShowGuide: () => void;
  onStartGame: () => void;
  onBack: () => void;
  onPlayNarration: (clips: ObjectiveClip[]) => void;
};

const introduction = "Welcome to the village. By day, the village debates and votes. By night, hidden roles wake and act. Keep your card secret, listen carefully, and decide whom to trust before the wolves take control.";
const gameExplanation = "First, deal the physical role cards. Each player secretly checks their card. When night falls, everyone closes their eyes and the moderator follows the prompts while active roles silently choose their targets. At dawn, reveal the victims and discuss what happened. Every surviving player may make their case before the village votes to eliminate one suspect. Continue through night and day until a faction or special role completes its objective.";
const newPlayerStrategy = "If this is your first game, remember that Werewolf is a game of observation, persuasion, and deception. Villagers should listen for contradictions, compare how people vote, and share suspicions without revealing too much too early. Special village roles should use their information carefully, because revealing yourself may make you a target. Werewolves should appear helpful, redirect suspicion, and support one another without making their alliance obvious. Neutral roles have their own objectives, so their behaviour may not benefit either side. You do not need to be certain before speaking. Ask questions, explain your reasoning, and pay attention to how others react. Being eliminated is part of the game, so keep your role secret and enjoy the story as it unfolds.";

export function WelcomeScreen({ deckRoles, showGuide, onShowGuide, onStartGame, onBack, onPlayNarration }: Props) {
  const teamObjective: Record<string, string> = {
    village: "Find and eliminate every wolf-aligned player.",
    wolf: "Survive until the wolves equal or outnumber the Village.",
    neutral: "Complete the unique win condition printed on the role card.",
  };
  const guideRoles = selectedRoleIds(deckRoles).map(roleOf);
  const objectiveSequence = roleObjectiveSequence(deckRoles);
  return (
    <div className="welcome-screen">
      <section className="panel welcome-hero">
        <div className="moonart"><Moon size={42} /></div>
        <div className="eyebrow">A SOCIAL DEDUCTION GAME</div>
        <h2>The village is ready</h2>
        <p>By day, the village debates and votes. By night, hidden roles wake and act. Keep your card secret, listen carefully, and decide whom to trust before the wolves take control.</p>
        <button className="narrate-guide" onClick={() => onPlayNarration([{ src: "/audio/narration/01-welcome.mp3", text: introduction }])}>
          <Volume2 size={16} /> Play introduction
        </button>
        <div className="welcome-actions">
          <button className="primary" onClick={onStartGame}>Start game <ChevronRight size={17} /></button>
          <button className="secondary" onClick={onShowGuide}><BookOpen size={17} /> {showGuide ? "Hide guide" : "How to play"}</button>
        </div>
        <button className="back-to-setup" onClick={onBack}><ArrowLeft size={14} /> Back to player setup</button>
      </section>
      {showGuide && (
        <div className="guide-content">
          <section className="panel">
            <div className="panelhead"><BookOpen size={18} /><h2>How a game works</h2><button className="smallbtn" onClick={() => onPlayNarration([{ src: "/audio/narration/02-how-to-play.mp3", text: gameExplanation }])}><Volume2 size={14} /> Listen</button></div>
            <div className="game-steps">
              <div><span>1</span><strong>Deal the cards</strong><p>Each player secretly checks their physical role card. The app only needs the cards included in the deck.</p></div>
              <div><span>2</span><strong>Play the night</strong><p>Everyone closes their eyes. The moderator follows the app’s prompts while active roles silently choose targets.</p></div>
              <div><span>3</span><strong>Debate by day</strong><p>Reveal the night’s victims, discuss suspicions, and let every surviving player make their case.</p></div>
              <div><span>4</span><strong>Vote and survive</strong><p>The village votes to eliminate one suspect. Continue until a faction or special role reaches its objective.</p></div>
            </div>
            <div className="role-instruction">
              <div className="script-label"><BookOpen size={14} /> Optional guide for first-time players</div>
              <p>Learn the basic strategy for Villagers, special roles, Werewolves, and neutral players without revealing advanced tactics.</p>
              <button className="secondary" onClick={() => onPlayNarration([{ src: "/audio/narration/04-new-player-strategy.mp3", text: newPlayerStrategy }])}><Volume2 size={16} /> Play new-player strategy</button>
            </div>
          </section>
          <section className="panel">
            <div className="panelhead"><Shield size={18} /><h2>Roles in this game</h2><button className="smallbtn" onClick={() => onPlayNarration(objectiveSequence)}><Volume2 size={14} /> Play all objectives</button></div>
            <p className="muted">Only roles included in this game are shown. Each objective plays once, even when the deck contains multiple copies of a card.</p>
            <div className="role-guide-grid">
              {guideRoles.map((role) => <article className={`role-guide-card ${role.team}`} key={role.id}><div><strong>{role.name}</strong><span>{role.team}</span></div><p>{role.description}</p><small><b>Objective:</b> {teamObjective[role.team]}</small></article>)}
            </div>
          </section>
          <button className="primary big guide-start" onClick={onStartGame}>Start the game <ChevronRight size={18} /></button>
        </div>
      )}
    </div>
  );
}
