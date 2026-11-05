# Werewolf Ultimate — Moderator's Desk

A local-first, mobile-friendly React + TypeScript moderator dashboard for games played with physical role cards. It includes multiple autosaved games, dramatic speech narration, phase-aware ambience, night-action resolution, timers, a player roster, and moderator-confirmed victory.

The header includes optional looping ambience. Starting the game switches automatically to the dedicated Night track. Each Night-to-Day transition plays a one-shot rooster cue while the background briefly ducks, then restores normal volume. Browsers may require the moderator's initial Start Game tap before audio can begin.

The opening screen includes an optional narrated introduction, a narrated game-flow guide, and individually playable role objectives. Visible captions accompany every explanation, and ambience automatically ducks while speech is playing.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL printed in your terminal. For a production build run `npm run build`. Run unit tests with `npm test`.

## Game flow

1. Choose the player count, enter player names, select the physical cards being used, configure timers, and press Continue. The app uses the card list only to build the moderator sequence; it never assigns cards to players.
2. Once everyone is ready and seated, play the opening introduction and press Start Game. Keep the moderator dashboard private while recording night actions; living players' roles are never entered or displayed.
   Night One is for wolf-pack recognition and role setup only; the wolves do not select or eliminate a victim until Night Two.
3. During Night One, introduce the Wolves, play the Seer narration immediately afterward when a Seer is present, link the Lovers if Cupid is present, and introduce the Doctor and Witch without using their abilities. No player can die. Seer and Detective choices are handled privately without app entry. From Night Two onward, record only actions needed for resolution and skip roles not present or already eliminated.
4. At dawn, the engine resolves the attacks, protections, potions, and lovers recorded by the moderator.
5. When someone is eliminated, check their physical card and record the revealed role. The app announces it only when role reveals are enabled; roles are never assigned to players beforehand.
6. Run discussion and voting with the group, then record only the player eliminated from the round—or choose no elimination after a tie.
7. Repeat until the moderator confirms the physical-card win condition. Game state is autosaved in localStorage.

## Rules and limitations

This is a **playable MVP with an original, simplified Ultimate-style ruleset**, not an official licensed implementation of any published Ultimate Werewolf edition. Role descriptions in the setup UI define this app's house rules. Alpha Wolf is a standard pack wolf; Priest is a regular villager; Apprentice Seer inherits investigations after Seer's death. The Witch can manually choose a healing target (no automatic revelation of the wolf target), with one use per potion. The first-night Cupid can link two lovers. A Hunter elimination pauses the game for a retaliation choice. Silencer is wolf-aligned but cannot vote in the wolf kill action unless another pack wolf is present. Serial Killer prevents standard faction victory while alive. Neutral role victory conditions are simplified.

This version is single-device and moderator-only. There is no networked role distribution, player voting, or authentication. Narration uses the browser's built-in SpeechSynthesis voices and availability varies by browser. Timers run in the current tab and do not auto-advance actions. Saved games and progress are stored in localStorage, but the app is not yet an installable/offline-cached PWA.

## Structure

- `src/engine/game.ts`: role catalog, night sequence, action resolution, voting, and tie-revote logic
- `src/main.tsx`: React moderator dashboard, setup, timers, voting, narration
- `src/style.css`: responsive visual design

## Next iterations

Add configurable house-rule variants, proper offline PWA caching, export/import of games, and broader scenario tests for advanced roles.
