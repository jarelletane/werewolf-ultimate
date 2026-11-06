# Werewolf Ultimate — Party Mode Roadmap

Party Mode is a future multiplayer mode in which each participant joins the game on their own phone, receives a private role card, submits eligible night actions, and votes during the day.

This is a separate product mode rather than a replacement for the current local-first Moderator Mode. It is not part of the present production-readiness scope.

## Product concept

One person creates and moderates a room. Other players join using a short room code or QR code.

Each player can receive:

- A private role card and objective
- Phase-specific instructions and timers
- Night-action controls when their role is eligible
- Daytime voting controls
- Private statuses such as silenced, protected, eliminated, or linked

The moderator retains control over:

- Starting, pausing, and advancing phases
- Reviewing and resolving submitted actions
- Confirming eliminations and tied votes
- Recovering disconnected players
- Correcting moderator or player mistakes
- Ending the game and declaring a winner

## Proposed flow

```text
Moderator creates room
        ↓
Players join by QR code or room code
        ↓
Moderator selects the deck
        ↓
Server privately assigns roles
        ↓
Players confirm their cards
        ↓
Eligible night actions are submitted privately
        ↓
Moderator reviews and resolves the night
        ↓
Daytime discussion occurs in person
        ↓
Players vote on their phones
        ↓
Moderator confirms the result
        ↓
Repeat until a victory condition is reached
```

## Night interaction

Each player sees only the information and actions permitted for their role:

- Werewolves see eligible targets and, where appropriate, the other Werewolves.
- The Seer selects a player and receives a private allegiance result.
- The Detective selects a player and receives a private role result.
- The Doctor and Bodyguard submit protection targets.
- The Witch receives the available potion options.
- Cupid selects two Lovers.
- Lovers privately learn one another's identities.
- The Serial Killer selects a victim.
- The Silencer selects a player for the following day.
- Roles without an action receive a private instruction to remain inactive.

Night resolution should initially require moderator confirmation. Fully automatic resolution would make player mistakes, disconnections, and unusual edge cases harder to recover from.

## Daytime voting

Players can submit votes privately from their phones. The moderator can see:

- How many votes have been submitted
- Which players have not voted
- Final totals
- Tied candidates
- Revote eligibility and progress

Whether individual votes become public should be a configurable house rule.

## Security and architecture

Party Mode requires a backend or realtime room service. The server must be authoritative and validate every transition and submitted action.

The current Zustand/localStorage state must not be synchronized wholesale because it contains information that players must never receive.

State should be separated into explicit visibility boundaries:

```text
Server-authoritative game state
├── Public room and phase state
├── Moderator-only resolution state
└── Private state for each individual player
```

Technical requirements include:

- Realtime room synchronization
- Short-lived room codes and QR joining
- Private per-player state and views
- Reconnection tokens that do not expose another player's role
- Server-side authorization for every request
- Disconnect, timeout, and abandoned-room handling
- Duplicate-action and replay protection
- Moderator correction and recovery tools
- Deployment, monitoring, rate limiting, and abuse controls
- Clear privacy and data-retention documentation

## Recommended staged delivery

### 1. Companion Mode

Players join a room and receive private digital role cards. The moderator continues controlling night actions, voting, and game resolution in the existing dashboard.

### 2. Mobile voting

Add synchronized daytime voting, missing-vote indicators, tie handling, and moderator confirmation.

### 3. Private night actions

Add role-specific action submission with server validation and moderator review.

### 4. Optional automated resolution

Add automatic resolution only after reconnection, correction, privacy, and complex rule scenarios are well tested.

## Product principles

- Preserve Moderator Mode as a complete local-first experience.
- Keep Party Mode as a distinct entry point and architecture.
- Never expose the complete game state to player clients.
- Prefer moderator-confirmed resolution until recovery flows are proven.
- Design disconnection and correction handling before automation.
- Avoid adding Party Mode to the current production-readiness release.
