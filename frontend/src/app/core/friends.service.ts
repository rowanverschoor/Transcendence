import { inject, Service } from "@angular/core";
import type { FriendLists, FriendStatus } from "@transcendence/shared/friends";
import { ApiError } from "./api-error";
import { AuthService } from "./auth.service";
import { fakeLatency, FAKE_USERS } from "./profile.service";

export const FRIENDS_LATENCY_MS = 300;

// Stand-in for the backend; each method becomes a fetch later.
// Fake: one shared state, seen from the logged-in user's side (other user's id -> status).
@Service()
export class FriendsService {
	private auth = inject(AuthService);
	private states = new Map<string, FriendStatus>([
		[FAKE_USERS["demoplayer"].id, "friends"],
		[FAKE_USERS["alice"].id, "received"],
	]);

	// GET /friends. Owner only.
	list(signal: AbortSignal): Promise<FriendLists> {
		return this.run(signal, () => {
			const lists: FriendLists = { friends: [], send: [], received: [] };
			for (const user of Object.values(FAKE_USERS)) {
				const status = this.states.get(user.id);
				if (status && status !== "none")
					lists[status].push(user);
			}
			return lists;
		});
	}

	statusWith(name: string, signal: AbortSignal): Promise<FriendStatus> {
		return this.run(signal, () => this.states.get(this.target(name)) ?? "none");
	}

	// POST /friends/requests. If they already asked me, this accepts.
	sendRequest(name: string, signal: AbortSignal): Promise<void> {
		return this.run(signal, () => {
			const id = this.target(name);
			const status = this.states.get(id) ?? "none";
			if (status === "received")
				this.states.set(id, "friends");
			else if (status === "none")
				this.states.set(id, "send");
			else
				throw new ApiError(409, "Already pending or friends");
		});
	}

	accept = (name: string, signal: AbortSignal) => this.change(name, signal, "received", "friends");
	decline = (name: string, signal: AbortSignal) => this.change(name, signal, "received", null);
	cancel = (name: string, signal: AbortSignal) => this.change(name, signal, "send", null);
	unfriend = (name: string, signal: AbortSignal) => this.change(name, signal, "friends", null);

	// 409 means the state changed under the caller (stale page, double click).
	private change(name: string, signal: AbortSignal, from: FriendStatus, to: FriendStatus | null): Promise<void> {
		return this.run(signal, () => {
			const id = this.target(name);
			if (this.states.get(id) !== from)
				throw new ApiError(409, "Request is no longer in that state");
			if (to)
				this.states.set(id, to);
			else
				this.states.delete(id);
		});
	}

	// Waits, then checks the signal, then runs fn: an aborted request mutates nothing.
	private async run<T>(signal: AbortSignal, fn: () => T): Promise<T> {
		await fakeLatency(signal, FRIENDS_LATENCY_MS);
		if (!this.auth.currentUser())
			throw new ApiError(401, "Not logged in");
		return fn();
	}

	// Name -> user id. 404 unknown, 400 if it's me.
	private target(name: string): string {
		const user = FAKE_USERS[name.trim().toLowerCase()];
		if (!user)
			throw new ApiError(404, "User not found");
		if (user.id === this.auth.currentUser()!.id)
			throw new ApiError(400, "That is you");
		return user.id;
	}
}
