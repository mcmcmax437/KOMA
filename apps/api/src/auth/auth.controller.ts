import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { AuthUser } from "./jwt-auth.guard";
import { Public } from "./jwt-auth.guard";

class TelegramAuthDto {
  @IsString()
  @MinLength(10)
  initData!: string;
}

@Controller("api/v1")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post("auth/telegram")
  telegram(@Body() body: TelegramAuthDto) {
    return this.auth.loginWithTelegram(body.initData);
  }

  @Public()
  @Post("auth/dev")
  dev() {
    return this.auth.loginDev();
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.profile(user.id);
  }
}
