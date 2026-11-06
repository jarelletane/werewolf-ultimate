import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Game, initialGame, restoreGame } from "../engine/game";

export type SavedGame = { id: string; name: string; updatedAt: number; game: Game };

type GameStore = {
  game: Game;
  saves: SavedGame[];
  currentId: string | null;
  set: (game: Game) => void;
  createGame: (game: Game, name: string) => void;
  loadGame: (id: string) => void;
  deleteGame: (id: string) => void;
  reset: () => void;
};

export const useGame = create<GameStore>()(
  persist(
    (set) => ({
      game: initialGame(), saves: [], currentId: null,
      set: (game) => set((state) => ({
        game,
        saves: state.currentId ? state.saves.map((save) => save.id === state.currentId ? { ...save, game, updatedAt: Date.now() } : save) : state.saves,
      })),
      createGame: (game, name) => set((state) => {
        const id = crypto.randomUUID();
        return { game, currentId: id, saves: [{ id, name, updatedAt: Date.now(), game }, ...state.saves] };
      }),
      loadGame: (id) => set((state) => {
        const save = state.saves.find((item) => item.id === id);
        return save ? { game: save.game, currentId: id } : {};
      }),
      deleteGame: (id) => set((state) => ({
        saves: state.saves.filter((save) => save.id !== id),
        currentId: state.currentId === id ? null : state.currentId,
      })),
      reset: () => set({ game: initialGame(), currentId: null }),
    }),
    {
      name: "werewolf-ultimate-v2",
      version: 1,
      migrate: (persisted) => {
        const state = (persisted && typeof persisted === "object" ? persisted : {}) as Partial<GameStore>;
        const saves = Array.isArray(state.saves)
          ? state.saves.filter((save): save is SavedGame => Boolean(save && typeof save.id === "string" && typeof save.name === "string")).map((save) => ({ ...save, updatedAt: typeof save.updatedAt === "number" ? save.updatedAt : Date.now(), game: restoreGame(save.game) }))
          : [];
        const current = saves.find((save) => save.id === state.currentId);
        return { ...state, saves, currentId: current?.id ?? null, game: restoreGame(current?.game ?? state.game) };
      },
      merge: (persisted, current) => {
        const state = (persisted ?? {}) as Partial<GameStore>;
        return { ...current, ...state, game: restoreGame(state.game), saves: Array.isArray(state.saves) ? state.saves.map((save) => ({ ...save, game: restoreGame(save.game) })) : [] };
      },
    },
  ),
);
