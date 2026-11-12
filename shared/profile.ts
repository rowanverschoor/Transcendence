import { z } from "zod";
import { DisplayName, Email, UserId } from "@transcendence/shared/auth";

// Public vs private is structural: PrivateProfile extends PublicProfile, so a
// public endpoint can't type-check as returning private fields.

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
