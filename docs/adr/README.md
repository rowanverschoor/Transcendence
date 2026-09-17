# Architecture Decision Records

Numbered, dated records of the decisions that are expensive to
reverse. Read these before changing anything they touch.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](./0001-use-typescript-for-frontend-and-backend.md) | Use TypeScript for the frontend and backend | Proposed |

## Planned

Not yet written; each is gated on an input that doesn't exist yet:

- **0002 — Use server-authoritative synchronization over WebSocket
- **0003 — use-nestjs-for-the-backend** (after the stack spike; options: NestJS / Fastify / Express)
- **0004 — use-postgresql-with-an-orm** (after 0003; ORM choice: Prisma / Drizzle)
- **0005 — choose-websocket-library** (Socket.IO vs ws, spike evidence)

## Conventions

- Format: Nygard template (Title / Status / Context / Decision /
  Consequences), one decision per file.
- Naming: zero-padded sequence + present-tense imperative phrase,
  e.g. `0007-use-server-sessions-for-auth.md`.
- Statuses: `Proposed` (under team review) → `Accepted` (binding) →
  `Superseded by <link>` / `Rejected`.
- **Never edit an Accepted ADR.** Write a new one and link both ways.
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
