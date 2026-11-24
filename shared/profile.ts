import { z } from "zod";
import { DisplayName, Email, UserId } from "@transcendence/shared/auth";

// Don't trust the types to keep private fields out of a public response.
// TypeScript allows extra fields: a function returning PublicProfile can still
// return a PrivateProfile, a { ...me } copy or a database row, with the email
// (or a password hash) still in it, and it type-checks fine. What protects us
// is that a public endpoint must run its data through PublicProfile.parse(...)
// before sending it: zod drops every field that isn't in the schema.

/** Anyone may read this. Never add private fields here. */
export const PublicProfile = z.object({
  id: UserId,
  displayName: DisplayName,
  /** The server fills in a default avatar URL when none is uploaded. */
  avatarUrl: z.string(),
});

/** Owner only. The server derives the user from the session, never the URL. */
export const PrivateProfile = PublicProfile.extend({
  email: Email,
});

/** PATCH /users/me: only the fields that changed. */
export const UpdateProfileRequest = z.object({
  displayName: DisplayName.optional(),
});

// Avatar upload is multipart, so these are plain limits shared by the browser
// pre-check and the server check.
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type PublicProfile = z.infer<typeof PublicProfile>;
export type PrivateProfile = z.infer<typeof PrivateProfile>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;
