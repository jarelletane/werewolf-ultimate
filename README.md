# Werewolf Ultimate — Moderator's Desk

A local-first, mobile-friendly React + TypeScript moderator dashboard with dramatic speech narration, configurable roles, a night-action engine, timers, voting, a player roster, autosave, and win detection.

The header includes optional looping horror ambience. Browsers require the moderator to tap the ambience control before audio can begin; narration remains independently controlled from the game panel.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL printed in your terminal. For a production build run `npm run build`. Run unit tests with `npm test`.

## Game flow

1. Deal your physical role cards, replace the sample player names, and enter only the cards included in the deck. The app never shuffles roles or records which player holds a role.
2. Start the game. Keep the moderator dashboard private: it shows secret roles and night actions.
3. During the night, select each role's target, record its action, and advance. Skip a role to record no action.
4. At dawn, the engine resolves the attacks, protections, potions, and lovers recorded by the moderator.
5. When someone is eliminated, check their physical card and select the revealed role. The app announces it and removes that role from later night calls; roles are never assigned to players beforehand.
6. Run discussion, then record each player's vote. Ties result in no elimination.
7. Repeat until the moderator confirms the physical-card win condition. Game state is autosaved in localStorage.

## Rules and limitations

This is a **playable MVP with an original, simplified Ultimate-style ruleset**, not an official licensed implementation of any published Ultimate Werewolf edition. Role descriptions in the setup UI define this app's house rules. Alpha Wolf is a standard pack wolf; Priest is a regular villager; Apprentice Seer inherits investigations after Seer's death. The Witch can manually choose a healing target (no automatic revelation of the wolf target), with one use per potion. The first-night Cupid can link two lovers. A Hunter elimination pauses the game for a retaliation choice. Silencer is wolf-aligned but cannot vote in the wolf kill action unless another pack wolf is present. Serial Killer prevents standard faction victory while alive. Neutral role victory conditions are simplified.

This version is single-device and moderator-only. There is no networked role distribution, player voting, authentication, or audio file playback. Narration uses the browser's built-in SpeechSynthesis voices and availability varies by browser. Timers run in the current tab and do not auto-advance actions. The app saves state in localStorage but is not yet an installable/offline-cached PWA.

## Structure

- `src/engine/game.ts`: pure role catalog, random role assignment, action resolution, victory logic
- `src/main.tsx`: React moderator dashboard, setup, timers, voting, narration
- `src/style.css`: responsive visual design

## Next iterations

Add explicit action-queue validation and per-role rule variants, secure QR player role reveal, proper offline PWA caching, export/import of games, and scenario tests for more advanced interactions.
