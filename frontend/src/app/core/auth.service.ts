import { Service, signal, computed } from "@angular/core";

export interface User {
	username: string;
	email: string;
}



@Service()
export class AuthService {
	currentUser = signal<User | null>(null);
	isLoggedIn = computed(() => this.currentUser() !== null);

	async login(username: string, password: string): Promise<void>
	{
		await new Promise(resolve => setTimeout(resolve, 500));
		if (password != 'password')
		{
			throw new Error('Incorrect Password');
		}
		this.currentUser.set({ username: username, email: `${username}@codam.student.nl`});

	}

	logout(): void {
		this.currentUser.set(null);
	}

}
