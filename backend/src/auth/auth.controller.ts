import { Body, Controller, Post } from "@nestjs/common";
import { RegisterRequest, type User } from "@transcendence/shared/auth";
import { ZodBodyPipe } from "../pipes/zod-body.pipe.js";
import { AuthService } from "./auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) { }

  @Post("register")
  register(@Body(new ZodBodyPipe(RegisterRequest)) body: RegisterRequest): Promise<User> {
    return this.auth.register(body);
  }
}
