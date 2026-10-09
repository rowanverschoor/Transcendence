# 0002 — Use server-authoritative synchronization over WebSocket

## Status

Proposed — 2026-09-15. Proposer: mifelida. Amended — 2026-10-01:
rewritten for the product pivot from a microgame collection to a
single agar.io clone (ADR 0003 withdrawn before acceptance); the
sync model itself is unchanged.
Acceptance criteria: full team has read it, and the sync spike
(two browsers, one server tick loop, shared state) demonstrates the
input → snapshot pattern end to end.

## Context

- The product is live multiplayer: 4+ clients must observe the same
  agar.io arena state at interactive rates.
- Subject modules explicitly require remote players (latency and
  disconnection handling) and 4+ player sync; graceful reconnection
  is listed as a requirement, not an extra.
- Player-versus-player mechanics (bigger cells eating smaller ones)
  make arbitrary client claims untrustworthy by design: whoever
  controls the state machine controls who dies.
- Nobody on the team has built real-time web software before, so
  the sync model must be one pattern the whole game reuses.

## Options considered

1. **Server-authoritative:** the server owns the tick loop and all
   state; clients send input events and render snapshots.
2. **Client-authoritative / P2P:** simplest to build, but each
   client's own cell must be simulated somewhere; owner-simulated
   cells make eating contests divergent and cheating trivial, and
   reconnecting a mid-game peer has no single source of truth to
   resync from.
3. **Deterministic lockstep:** clients exchange only inputs and
   simulate identically. Overkill for a reaction-based game with
   variable browser timing; hard to debug for a team new to the
   area.

## Decision

Server-authoritative. The server owns the game state: cell
positions, radii, pellet population, and eating resolution happen
in one server tick loop. Clients send input (pointer position →
desired movement direction); the server broadcasts snapshots;
clients render whatever the server last sent.

The specific library (Socket.IO vs raw ws) is deliberately not part
of this ADR — that is a smaller, reversible choice for a follow-on
decision (0005), and does not change the architecture.

## Consequences

- **Easier:** one sync pattern to teach and reuse; eating/collision
  rules are validated in exactly one place, so game rules cannot be
  cheated from the client; spectator mode falls out for free.
- **Harder:** the backend carries the engineering weight — tick
  loop, snapshotting, input validation; input feels slightly delayed
  compared to local simulation; per the skill's warning this is the
  decision that is most expensive to reverse, so the spike must
  prove it before status becomes Accepted.
- **Requires follow-on ADRs:** WebSocket library choice (0005).

## Revisit trigger

If server tick rate cannot hold interactive feel for movement
under realistic network conditions, consider client-side prediction
for the player's own cell movement only — not a change to the
authority model.

Separate failure path: if the sync spike cannot demonstrate the
pattern at all, this ADR is marked Rejected and the product
descopes away from real-time-dependent modules — per the revisit
trigger in 0001, that is a scope decision (PO), not a stack change.
