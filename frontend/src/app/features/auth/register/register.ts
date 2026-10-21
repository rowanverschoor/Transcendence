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

    protected displayNameError = computed(() => {
      const name = this.displayName();
      if (name.length === 0) return "Please enter a display name";
      const result = DisplayName.safeParse(name);
      return result.success ? "" : result.error.issues[0].message;
    });

    protected emailError = computed(() => {
      const email = this.email();
      if (email.length === 0) return "Please enter your email";
      const result = Email.safeParse(email);
      return result.success ? "" : result.error.issues[0].message;
    });

    protected passwordError = computed(() => {
      const pass = this.password();
      if (pass.length === 0) return "Please enter a password";
      const result = Password.safeParse(pass);
      return result.success ? "" : result.error.issues[0].message;
    });

    protected confirmPasswordError = computed(() => {
      const confirm = this.confirmPassword();
      if (confirm.length === 0) return "Please confirm your password";
      return confirm === this.password() ? "" : "Passwords do not match";
    });

    protected async onSubmit(event: Event): Promise<void> {
      event.preventDefault();
      this.submitted.set(true);
      this.serverError.set("");

    if (this.displayNameError()) {
      return;
    }

    if (this.emailError()) {
      return;
    }

    if (this.passwordError()) {
      return;
    }

    if (this.confirmPasswordError()) {
      return;
    }
  }
}
