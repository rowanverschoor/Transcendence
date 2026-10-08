import { Component, inject, signal } from "@angular/core";
import { AuthService } from "../../../core/auth.service";

@Component({
  imports: [],
  selector: "app-login",
  styleUrl: "./login.scss",
  templateUrl: "./login.html",
})
export class Login {
  protected auth = inject(AuthService);

  protected email = signal("");
  protected password = signal("");
  protected submitted = signal(false);
  protected serverError = signal("");

  protected onInput(field: "email" | "password", event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this[field].set(value);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);
    this.serverError.set("");

    if (!this.email() || !this.password()) {
      return;
    }

    try {
      await this.auth.login(this.email(), this.password());
    } catch (e) {
      this.serverError.set((e as Error).message);
    }
  }
}
