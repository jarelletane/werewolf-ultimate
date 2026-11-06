import { BookOpen, ChevronRight, Moon, Trash2 } from "lucide-react";
import { alive } from "../engine/game";
import { SavedGame } from "../store/gameStore";

type Props = {
  saves: SavedGame[];
  onNew: () => void;
  onContinue: (save: SavedGame) => void;
  onDelete: (id: string) => void;
};

export function HomeScreen({ saves, onNew, onContinue, onDelete }: Props) {
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
