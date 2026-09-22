import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { Profile } from './features/profile/profile';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Game } from './features/game/game';
import { NotFound } from './features/notfound/notfound';
import { Privacy } from './features/legal/privacy/privacy';
import { Terms } from './features/legal/terms/terms';


export const routes: Routes = [
	{
		path: '',
		component: Home,
	},
	{
		// will need profile/:id once backend has users
		path: 'profile',
		component: Profile,
	},
	{
		path: 'login',
		component: Login,
	},
	{
		path: 'register',
		component: Register,
	},
	{
		// will need game/:id once backend can create matches
		path: 'game',
		component: Game,
	},
	{
		path: 'privacy',
		component: Privacy,
	},
	{
		path: 'terms',
		component: Terms,
	},
	{
		path: '**',
		component: NotFound,
	},
];
