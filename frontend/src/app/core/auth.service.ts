import { Service, signal, computed } from "@angular/core";

export interface User {
	displayName: string;
	email: string;
}



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
		// Fake: the real display name comes from the server (auth milestone 5)
		this.currentUser.set({ displayName: 'Stub User', email: email});

	}

	logout(): void {
		this.currentUser.set(null);
	}

}
