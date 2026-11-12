import { Component, computed, inject, input, resource } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ApiError } from "../../core/api-error";
import { AuthService } from "../../core/auth.service";
import { ProfileService } from "../../core/profile.service";

@Component({
  imports: [RouterLink],
  selector: "app-profile",
  styleUrl: "./profile.scss",
  templateUrl: "./profile.html",
})
export class Profile {
  private auth = inject(AuthService);
  private profiles = inject(ProfileService);

  // From the route (profile/:name); /profile redirects to /profile/<my name>.
  readonly name = input<string>();

  // Names are unique ignoring case, so comparing them that way is safe.
  protected isOwnProfile = computed(() => {
    const me = this.auth.currentUser()?.displayName.toLowerCase();
    return me !== undefined && me === this.name()?.trim().toLowerCase();
  });

  // Public: keyed by the viewed name only; login state doesn't matter.
  protected publicProfile = resource({
    params: () => this.name(),
    loader: ({ params: name, abortSignal }) => this.profiles.getPublic(name, abortSignal),
  });

  // Private: exists only on my own page. Logout or a user switch re-keys it,
  // which aborts the load and drops the value.
  protected privateProfile = resource({
    params: () => (this.isOwnProfile() ? this.name() : undefined),
    loader: ({ abortSignal }) => this.profiles.getMe(abortSignal),
  });

  protected notFound = computed(() => {
    const error = this.publicProfile.error();
    return error instanceof ApiError && error.status === 404;
  });
}
