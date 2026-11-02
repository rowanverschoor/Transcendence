import { Service, signal } from "@angular/core";
import type { UserId } from "@transcendence/shared/auth";
import type { PlayerStats } from "@transcendence/shared/stats";

@Service()
export class StatsService {
	stats = signal<PlayerStats | null>(null);

	async load(userId: UserId): Promise<void>
	{
			await new Promise(resolve => setTimeout(resolve, 500));
			// Fake: the real numbers come from the server keyed by userId
			console.debug("stats loaded for", userId);
			this.stats.set({
					ballsConsumed: 42,
			});
	}

	clear(): void {
			this.stats.set(null);
	}
}
