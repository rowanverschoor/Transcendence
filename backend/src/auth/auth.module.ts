import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { CredentialsRepository } from "./credentials.repository.js";
import { InMemoryCredentialsRepository } from "./in-memory-credentials.repository.js";
import { PasswordHasher } from "./password-hasher.js";

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    { provide: CredentialsRepository, useClass: InMemoryCredentialsRepository },
    PasswordHasher,
    AuthService,
  ],
})
export class AuthModule { }
