# Authentication

Living document for the auth work: how auth works in this project, what we
have assumed, and what is still undecided. Update it in the same PR whenever
a decision changes or a milestone is finished.

Owner: a0f. Last updated: 2026-10-07.

Decisions that are expensive to reverse get their own ADR (Architecture Decision Record) in
[docs/adr](./adr/README.md). This file links to them.

## Overview

Users sign up and log in with an email and a password, which is the minimum
the subject requires. Passwords are never stored, only salted hashes. The
backend checks credentials and keeps track of who is logged in. The frontend
shows the forms and reflects whether you are logged in.

Where we want to end up:

1. **Register:** form in the browser, backend validates the input, hashes the
   password and stores the user.
2. **Log in:** backend checks email and password, then starts a session.
3. **Every request after that:** the browser sends the session along, so the
   backend knows who you are.

Right now only a frontend placeholder exists: login and register pages, and a
fake `AuthService` that accepts any email with the password `password`.
Nothing talks to the backend yet.

## Roadmap

Each milestone is one PR. The individual changes inside a milestone are
planned when we start it, not before.

### 1. Frontend stub (in progress)
- **Goal:** login and register pages using a fake `AuthService`, logging in by email.
- **Done when:** you can log in and out in the browser and the page shows the
  current user. No backend involved.
- **Watch out:** nothing open.

### 2. Shared auth contract
- **Goal:** request and response types for register and login live in
  `shared/`, imported by both frontend and backend.
- **Done when:** both sides compile against the same types.
- **Watch out:** user ID type (Q3).

### 3. Backend auth module
- **Goal:** register and login endpoints in NestJS, password hashing, input
  validation. Users are stored in memory behind a `UsersRepository` interface.
- **Done when:** you can register and log in over HTTP, and wrong passwords
  and invalid input are rejected. Tests pass.
- **Watch out:** keep the password hash out of the main user record, and keep
  "check the password" separate from "start a session". Both make OAuth
  easier to add later. Email rules (Q2), password rules (Q5).

### 4. Sessions and protected routes
- **Goal:** the backend remembers who is logged in and refuses protected
  requests from anyone who isn't.
- **Done when:** a protected endpoint works for a logged-in user and refuses
  everyone else. Logout works.
- **Watch out:** cookies or JWT needs an ADR (Q4). Secure cookies need HTTPS,
  which ties into the deployment setup.

### 5. Frontend wiring
- **Goal:** the fake `AuthService` is replaced by real HTTP calls, forms
  validate their input, and pages that need a login are guarded.
- **Done when:** the whole flow works in the browser against the real backend.
- **Watch out:** the subject requires validation on both frontend and backend.

### 6. Postgres swap
- **Goal:** replace in-memory storage with Postgres.
- **Done when:** users survive a backend restart.
- **Watch out:** waits on DevOps (not before 2026-10-14) and on ADR 0004
  (Postgres and ORM).

### 7. Authenticated WebSockets
- **Goal:** the game server knows which user each connection belongs to.
- **Done when:** to be decided.
- **Watch out:** touches the game code. Ownership is still open (Q8).

Optional modules for later: OAuth 2.0 (42 and/or Google), 2FA.

## Decisions

- Login is email and password. OAuth is postponed, but we avoid choices that
  would block it. (2026-10-07)
- Passwords are only stored as salted hashes. (subject requirement)
- Until Postgres is running, users live in memory behind a `UsersRepository`
  interface, so switching storage only touches one place. (2026-10-07)
- The database will be PostgreSQL. Planned, to be made official in ADR 0004.
- Users have a display name that other players see, separate from the email
  they log in with. Display names are unique ignoring case, so `Sam` and `sam`
  can't both exist and nobody can pose as someone else by changing letter
  case. A name is shown as the user typed it. (2026-10-07)

## Follow-ups

Smaller things to handle in a specific milestone.

- **Milestone 3:** limit display names to a small set of characters (for
  example `a-z`, `0-9`, `_`). Unicode has look-alike letters, such as a
  Cyrillic `а` that looks exactly like a Latin `a`, which would get around
  the case rule.

## Open questions

Check this list before starting a milestone. When a question is answered,
move it to Decisions (or an ADR) with the date.

- **Q2. Emails.** Do we lowercase and trim emails before storing them? Do we
  verify that an email is real? This also matters for linking OAuth accounts
  later.
- **Q3. User IDs.** UUIDs or auto-increment numbers? Suggestion: UUIDs.
- **Q4. Sessions.** Server-side sessions with cookies, or JWTs? Needs an ADR.
- **Q5. Password rules.** Minimum length (the register page says 8 for now),
  anything else?
- **Q6. ORM.** Prisma or Drizzle? Decided together with DevOps in ADR 0004.
- **Q7. Modules.** Are we doing OAuth and/or 2FA?
- **Q8. Milestone 7.** Who owns authenticated WebSockets?
