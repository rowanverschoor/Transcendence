import { z } from "zod";
import { COMMON_PASSWORDS } from "./common-passwords";

// ---------------------------------------------------------------------------
// Auth contract: what crosses the wire for register and login.
//
// Only rules that are already decided in docs/auth.md are encoded here.
// ---------------------------------------------------------------------------

export const UserId = z.uuidv4();

// Single fields, exported so a form can check one field at a time.
export const Email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

export const DisplayName = z
  .string()
  .trim()
  .min(3, "Display name must be at least 3 characters")
  .max(32, "Display name can be at most 32 characters")
  .regex(/^[A-Za-z0-9_]+$/, "Only letters, numbers and _ are allowed");

export const Password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(64, "Password can be at most 64 characters")
  .refine((password) => !COMMON_PASSWORDS.has(password.toLowerCase()), "This password is too common");

// --- Client -> server --------------------------------------------------------

export const RegisterRequest = z.object({
  email: Email,
  displayName: DisplayName,
  password: Password,
});

export const LoginRequest = z.object({
  email: Email,
  password: z.string().min(1),
});

// --- Server -> client --------------------------------------------------------

/** The safe view of an account. NEVER contains the password or its hash. */
export const User = z.object({
  id: UserId,
  email: Email,
  displayName: DisplayName,
});

// --- Inferred types ----------------------------------------------------------

export type UserId = z.infer<typeof UserId>;
export type RegisterRequest = z.infer<typeof RegisterRequest>;
export type LoginRequest = z.infer<typeof LoginRequest>;
export type User = z.infer<typeof User>;
