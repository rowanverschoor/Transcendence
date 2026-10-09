# Architecture Decision Records

Numbered, dated records of the decisions that are expensive to
reverse. Read these before changing anything they touch.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](./0001-use-typescript-for-frontend-and-backend.md) | Use TypeScript for the frontend and backend | Proposed |
| [0002](./0002-use-server-authoritative-websocket-sync.md) | Use server-authoritative synchronization over WebSocket | Proposed |
| [0004](./0004-use-nestjs-for-the-backend.md) | Use NestJS for the backend | Accepted (retroactive) |
| [0005](./0005-choose-socket-io-for-websockets.md) | Choose Socket.IO for the WebSocket layer | Accepted (retroactive) |
| [0006](./0006-take-player-metas-from-the-join-request.md) | Take player colors and names from the join request, verbatim | Proposed |

0003 was withdrawn before acceptance: the product pivoted from a
WarioWare-style microgame collection to a single agar.io clone, so
the pluggable-microgame architecture it described has no remaining
subject. The number is retired; the withdrawn record itself is
[0003](./0003-pluggable-microgame-collection-architecture.md) for
the reasoning trail.

## Planned

Not yet written; each is gated on an input that doesn't exist yet:

- **0007 — choose-frontend-rendering-stack** (Angular is in, pixi.js is in code — record the game-rendering choice once the first arena renders)
- **0008 — choose-session-and-tournament-model** (before the tournament/statistics modules)
- **0009 — use-postgresql-with-an-orm** (after the database spike; ORM choice: Prisma / Drizzle; renumbered from the drafted 0006, which this branch claims for the player-metas record)

## Conventions

- Format: Nygard template (Title / Status / Context / Decision /
  Consequences), one decision per file.
- Naming: zero-padded sequence + present-tense imperative phrase,
  e.g. `0007-use-server-sessions-for-auth.md`.
- Statuses: `Proposed` (under team review) → `Accepted` (binding) →
  `Superseded by <link>` / `Rejected` / withdrawn (number retired,
  noted here).
- **Never edit an Accepted ADR.** Write a new one and link both ways.
- Retroactive ADRs are allowed when code chose before the record:
  mark `Accepted (retroactive)` and say so in Status — the reasoning
  still needs to be on file.
- Acceptance rule: all four other team members read it, at least one
  pushed back or explicitly approved, and the proposer marks it
  Accepted in the weekly meeting.
- Timestamps matter: date anything that could go stale.

## Adding an ADR

1. Copy an existing record as a template; keep it to ~1 page.
2. One decision per file. Split bundled decisions.
3. Context explains our actual situation (team skills, timeline,
   subject constraints) — not generic boilerplate.
4. Consequences name what gets easier, what gets harder, and any
   follow-on ADRs this decision now requires.
