import { Service, signal, computed } from "@angular/core";
import type { User } from "@transcendence/shared/auth";



@Service()
export class AuthService {
	currentUser = signal<User | null>(null);
	isLoggedIn = computed(() => this.currentUser() !== null);

	async login(email: string, password: string): Promise<void>
	{
		await new Promise(resolve => setTimeout(resolve, 500));
		if (password != 'password')
		{
			throw new Error('Incorrect Password');
		}
		// Fake: the real id and display name come from the server (auth milestone 5)
		this.currentUser.set({
			id: '00000000-0000-4000-8000-000000000000',
			displayName: 'Stub User',
			email: email,
		});

	}

	logout(): void {
		this.currentUser.set(null);
	}

}
