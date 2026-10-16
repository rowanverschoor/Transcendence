# 0005 — Choose Socket.IO for the WebSocket layer

## Status

Accepted — 2026-10-01. Proposer: mifelida.
Retroactive: written after implementation had already begun
(`backend`: `@nestjs/platform-socket.io`, `socket.io` 4.8;
`frontend`: `socket.io-client`). Supersedes the open question left
in 0002 ("Socket.IO vs raw ws"), which deliberately excluded the
library choice from the sync-model ADR.

## Context

- 0002 fixed the architecture (server-authoritative, input →
  snapshot) but left the transport library open pending spike
  evidence.
- The game needs: broadcast to all clients in a session, typed
  message shapes (0001's shared types), reconnection with state
  resync (a subject requirement), and CORS-tolerant development
  (Angular dev server on a different port from the backend).
- Two smaller demos already exist in git history
  (`19183da0` "Forward mouse coordinates to all clients") and were
  built against Socket.IO before this ADR existed.

## Options considered

1. **Socket.IO** — rooms, automatic reconnection with backoff,
   broadcast/room semantics out of the box, integrates with NestJS
   gateways via `@nestjs/platform-socket.io`. Wraps WebSocket in its
   own framed protocol, so non-Socket.IO clients cannot connect.
2. **raw `ws`** — minimal, no library protocol overhead, closest to
   the metal for a C-minded team. But reconnection, rooms, and
   broadcast are hand-rolled — each is a subject requirement, and
   hand-rolling them across five developers invites divergence.

## Decision

Socket.IO on both ends. The backend gateway broadcasts snapshots;
clients connect with `socket.io-client`. Message payloads remain the
typed `ClientMessage` / `ServerMessage` shapes from
`@transcendence/shared`, serialized as JSON strings; if overhead
becomes a measured problem, revisit binary transport in a follow-on
decision — that is a payload-format change, not a change of library
or architecture.

## Consequences

- **Easier:** reconnection (subject requirement) is built in;
  rooms map naturally to game sessions; broadcast-except-sender is
  one call; the NestJS integration is official, not community glue.
- **Harder:** protocol overhead per message (framed, JSON-encoded);
  lock-in: the client must speak Socket.IO, so a future non-browser
  client (bot, test harness) needs the same library; debugging
  passes through the library's event layer before our handlers.
- Overhead is acceptable at our scale: snapshot rate is bounded by
  the tick rate, not by user actions.

## Revisit trigger

If profiling shows serialization or framing cost dominating the
tick budget at target player counts, evaluate a binary payload
(0002's note stands) or a raw-`ws` swap inside the same gateway
interface — the authority model in 0002 does not change either way.
