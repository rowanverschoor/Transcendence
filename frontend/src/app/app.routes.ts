import { inject } from '@angular/core';
import { Route, Routes, UrlSegment } from '@angular/router';
import { DisplayName } from '@transcendence/shared/auth';
import { AuthService } from './core/auth.service';
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
		// canonical URL is always profile/<display name>: send "my profile" there (or to login)
		path: 'profile',
		pathMatch: 'full',
		redirectTo: () => {
			const me = inject(AuthService).currentUser();
			return me ? `/profile/${me.displayName}` : '/login';
		},
	},
	{
		// anyone's profile: public profile for all, private profile only if :name is me.
		// A name that can't be a display name doesn't match, so it falls through to ** (NotFound).
		path: 'profile/:name',
		component: Profile,
		canMatch: [(_route: Route, segments: UrlSegment[]) =>
			DisplayName.safeParse(segments[1]?.path).success],
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
