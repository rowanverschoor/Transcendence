import {Component} from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: `
    :host {
      color: #a144eb;
    }
  `,
})

export class App {
  city = 'San Fransico';
}
