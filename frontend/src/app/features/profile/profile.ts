import { Component, effect, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth.service";
import { StatsService } from "../../core/stats.service";

@Component({
  imports: [RouterLink],
  selector: "app-profile",
  styleUrl: "./profile.scss",
  templateUrl: "./profile.html",
})
export class Profile {
  protected auth = inject(AuthService);
  protected stats = inject(StatsService);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) this.stats.load(user.id);
      else this.stats.clear();
    });
  }
}
