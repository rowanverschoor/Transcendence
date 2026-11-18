# Friends feature plan

Request, then accept or decline. Fake backend first (like `ProfileService`), real API later.

Rules:

- Friendship is mutual and needs consent: one user sends a request, the other accepts or declines.
- Declining deletes the request. There is no "declined" state.
- The friends lists are owner-only. They hold `PublicProfile` entries only, so no private fields leak.
- Users are addressed by display name (matches `/profile/:name`), looked up ignoring case.

## 1. Contract: new `shared/friends.ts`

```ts
import { z } from "zod";
import { DisplayName } from "@transcendence/shared/auth";
import { PublicProfile } from "@transcendence/shared/profile";

export const FriendStatus = z.enum(["none", "outgoing", "incoming", "friends"]);

export const FriendLists = z.object({
  friends:  z.array(PublicProfile),
  incoming: z.array(PublicProfile),
  outgoing: z.array(PublicProfile),
});

export const SendFriendRequest = z.object({ displayName: DisplayName });

export type FriendStatus = z.infer<typeof FriendStatus>;
export type FriendLists = z.infer<typeof FriendLists>;
export type SendFriendRequest = z.infer<typeof SendFriendRequest>;
```

Then add `"./friends": "./friends.ts"` to `exports` in `shared/package.json`. Without it the `@transcendence/shared/friends` import fails.

What each piece is for:

- `FriendStatus`: how I stand with one other user, from my point of view.
  - `none`: nothing between us.
  - `outgoing`: I sent a request, no answer yet.
  - `incoming`: they sent me one, I haven't answered. This is where Accept/Decline shows.
  - `friends`: accepted.
- `FriendLists`: response of `GET /friends`. Owner only; the server uses the session, not a name.
- `SendFriendRequest`: body of `POST /friends/requests`.

## 2. Make the fake users reusable in `profile.service.ts`

- `export` both `FAKE_USERS` and `fakeLatency`.
- Give `fakeLatency` a second argument `ms = FAKE_LATENCY_MS`, so friends can use a short delay instead of 5 seconds.
- Add a third fake user `alice` (`22222222-2222-4222-8222-222222222222`), so someone can send you a request.

## 3. `core/friends.service.ts` (fake backend)

State is one array of `{ from, to, accepted }` rows. Seed it so StubUser already has a friend (DemoPlayer) and a pending request from Alice. Derive the status from the row:

```ts
private status(me, other): FriendStatus {
  const r = this.find(me, other);          // row between the two, either direction
  if (!r) return "none";
  if (r.accepted) return "friends";
  return r.from === me ? "outgoing" : "incoming";
}
```

Methods, all taking a name and an `AbortSignal`, like `ProfileService`:

| Method | Does | Errors |
|---|---|---|
| `list` | `FriendLists` for me | 401 if logged out |
| `statusWith` | `FriendStatus` | 404 unknown, 400 if it's me |
| `sendRequest` | adds a row, or accepts if they already asked me | 409 if already pending or friends |
| `accept` | sets `accepted = true` | 409 unless status is `incoming` |
| `decline` | removes the row | 409 unless `incoming` |
| `cancel` | removes the row | 409 unless `outgoing` |
| `unfriend` | removes the row | 409 unless `friends` |

Notes:

- Use a short fake latency (about 300 ms) so testing the UI isn't painful.
- 409 means the state changed under the caller (stale page, double click).
- Check the abort signal before mutating, so an aborted request changes nothing.

Write `friends.service.spec.ts` next to it, using fake timers like `profile.service.spec.ts`. Cover:

- list contents for the seeded user
- accept and decline
- the 409 cases (accept something that isn't `incoming`, accept a request I sent myself)
- 401 when logged out
- unknown name 404, own name 400, case-insensitive lookup
- abort changes nothing

## 4. UI in `features/profile`

In `profile.ts`, add two `resource()`s in the style of `privateProfile`:

- `friendStatus`: params are the name when logged in and not on your own page; loader calls `statusWith`.
- `friendLists`: params are the name only when `isOwnProfile()`; loader calls `list`.
- An `act(action, name)` method that calls the service, then `.reload()`s both resources. Disable the buttons while it runs, and show an error if it fails.

In `profile.html`, put the friend controls inside the `publicProfile.hasValue()` branch (so `publicProfile.value()` is narrowed) and show a button by status:

- `none`: "Add friend"
- `outgoing`: "Cancel request"
- `incoming`: "Accept" and "Decline"
- `friends`: "Remove friend"

On your own page, add a section with:

- incoming requests (Accept / Decline)
- outgoing requests (Cancel)
- the friends list (Remove)

Link each name to `/profile/:name`. Styling: `btn btn--primary` for Accept, `btn btn--ghost` for the rest.

## 5. Finish

- Add `FriendsService` to the profile spec if the component test needs it.
- Update the interaction row in `docs/module_track.md`. Friends would be done; chat is still missing, so the major module stays partly done.

## Later (needs a real backend)

- Real persistence and user lookup by id.
- Online/offline presence over the Socket.IO gateway.
- Inviting a friend to a game.
