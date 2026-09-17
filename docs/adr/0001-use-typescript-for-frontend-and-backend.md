# 0001 — Use TypeScript for the frontend and backend

## Status

Proposed — 2026-09-17. Proposer: mifelida.
Acceptance criteria: full team has read it, the stack spike
(input → WebSocket → two browsers render a shared moving square) has
run without surprises, and no unresolved pushback remains.

## Context

- Team of 5, all from a C/C++ background; most of us are not productive
  in a web stack today. The learning budget is the scarcest resource.
- Timeline: 6–12 weeks to final defense.
- Subject constraints (ft_transcendence): web application with
  frontend, backend, and database; a framework on both frontend and
  backend; containerized single-command deployment; HTTPS for all
  browser-facing connections; latest Chrome with a clean console.
- Product shape: agar.io clone played live by 4+ players
  in one session.
- Evaluation requires every team member to explain the whole project,
  so total concept count matters more than picking the perfect tool.

## Options considered

1. **TypeScript everywhere** (Node.js backend, SPA frontend).
   One language to ramp up on; C programmers keep the static-types
   they're familiar with; one lint/format/CI setup for the whole repo.
2. **Python backend (Django) + JavaScript frontend.**
   Two languages to learn; Django is strong for CRUD/social apps but
   a poor fit for a real-time game loop (ASGI/channels is more to learn).
3. **Ruby on Rails backend + JavaScript frontend.**
   Mature, batteries-included, and explicitly on the subject's
   backend-framework list; convention-over-configuration and
   scaffolds shine for CRUD-heavy products, and Action Cable covers
   WebSockets. Still two languages to learn, Ruby's dynamic typing
   gives our C-trained team no static safety net, and real-time game
   loops are less idiomatic than in Node. Its CRUD strengths grow in
   relevance only if we descope away from real-time features (see
   Revisit trigger). Rejected on language count and real-time fit.

## Decision

TypeScript for all frontend and backend code. API request/response
shapes and WebSocket message types are defined once as shared types
and imported by both sides, so the contract is checked at compile
time, not by reading each other's code.

## Consequences

- **Easier:** one ramp-up effort instead of two; contract drift is a
  compile error; a single CI setup covers both sides.
- **Harder:** the team must internalize the event loop — no
  busy-waits, no blocking calls, mutexes do not apply. C habits
  around memory do not transfer either; GC replaces RAII.
- Node's single-threaded compute ceiling is acceptable at our scale
  (5 concurrent game sessions is not a scaling problem), but game
  tick logic must stay off the main thread's hot path if it grows.
- **Requires follow-on ADRs:** backend framework (0004), database +
  ORM (0005), frontend framework and game rendering (planned).

## Revisit trigger

The spike is a skills benchmark, not a stack referendum. We are
committed to shipping a game on this stack; if the team cannot
produce the moving-square demo in TypeScript within the timebox,
the language decision stands and we reconsider the product scope
instead: features that require real-time communication (remote
players, 4+ player sync) become descope candidates, and
the PO owns the call to pivot toward a game that works without
them.

