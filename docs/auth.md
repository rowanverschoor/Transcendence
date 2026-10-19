# Authentication

Living document for the auth work: how auth works in this project, what we
have assumed, and what is still undecided. Update it in the same PR whenever
a decision changes or a milestone is finished.

Owner: a0f. Last updated: 2026-10-19.

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

Right now there is a frontend placeholder and a shared contract. The
placeholder is login and register pages, and a fake `AuthService` that accepts
any email with the password `password`. The contract in `shared/auth.ts`
describes what register and login send and receive, and the frontend already
uses its `User` type and field rules. Nothing talks to the backend yet.

## Roadmap

Each milestone is one PR, unless it is too big to review well, then it is
split into PRs that each work on their own. The individual changes inside
a milestone are planned when we start it, not before.

### 1. Frontend stub (done)
- **Goal:** login and register pages using a fake `AuthService`, logging in by email.
- **Done when:** you can log in and out in the browser and the page shows the
  current user. No backend involved.
- **Watch out:** nothing open.

### 2. Shared auth contract (done)
- **Goal:** request and response types for register and login live in
  `shared/`, imported by both frontend and backend.
- **Done when:** the contract is in `shared/` and the frontend compiles
  against it. The backend starts using it in milestone 3.
- **Watch out:** nothing open. User IDs are decided, see Decisions.

### 3. Backend auth module
- **Goal:** register and login endpoints in NestJS, password hashing, input
  validation. Users and credentials are stored in memory behind abstract
  repository classes, until the Drizzle versions replace them (milestone 6).
- **Done when:** you can register and log in over HTTP, and wrong passwords
  and invalid input are rejected. Tests pass.
- **Watch out:** keep the password hash out of the main user record, and keep
  "check the password" separate from "start a session". Both make OAuth
  easier to add later.
- **PRs:** too much for one review, so it is split:
  - **Before:** the contract changes in `shared/auth.ts` (its own PR).
  - **3.0. Repository classes** (together with the doc update): the
    abstract `UsersRepository` and `CredentialsRepository` and the
    duplicate errors. Small, and lets Ama build the Drizzle versions
    against it.
  - **3a. Register:** the in-memory repositories, password hashing and
    `POST /auth/register`, using the zod pipe and Vitest from #15. Sets the
    pattern other endpoints will copy.
  - **3b. Login:** checking the password, the same answer and timing for
    unknown emails, and `POST /auth/login`.

### 4. Sessions and protected routes
- **Goal:** the backend remembers who is logged in and refuses protected
  requests from anyone who isn't.
- **Done when:** a protected endpoint works for a logged-in user and refuses
  everyone else. Logout works.
- **Watch out:** builds on the `express-session` setup from #15. Sessions
  are kept in memory for now and lost on restart; where they are stored goes
  in the login sessions ADR (Q4). Behind cloudflared the cookie needs
  `proxy: true` (Mike is making an issue). Session code treats "no user" as
  a normal case, so guests can be added later.

### 5. Frontend wiring
- **Goal:** the fake `AuthService` is replaced by real HTTP calls, forms
  validate their input, and pages that need a login are guarded.
- **Done when:** the whole flow works in the browser against the real backend.
- **Watch out:** the subject requires validation on both frontend and backend.

### 6. Postgres swap
- **Goal:** the running backend uses Ama's Drizzle repositories instead of
  the in-memory ones. The in-memory ones stay for tests.
- **Done when:** users survive a backend restart.
- **Watch out:** waits on Ama's user and credentials functions. One shared
  test suite runs against both versions, so they can't drift apart, for
  example on case-insensitive display names.

### 7. Authenticated WebSockets
- **Goal:** the game server knows which user each connection belongs to.
- **Done when:** to be decided.
- **Watch out:** touches the game code. Ownership is still open (Q8). The
  game uses its own player id, mapped to a user, not user IDs directly, so
  guests can be added later. Player names come from the account display
  name, which changes ADR 0006.

Optional modules for later: OAuth 2.0 (42 and/or Google), 2FA.

## Decisions

- Login is email and password. OAuth is postponed, but we avoid choices that
  would block it. (2026-10-07)
- Passwords are only stored as salted hashes. (subject requirement)
- Storage sits behind abstract classes (`UsersRepository`,
  `CredentialsRepository`). An abstract class and not a TypeScript
  interface, because interfaces disappear when the code runs and NestJS
  needs a real class to look up the implementation. The in-memory versions
  are for tests, and for the running backend until the Drizzle versions
  land. `users` knows nothing about passwords or hashes; anything that
  touches both lives in `auth/`. The stored password hash is one string
  that includes the salt, so `credentials` needs only one column.
  (2026-10-07, updated 2026-10-19)
- The database is PostgreSQL with Drizzle. Planned, to be made official in
  ADR 0009.
- Ama writes the Drizzle versions of the user and credentials functions,
  a0f writes auth on top. The user functions are `create`, `findByEmail`,
  `findById` and `findByDisplayName`. Creating a user with a password is one
  function, `createUserWithCredentials(user, passwordHash)`, in one database
  transaction, so there is never a user without a password. A duplicate
  email or display name throws an error that says which one, and register
  turns it into a `409`. (2026-10-19)
- Login sessions are cookie sessions with `express-session`, set up in #15.
  Where they are stored is still open (Q4). (2026-10-19)
- No guest players for now. Adding them later stays cheap as long as
  milestones 4 and 7 follow their notes above. (2026-10-19)
- Users have a display name that other players see, separate from the email
  they log in with. Display names are unique ignoring case, so `Sam` and `sam`
  can't both exist and nobody can pose as someone else by changing letter
  case. A name is shown as the user typed it. (2026-10-07)
