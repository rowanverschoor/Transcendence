# Handoff: auth milestone 3 planned, nothing built yet

Written 2026-10-08 at school, for the next session at home.
One-time use. Read it, check the state below, then remove it (see the end of
this file). It must not end up in a PR.

Notes from the school machine do not exist at home, so everything needed is
in this file and in `docs/auth.md`.

## Read first

`docs/auth.md` is the source of truth. Today added a lot to Decisions and
Follow-ups, and the Roadmap now splits milestone 3 into PRs. Read those three
sections before anything else.

## How we work

- Discuss, then do, then assess. One step at a time, no running ahead.
- I type the code edits myself. Show a small before/after diff with file:line
  and one line of why, wait until I say it is typed, then check by reading the
  file. Purely mechanical or cosmetic fixes: offer, and do them if I say yes.
- For frontend code: plain HTML structure is fine to hand over, all Angular
  wiring and logic I write myself.
- The assistant drafts docs, PR descriptions, issues and Discord messages in
  my plain voice: no em dashes, nothing that sounds AI-written, nothing
  tool-specific. I review.
- The assistant runs git when asked. Commit and push only on my go-ahead.
- Planning levels: roadmap > milestone > PR > change (one commit, must
  build) > edit.
- Open a session with "where are we, what is today's goal". Close with "what
  got done, what is next, new open questions".
- C/C++ analogies work well. Keep explanations short, beginner level first
  when I ask for full context. I ask "why" a lot, that is on purpose.
- PRs small and about one thing. Most of the team is new to web dev.
- Once a PR is under review, add new commits instead of rewriting history.
- Before claiming how a tool behaves, test it with a small throwaway probe and
  delete it afterwards.

## Commands

My shell activates mise, so plain npm works in the repo:

