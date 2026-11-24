import { inject, Service } from "@angular/core";
import type { PrivateProfile, PublicProfile } from "@transcendence/shared/profile";
import { ApiError } from "./api-error";
import { AuthService } from "./auth.service";

export const FAKE_LATENCY_MS = 5000;
export const DEFAULT_AVATAR_URL = "/default-avatar.svg";

// Fake users, keyed by lowercase name (names are unique ignoring case, docs/auth.md).
// Any other name is a 404, like the real server would answer.
const FAKE_USERS: Record<string, PublicProfile> = {
	"stubuser": { id: "00000000-0000-4000-8000-000000000000", displayName: "StubUser", avatarUrl: DEFAULT_AVATAR_URL },
	"demoplayer": { id: "11111111-1111-4111-8111-111111111111", displayName: "DemoPlayer", avatarUrl: DEFAULT_AVATAR_URL },
};

// Fake network delay. A real fetch gets { signal } and cancels itself instead.
async function fakeLatency(signal: AbortSignal): Promise<void> {
	await new Promise(resolve => setTimeout(resolve, FAKE_LATENCY_MS));
	signal.throwIfAborted();
}

// Stand-in for the backend; each method becomes a fetch later.
@Service()
export class ProfileService {
	private auth = inject(AuthService);

	// GET /users/:displayName. Anyone, no login. Never returns private fields.
	async getPublic(displayName: string, signal: AbortSignal): Promise<PublicProfile> {
		await fakeLatency(signal);
		const profile = FAKE_USERS[displayName.trim().toLowerCase()];
		if (!profile)
			throw new ApiError(404, "User not found");
		return profile;
	}

	// GET /users/me. No name: the server uses the session, so another user's
	// private profile can't even be asked for.
	async getMe(signal: AbortSignal): Promise<PrivateProfile> {
		await fakeLatency(signal);
		const me = this.auth.currentUser();
		if (!me)
			throw new ApiError(401, "Not logged in");
		return { id: me.id, displayName: me.displayName, avatarUrl: DEFAULT_AVATAR_URL, email: me.email };
	}
}