- User IDs are UUID v4, generated by the backend. Unguessable IDs are not a
  security measure, permission checks still apply. (2026-10-07, v4 in the
  contract since 2026-10-08)
- The shared contract is a set of zod schemas in `shared/auth.ts`, the same
  way `shared/protocol.ts` does it for the game. One definition gives both
  the TypeScript type and the runtime check, for frontend and backend. This
  means milestone 3 validates input with zod, not with NestJS's default
  class-validator. (2026-10-07)
- Display names are 3 to 32 characters. Spaces at the start and end are
  removed before the length is checked, so `Sam` and `Sam ` can't both exist.
  (2026-10-07, trimming since 2026-10-13)
- Register requires a password of at least 8 characters. Login only requires
  a non-empty password. The length rule applies when a password is chosen, so
  if the rules get stricter later, older passwords still work. (2026-10-07)
- Password rules follow NIST SP 800-63B, loosened on length: at least 8 and
  at most 64 characters, no rules about uppercase, digits or symbols, and the
  most common passwords are refused. Rules like "one uppercase, one symbol"
  mostly lead to `Password1!` and block long passphrases. NIST asks for 15
  characters when the password is the only factor, we chose 8 because the app
  holds no sensitive data. (2026-10-08)
- NestJS works out constructor dependencies from their types, using the
  type information that `emitDecoratorMetadata` saves. Both our backend
  runtime (`@swc-node/register`, since #15) and Vitest keep that information
  (checked 2026-10-19), so we only write `@Inject(...)` when the dependency
  is not a class, for example a string token like `GAME_CONFIG`. If the
  backend ever moves to a runner that drops this information, such as
  `tsx`, those dependencies silently become `undefined`. (2026-10-08,
  updated 2026-10-19)
- Passwords are hashed with scrypt, using Node's built-in `crypto.scrypt`,
  with a random salt per user. Hashing happens only in the backend, the
  frontend sends the password as typed over HTTPS. OWASP ranks Argon2id
  first and scrypt second. Node only has Argon2 built in from version 24,
  and our backend Docker image runs Node 22, so Argon2id would mean a Docker
  change or an extra package that needs a native build. scrypt needs
  neither, and scrypt is secure enough for this project. (2026-10-08)
- Backend tests use Vitest, the same tool the frontend uses. It handles
  TypeScript and ES modules without extra setup, and keeps the same type
  information as our runtime, so tests build NestJS classes the same way the
  real backend does (checked 2026-10-19). (2026-10-08)
- Error responses use the NestJS default shape, for example
  `{ "statusCode": 409, "message": "Email already in use", "error": "Conflict" }`.
  Invalid input (`400`) also gets an `errors` field with the problems per
  field, so a form can show each message next to the right input. A failed
  login (`401`) always says "Invalid email or password". (2026-10-08)
- Neither register nor login may reveal whether an email has an account,
  because that helps targeted phishing. Login does this from milestone 3: the
  same answer and the same response time whether the email is unknown or
  the password is wrong. Register gets there through email verification,
  which always answers "check your email". That needs a way to send email,
  which the subject only requires for the GDPR module, so when we build it
  depends on the module choice (Q7). Until then register answers
  `409 "Email already in use"`, and this is temporary. (2026-10-08)
- Emails are trimmed and lowercased, and stored that way. Mail providers
  treat `Sam@Example.com` and `sam@example.com` as the same mailbox, so
  without this one person could end up with several accounts, or fail to
  log in because of a capital letter. We do this in the `Email` schema in
  `shared/auth.ts`, so frontend and backend normalize the same way, and the
  trim happens before the format check. We do not apply provider tricks like
  removing dots or `+tag` for Gmail, since those break other providers.
  (2026-10-08)
- Register answers `201 Created` and login answers `200 OK`, both with the
  safe `User` from the contract. In milestone 3 the backend does not
  remember a login yet, that comes with sessions in milestone 4. If sessions
  use cookies, the body can stay `User`, so the frontend does not have to
  change. (2026-10-08)

## Follow-ups

Smaller things to handle in a specific milestone.

- **Milestone 3:** limit display names to `A-Z`, `a-z`, `0-9` and `_`.
  Uppercase stays allowed because names are shown as typed. Unicode has
  look-alike letters, such as a Cyrillic `а` that looks exactly like a Latin
  `a`, which would get around the case rule.
- **Milestone 3:** when a login uses an unknown email, still run scrypt once
  on a dummy value, so it takes as long as a wrong password. Otherwise the
  response time gives away which emails exist.
- **Milestone 3:** make the `Email` schema trim and lowercase.
- **Milestone 3:** add the list of common passwords to `RegisterRequest`.
  The password maximum of 64 is already in the contract (2026-10-13),
  because the register form needed it. The maximum also stops someone from
  sending a huge password to make hashing slow on purpose. Use about the
  1000 most common passwords: the list is in `shared/`, so it ends up in the
  browser once the frontend validates forms, and a much longer list would
  make every page load heavier.
- **Milestone 3:** compare hashes with `crypto.timingSafeEqual`, not `==`,
  so the time a comparison takes does not leak how much of a hash matched.
- **Tell DevOps:** the backend Docker image uses Node 22, while mise gives
  everyone Node 26 locally. Code that works locally can fail in Docker.
- **Team:** there is no CI yet, so checks and tests only run when someone
  runs them by hand.

## Open questions

Check this list before starting a milestone. When a question is answered,
move it to Decisions (or an ADR) with the date.

- **Q4. Session storage.** Where are login sessions stored, so they survive
  a restart? Goes in a login sessions ADR before milestone 4. ADR 0008
  stays for game sessions and tournaments.
- **Q7. Modules.** Are we doing OAuth and/or 2FA?
- **Q8. Milestone 7.** Who owns authenticated WebSockets?