- Frontend build: `npm run build:frontend`
- Frontend tests: `npm run test:frontend -- --watch=false`
- Backend type check: `npm run check -w backend`
- Dev server: `mise run dev` (frontend http://localhost:4200, backend 8080)

In a shell without mise activated, prefix with `mise exec --`.
If `ng` or other tools are "not found", `node_modules` is incomplete: run
`npm ci` from the repo root (that happened at school today).

## State to verify

Run `git fetch`, `git status -sb`, `git log --oneline -8`.

- PR #10 (milestone 1) is merged into main.
- PR #12 (milestone 2, branch `feat/auth-contract`) is open. I fixed the one
  review comment (`z.uuidv4()`, commit `2b8158af`), replied and asked for a
  re-review. Check whether it is approved. If so, merge with "Create a merge
  commit", not squash.
- Branch `feat/auth-backend` is stacked on `feat/auth-contract` and pushed. It
  has two doc-only commits on top of #12:
  - `094864d9` Record @Inject decision for backend dependency injection
  - `0b91206e` Record milestone 3 decisions in auth doc
  - plus the commit that adds this file.
- Issue filed for the failing `home.spec.ts` test (`matchMedia is not a
  function`), assigned to Rowan (GitHub `rowanverschoor`, git name Atoomsnor).
  Not our code, do not fix it in our PRs.

## What was decided today (details in docs/auth.md)

- Backend: `@Inject(...)` on every constructor parameter. `tsx` (esbuild)
  does not save the parameter types NestJS normally reads, so without it the
  parameter is silently `undefined`. Tested, it really happens, in `tsx` and
  in Vitest. A startup check will catch any missing `@Inject`. Switching
  runners is Mike's call (he set up `tsx`), the blast radius includes the
  Dockerfile and how `shared/` is loaded.
- Passwords: scrypt via Node's built-in `crypto.scrypt`, salt per user,
  hashing only in the backend. Argon2 is only built into Node 24+, and the
  backend Docker image is Node 22. No algorithm field, no Argon2 prep.
- Password rules: NIST with min 8, max 64, no composition rules, about the
  1000 most common passwords refused.
- Backend tests: Vitest.
- Errors: NestJS default shape, `400` with an `errors` field per input field,
  login `401` always "Invalid email or password" with the same timing (dummy
  scrypt for unknown emails). Register answers `409` for now, temporary: the
  goal is that register does not reveal which emails exist, through email
  verification later, timing depends on the module choice (GDPR module needs
  email anyway).
- Emails trimmed and lowercased in the shared `Email` schema. Q2 closed.
- Display names: `A-Z a-z 0-9 _`, 3 to 32.
- Register `201` and login `200`, both return the safe `User`. No session
  until milestone 4.
- Code layout (not in the doc on purpose, it belongs to the PR planning):

  ```
  backend/src/
    common/zod-validation.pipe.ts
    users/   users.module.ts, users.repository.ts (abstract class, used as
             the DI token), in-memory-users.repository.ts (useClass)
    auth/    auth.module.ts, auth.controller.ts, auth.service.ts,
             credentials.repository.ts (salt + hash per userId),
             password-hasher.ts
  ```

  `users/` knows nothing about passwords. The repository is an abstract class
  and not an interface, because interfaces disappear at runtime and
  `@Inject` needs something that exists.

## What is next, in order

1. **`@Inject` check PR**, its own branch from `main`. I write it, the
   assistant guides step by step. It runs at startup in `main.ts`, between
   `NestFactory.create` and `app.listen`. No Vitest needed. Facts from
   today's probes:
   - `SomeClass.length` is the number of constructor parameters, it survives
     `tsx`.
   - `@Inject` stores its labels under the metadata key `self:paramtypes`.
   - Walk the modules with `app.get(ModulesContainer)` from `@nestjs/core`.
   - Only check classes our own `@Module({...})` lists, otherwise NestJS's
     own classes (for example `ModuleRef`) show up as false alarms.
   - For a provider like `{ provide: X, useClass: Y }`, check `Y`.
   - Test by hand: add a class without `@Inject`, see the backend refuse to
     start, remove it. Put that in the PR description.
2. **Contract PR**, only `shared/auth.ts`: email trim and lowercase (trim
   before the format check), password max 64, common password list (about
   1000), display name characters.
3. **3a Register**: Vitest in the backend (its own devDependency and `test`
   script, do not rely on the frontend's copy), zod pipe, `users/`, password
   hasher (hash), credentials store, `AuthService.register`,
   `POST /auth/register`. About 330 lines with tests.
4. **3b Login**: verify with `crypto.timingSafeEqual`, dummy scrypt for
   unknown emails, `AuthService.login`, `POST /auth/login`. About 200 lines.

Also: once #12 is merged, open `feat/auth-backend` as a small docs-only PR
("Record milestone 3 decisions") against main, so the team can react to the
decisions before the code comes.

## Discord

A heads-up about `@Inject` was drafted for the team, asking Mike about the
runner. Check whether it was posted and whether Mike answered. Link for it:
https://github.com/rowanverschoor/Transcendence/blob/feat/auth-backend/docs/auth.md#decisions

## Loose ends to mention at session close

- Ask Mike: the runner (`tsx` or a switch), and where ADRs 0002 to 0005 live
  (`docs/adr` only has 0001).
- `frontend/package-lock.json` is a leftover, I asked @MFelida in #10 whether
  it can go. If yes, small separate PR.
- `mise run check` calls `npm run check` at the root, which does not exist.
- Tell DevOps: backend Docker image is Node 22, mise gives Node 26 locally.
- No CI yet. Team topic. Starting the backend in CI would run the `@Inject`
  check for free.
- The module list we chose is not in the repo. The subject is
  `docs/en.subject.pdf`. Q7 (OAuth, 2FA) and the GDPR module affect email
  verification.
- Still open in the doc: Q4 sessions (ADR before milestone 4), Q6 ORM, Q7
  modules, Q8 WebSockets.
- School machine only: local branches `backup/auth-contract` and
  `old-scaffold` can be deleted later.

## Removing this file

This file sits in its own commit at the tip of `feat/auth-backend`. After
reading it, before anything else on this branch:

```sh
git reset --hard HEAD~1
git push --force-with-lease
```

That drops only the handoff commit. Check with `git log --oneline -3` that
the tip is `0b91206e` again. No PR exists on this branch yet, so the force
push affects nobody.
