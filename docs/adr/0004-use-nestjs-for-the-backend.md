# 0004 — Use NestJS for the backend

## Status

Accepted — 2026-10-01. Proposer: mifelida.
Retroactive: written after implementation had already begun
(`backend/package.json`: `@nestjs/common`, `@nestjs/core`,
`@nestjs/platform-express`, `@nestjs/websockets`). Recorded because
0001 explicitly lists "backend framework" as a required follow-on
decision, and the team needs the reasoning on file even though the
code chose first.

## Context

- The backend's hard part is the WebSocket game loop (0002), not
  CRUD. Whatever framework we pick must not fight the gateway.
- Team of 5 from C/C++; the learning budget is the scarcest
  resource (0001). The framework must enforce one recognizable
  structure so any member can read any module.
- The subject requires a framework on the backend.
- Express is already a known quantity from tutorials; NestJS sits
  on top of it, so the HTTP layer underneath is not exotic.

## Options considered

1. **NestJS** — opinionated modules, mandatory constructor DI,
   first-class WebSocket gateways (`@nestjs/websockets`,
   `platform-socket.io`). Steeper first-day curve; cryptic DI error
   messages. Structure pays off with five developers in parallel.
2. **Express alone** — minimal to learn, but structure is by
   convention only and drifts fast in a five-person repo; WebSocket
   wiring is manual.
3. **Fastify** — same structural problem as Express; faster HTTP
   performance, which is irrelevant at our scale (5 concurrent
   sessions).

## Decision

NestJS for the whole backend: HTTP controllers and the game
WebSocket gateway live in one Nest application. Dependencies are
declared explicitly through constructor injection, so the call
sites of a module's wiring stay visible at every provider.

Shared state lives only in the Nest container: providers, the
ConfigModule, and other Nest-managed singletons. Hand-rolled
module-level globals or singletons are banned — `Rooms`-style
`export const` records on module scope were the concrete failure
this rule replays against. Runtime-created objects with lifecycle
(game rooms, sockets) may exist as plain instances, but only behind
a container-managed owner.

Carve-out: module-level constants are not shared state. Immutable
tables (lookup lists, token strings, configuration maps) stay legal
on module scope — their blast radius is the definition site, and
TypeScript encodes the immutability (`as const`, `readonly`,
`ReadonlyMap`) so the compiler carries the constraint. Mutating
them relies on a cast or a definition-site lie, not an accessible
edge; mutable records of the banned kind are writable from
anywhere, which is exactly what made `Rooms` unownable.

## Consequences

- **Easier:** every module reads the same way (review speed for five
  parallel developers); DI gives testable seams; the gateway
  integrates with the same lifecycle as the HTTP server —
  one process, one container for deployment. Container-owned state
  keeps ownership questions answerable by reading module providers.
- **Harder:** decorators and DI are two new concepts for a C/C++
  team; framework magic hides wiring, so debugging means learning
  Nest's resolution order.
- Locked to Express under the hood (`platform-express`) unless we
  later pay an adapter swap.

## Revisit trigger

If the game loop outgrows the gateway's per-connection model (e.g.
one authoritative tick loop shared by many rooms becomes awkward in
Nest's provider model), isolate the loop in a plain-TS engine module
imported by the gateway — the engine stays framework-free either
way, so this decision can be reversed without touching game code.
