# 0006 — Take player colors and names from the join request, verbatim

## Status

Proposed — 2026-10-09. Proposer: mifelida.
Follows the color-ownership discussion of 2026-10-09 (working session).
Acceptance criteria: full team has read it and no unresolved pushback
remains.

## Context

The colocated first draft of `GameRoom.resolveMeta` owned three
display decisions:

- a backend palette constant (hex list) for new players,
- a random hex fallback when the palette was exhausted,
- a `Blob-{nanoid}` default name when the client sent none.

That meant colors were invented in backend code while the frontend is
the renderer that must display them: restyling the UI (themes, dark
mode, accessibility passes) required a backend change, and the
frontend/cgi client could not trust CSS as a single source of colors.

Nothing consumes a color yet — the game canvas does not exist
(`game.html` is still a placeholder) — so the wire contract can change
now, before any renderer is coupled to server-invented colors.

Constraints:

- The backend is the only shared authority on room state, so whatever
  it puts into `PlayerMeta` is what every client renders; differing
  per-client resolution must be avoided.
- Two players rendering identically is momentarily confusing, but
  never harmful: cells are attributable by owner, not only by paint.
- Joins happen through the validated `join` message; the pipe already
  validates `meta` against a zod schema, so a stricter join is a
  one-line schema change, not handler logic.

## Decision

- The client declares its color (and optionally its name) in the
  `join` request. The backend stores `meta` verbatim and generates
  nothing: no palette, no conflict resolution, no default names.
- `PlayerMeta.color` is required in the protocol (hex-regex validated);
  `JoinRequest.meta` therefore has no default: a join without `meta`
  is rejected by the validation pipe and fails the join, rather than
  producing an uncolored player server-free.
- Player uniqueness of colors is *not* enforced: more than one rival
  may share a color. Distinguishing one's own cells from a same-colored
  rival is a renderer concern (e.g. outline or highlight only for
  `snapshot.you`).
- Unnamed players are likewise the renderer's problem: it may display a
  fallback label or none; the backend stays a passive store of
  display-level info.

Rejected alternative: keep the server palette and hand palette slots
(or indices) to clients — authoritative slot assignment without dupes,
but more state in the backend keeps colors out of CSS theming, which
loses the benefit we started from.

## Consequences

- Color values come from frontend CSS (or any client choice), so
  theming and palette changes are frontend-only.
- The backend gains no code path for display decisions; `GameRoom` is
  storage + joining rules only.
- Gets harder: there is no server guarantee of contrast between the
  player and their rivals or the arena background; the frontend will
  likely need some rendering aid (outline on `you`, or a contrast check
  in the client's picker).
- Gets harder: a hostile client can pick a misleading color (e.g. mimic
  a teammate); actual ownership is still authoritative via
  `GameSnapshot.you`, not intended paint.
- Follow-on (frontend): render own cells distinctly from rivals, and
  default fill for unnamed players.
- Types in the wire now enforce this: the pipe rejects a `join` that
  carries no `meta.color`.
