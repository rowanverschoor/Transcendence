import { z } from "zod";
import { DisplayName } from "@transcendence/shared/auth";
import { PublicProfile } from "@transcendence/shared/profile";

// Friendship needs consent: one user sends a request, the other accepts or
// declines it. Declining deletes the request, so there is no "declined" status.

/** How the logged-in user stands with one other user. */
export const FriendStatus = z.enum([
  "none",
  "friends",
  "send",     // I asked, they haven't answered
  "received", // they asked, I haven't answered
]);

/** GET /friends. Owner only. PublicProfile entries, so no private fields leak. */
export const FriendLists = z.object({
  friends: z.array(PublicProfile),
  send: z.array(PublicProfile),
  received: z.array(PublicProfile),
});

/** POST /friends/requests */
export const SendFriendRequest = z.object({
  displayName: DisplayName,
});

export type FriendStatus = z.infer<typeof FriendStatus>;
export type FriendLists = z.infer<typeof FriendLists>;
export type SendFriendRequest = z.infer<typeof SendFriendRequest>;
