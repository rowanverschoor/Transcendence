# 0003 — Pluggable microgame collection architecture (withdrawn)

## Status

Withdrawn — 2026-10-01, before acceptance. Proposer: mifelida.
Number retired; the next records after 0002 keep 0002's numbering
(0004, 0005) rather than reuse 0003. See the README note on the
withdrawal.

## Context

- The original product brief was a WarioWare-style collection of
  small games, each shipping independently, so the architecture
  question this record drafted was how to make games pluggable:
  a host process owning sessions and matchmaking, with each
  microgame registering a self-contained module (its own rules,
  inputs, message extensions, and rendering contract) against the
  host.
- Team of 5; the learning budget is the scarcest resource (0001),
  so the draft optimized for isolating tiny scopes behind one
  host contract.

## Decision

Withdrawn. The product pivoted to a single agar.io clone (see
0001's product shape and 0002's amended context), which removed the
only force the pluggable design existed for. The sync and transport
decisions (0002, 0005) — server-authoritative state, WebSocket
sessions, shared typed messages — survive the pivot and are the
records that actually govern the game's communication today.

## Consequences

- Easier: one game means no module-boundary engineering for the
  host; the GameRoom/RoomRegistry model in the current backend is a
  single-session model, not a registry of pluggable games.
- Harder: restarting the collection idea later means matching
  matchmaking and host contracts were never built; reuse claims
  must be revalidated, not assumed.
