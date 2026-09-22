import {Component} from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `<nav>
  <a routerLink="/">Home</a>
  <a routerLink="/profile">Profile</a>
  <a routerLink="/game">Game</a>
  <a routerLink="/login">Login</a>
  <a routerLink="/register">Register</a>
  <a routerLink="/privacy">Privacy</a>
  <a routerLink="/terms">Terms</a>
</nav>
<router-outlet />`,
  styles: `
    :host {
      color: #a144eb;
    }
  `,
})
export class App {}
