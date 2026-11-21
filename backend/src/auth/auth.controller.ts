import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { LoginRequest, RegisterRequest, type User } from "@transcendence/shared/auth";
import { ZodBodyPipe } from "../pipes/zod-body.pipe.js";
import { AuthService } from "./auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) { }

  @Post("register")
  register(@Body(new ZodBodyPipe(RegisterRequest)) body: RegisterRequest): Promise<User> {
    return this.auth.register(body);
  }

  // NestJS answers 201 for every POST by default, but login creates nothing.
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodBodyPipe(LoginRequest)) body: LoginRequest): Promise<User> {
    return this.auth.login(body);
  }
}
