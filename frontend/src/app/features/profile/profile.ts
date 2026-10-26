import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth.service";

@Component({
  imports: [RouterLink],
  selector: "app-profile",
  styleUrl: "./profile.scss",
  templateUrl: "./profile.html",
})
export class Profile {
  protected auth = inject(AuthService);
}
