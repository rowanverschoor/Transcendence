import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth contract: what crosses the wire for register and login.
//
// Only rules that are already decided in docs/auth.md are encoded here.
// Email and password rules tighten in auth milestone 3.
// ---------------------------------------------------------------------------

export const UserId = z.uuid();

const Email = z.email();
const DisplayName = z.string().min(3).max(32);

// --- Client -> server --------------------------------------------------------

export const RegisterRequest = z.object({
  email: Email,
  displayName: DisplayName,
  password: z.string().min(8),
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
