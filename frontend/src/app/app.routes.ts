import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { Profile } from './features/profile/profile';
import { Login } from './features/auth/login/login';

export const routes: Routes = [
	{
		path: '',
		component: Home,
	},
	{
		path: 'user-profile',
		component: Profile,
	},
	{
		path: 'login',
		component: Login,
	}
];
