import { Component, inject } from "@angular/core";
import { AuthService } from "../../../core/auth.service";

@Component({
  imports: [],
  selector: "app-login",
  styleUrl: "./login.scss",
  templateUrl: "./login.html",
})
export class Login {
  protected auth = inject(AuthService);
}
