# Authentication

Living document for the auth work: how auth works in this project, what we
have assumed, and what is still undecided. Update it in the same PR whenever
a decision changes or a milestone is finished.

Owner: a0f. Last updated: 2026-10-08.

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
uses its `User` type. Nothing talks to the backend yet.

## Roadmap

Each milestone is one PR, unless it is too big to review well, then it is
split into PRs that each work on their own. The individual changes inside
a milestone are planned when we start it, not before.

### 1. Frontend stub (done)
- **Goal:** login and register pages using a fake `AuthService`, logging in by email.
- **Done when:** you can log in and out in the browser and the page shows the
  current user. No backend involved.
- **Watch out:** nothing open.

### 2. Shared auth contract (in review)
- **Goal:** request and response types for register and login live in
  `shared/`, imported by both frontend and backend.
- **Done when:** the contract is in `shared/` and the frontend compiles
  against it. The backend starts using it in milestone 3.
- **Watch out:** nothing open. User IDs are decided, see Decisions.

### 3. Backend auth module
- **Goal:** register and login endpoints in NestJS, password hashing, input
  validation. Users are stored in memory behind a `UsersRepository` interface.
- **Done when:** you can register and log in over HTTP, and wrong passwords
  and invalid input are rejected. Tests pass.
- **Watch out:** keep the password hash out of the main user record, and keep
  "check the password" separate from "start a session". Both make OAuth
  easier to add later.
- **PRs:** about 550 lines of code and tests, too much for one review, so it
  is split by feature:
  - **Before:** the `@Inject` check (its own PR, see Follow-ups) and the
    contract changes in `shared/auth.ts` (its own PR).
  - **3a. Register:** Vitest in the backend, the zod validation pipe, the
    users store, password hashing and `POST /auth/register`. Sets the
    pattern other endpoints will copy.
  - **3b. Login:** checking the password, the same answer and timing for
    unknown emails, and `POST /auth/login`.

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
- User IDs are UUID v4, generated by the backend. Unguessable IDs are not a
  security measure, permission checks still apply. (2026-10-07, v4 in the
  contract since 2026-10-08)
- The shared contract is a set of zod schemas in `shared/auth.ts`, the same
  way `shared/protocol.ts` does it for the game. One definition gives both
  the TypeScript type and the runtime check, for frontend and backend. This
  means milestone 3 validates input with zod, not with NestJS's default
  class-validator. (2026-10-07)
- Display names are 3 to 32 characters. (2026-10-07)
- Register requires a password of at least 8 characters. Login only requires
  a non-empty password. The length rule applies when a password is chosen, so
  if the rules get stricter later, older passwords still work. (2026-10-07)
- Password rules follow NIST SP 800-63B, loosened on length: at least 8 and
  at most 64 characters, no rules about uppercase, digits or symbols, and the
  most common passwords are refused. Rules like "one uppercase, one symbol"
  mostly lead to `Password1!` and block long passphrases. NIST asks for 15
  characters when the password is the only factor, we chose 8 because the app
  holds no sensitive data. (2026-10-08)
- In the backend, every constructor parameter gets `@Inject(...)`, for
  example `constructor(@Inject(AuthService) private auth: AuthService)`.
  NestJS normally works out what to pass in from the parameter types, which
  the TypeScript compiler saves as extra data (`emitDecoratorMetadata`). Our
  backend runs with `tsx`, which strips types without saving that data, so
  without `@Inject` the parameter is silently `undefined`. There is no error
  at startup, only a crash when a request uses it. An automatic check finds
  any missing `@Inject` (see Follow-ups), so this does not depend on people
  remembering it. We looked at switching runners instead: the NestJS CLI with
  SWC needs a build step for the backend and `shared/` and a Dockerfile
  change, and `@swc-node/register` is smaller but adds a native dependency
  to production and needs testing. That is a choice for whoever owns the
  backend tooling, and code with `@Inject` keeps working after a switch.
  (2026-10-08)
- Passwords are hashed with scrypt, using Node's built-in `crypto.scrypt`,
  with a random salt per user. Hashing happens only in the backend, the
  frontend sends the password as typed over HTTPS. OWASP ranks Argon2id
  first and scrypt second. Node only has Argon2 built in from version 24,
  and our backend Docker image runs Node 22, so Argon2id would mean a Docker
  change or an extra package that needs a native build. scrypt needs
  neither, and scrypt is secure enough for this project. (2026-10-08)
- Backend tests use Vitest, the same tool the frontend uses. It handles
  TypeScript and ES modules without extra setup, and it translates code the
  same way our backend runs, so a missing `@Inject` breaks in tests just like
  it does for real (checked 2026-10-08). Jest, which the NestJS docs use,
  needs extra setup, and with `ts-jest` the tests would pass even when an
  `@Inject` is missing. (2026-10-08)
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
- **Milestone 3:** add the password maximum of 64 and the list of common
  passwords to `RegisterRequest`. The maximum also stops someone from
  sending a huge password to make hashing slow on purpose. Use about the
  1000 most common passwords: the list is in `shared/`, so it ends up in the
  browser once the frontend validates forms, and a much longer list would
  make every page load heavier.
- **Milestone 3:** compare hashes with `crypto.timingSafeEqual`, not `==`,
  so the time a comparison takes does not leak how much of a hash matched.
- **Tell DevOps:** the backend Docker image uses Node 22, while mise gives
  everyone Node 26 locally. Code that works locally can fail in Docker.
- **Team:** there is no CI yet, so checks and tests only run when someone
  runs them by hand. Once there is CI, starting the backend is enough to run
  the `@Inject` check.
- **Before milestone 3, separate PR:** add a check at backend startup that
  refuses to start when a backend class has a constructor parameter without
  `@Inject`. It compares the number of constructor parameters with the
  number of `@Inject` labels, for every controller and provider our own
  modules list, so new features are covered without writing a test for
  each. It is its own PR because it protects all backend code, not just
  auth.
- **Milestone 3:** tell Mike about the `@Inject` issue and the runner options
  above, so the team knows the trap and can decide on a switch.

## Open questions

Check this list before starting a milestone. When a question is answered,
move it to Decisions (or an ADR) with the date.

- **Q4. Sessions.** Server-side sessions with cookies, or JWTs? Needs an ADR.
- **Q6. ORM.** Prisma or Drizzle? Decided together with DevOps in ADR 0004.
- **Q7. Modules.** Are we doing OAuth and/or 2FA?
- **Q8. Milestone 7.** Who owns authenticated WebSockets?
