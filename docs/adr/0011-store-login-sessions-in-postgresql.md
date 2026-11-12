## Status

Proposed — 2026-11-12. Proposer: amel-fou.
Follows Q4 in `docs/auth.md` (session storage before auth milestone 4).
Acceptance criteria: full team has read it and no unresolved pushback remains.

## Context

- Auth uses cookie sessions with `express-session` (set up in #15). The
  running backend currently uses the default in-memory store, so every
  session is lost on restart or deploy, and the store is not intended for
  production use.
- Auth milestone 4 needs a logged-in user to survive a backend restart.
  `docs/auth.md` Q4 leaves the storage choice open and requires this ADR
  before milestone 4.
- Users and credentials already live in PostgreSQL (this branch; the
  database/ORM choice is tracked separately as ADR 0009). Sessions are
  small, keyed by session id, read on protected requests, and expire after
  a fixed time.
- Adding another stateful service costs the team more than it saves at
  our scale: five C/C++ developers, one database already in the compose
  stack, and no measured session-store bottleneck.
- This branch also lands a provisional `sessions` table as schema
  groundwork. The final store adapter may expect a different table shape;
  that is an implementation and migration detail, not a change to this
  decision. Migration 0000 is frozen after merge; later changes go in
  0001, 0002, etc.

## Options considered

1. **Keep the in-memory store** — no extra infrastructure, but sessions
   disappear on restart, memory grows without bound, and the store is not
   suitable for production. Rejected.
2. **PostgreSQL, via an `express-session`-compatible store** — sessions
   survive restarts, any backend instance can serve a protected request,
   and we keep one database to operate, back up, and secure.
   `connect-pg-simple` is the likely adapter. Chosen.
3. **Redis / a dedicated session store** — fast, TTL-native, and a good
   fit at large scale, but it adds a service, a container, and another
   failure mode for a workload this small. Rejected for now.
4. **A custom Drizzle session repository** — full control and one schema
   tool, but reimplements serialization, expiry, and cleanup that an
   existing store adapter already provides. Not chosen for milestone 4.

## Decision

Login sessions are persisted in PostgreSQL, in the same database as users
and credentials, through an `express-session`-compatible store. The browser
holds only the signed session cookie; session contents stay server-side.

This decision fixes the storage backend, not the adapter's table shape. If
we use `connect-pg-simple`, it owns its expected `sid`/`sess`/`expire`
table, and the provisional `sessions` table from this PR may be replaced
by a later migration during milestone 4. The cookie/session-id contract
stays the same either way.

Login sessions are separate from game sessions and tournaments (ADR 0008,
planned).

## Consequences

- **Easier:** sessions survive restarts and deploys; multiple backend
  instances can share them without sticky sessions for auth; revoking a
  session is a row delete; there is one backup, access-control, and ops
  story for application data.
- **Harder:** protected requests now depend on a database read (and a
  write when the session changes), so PostgreSQL is on the critical path
  for auth; expired rows must be pruned or the table grows; the session
  payload must never contain password hashes or other secrets; the table
  schema depends on the chosen adapter and will need migrations.
- The `sessions` table added by this PR is provisional. Other code should
  not depend on its exact columns; milestone 4 may replace it via a new
  migration.
- Resolves Q4 in `docs/auth.md`; milestone 4 still owns wiring the store,
  expiry, logout, and protected routes.
- Follow-on: milestone 4 (store + protected routes), milestone 6 (Drizzle
  repositories), ADR 0008 (game sessions/tournaments), ADR 0009
  (database/ORM choice).

## Revisit trigger

If session lookups measurably affect protected-route latency or contend
with the game loop at target load, add a small cache in front of the store
or move sessions to Redis. The signed-cookie and session-id contract stays
the same. If session requirements grow beyond what the adapter supports
(e.g. per-device session management or session metadata queries), replace
the adapter behind the same `express-session` interface.