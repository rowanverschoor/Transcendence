import { DisplayName, Email, Password } from "@transcendence/shared/auth";
import { Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../../core/auth.service";

@Component({
  imports: [RouterLink],
  selector: "app-register",
  styleUrl: "./register.scss",
  templateUrl: "./register.html",
})

export class Register {
  protected auth = inject(AuthService);

  protected displayName = signal("");
  protected email = signal("");
  protected password = signal ("");
  protected confirmPassword = signal("");

  protected submitted = signal(false);
  protected serverError = signal("");

    protected onInput(field: "displayName" | "email" | "password" | "confirmPassword", event: Event): void {
      const value = (event.target as HTMLInputElement).value;
      this[field].set(value);
    }

    protected displayNameInvalid = computed(() => {
      const name = this.displayName();
      return name.length > 0 && !DisplayName.safeParse(name).success;
    });

    protected emailInvalid = computed(() => {
      const email = this.email().trim();
      return email.length > 0 && !Email.safeParse(email).success;
    });

    protected passwordInvalid = computed(() => {
      const pass = this.password();
      return pass.length > 0 && !Password.safeParse(pass).success;
    });

    protected passwordMismatch = computed(() => {
      const confirm = this.confirmPassword();
      return confirm.length > 0 && confirm !== this.password();
    });

    protected async onSubmit(event: Event): Promise<void> {
      event.preventDefault();
      this.submitted.set(true);
      this.serverError.set("");

    if (!this.displayName() || this.displayNameInvalid()) {
      return;
    }

    if (!this.email() || this.emailInvalid()) {
      return;
    }

    if (!this.password() || this.passwordInvalid()) {
      return;
    }

    if (!this.confirmPassword() || this.passwordMismatch()) {
      return;
    }
  }
}
