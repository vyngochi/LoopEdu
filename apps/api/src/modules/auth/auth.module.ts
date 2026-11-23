import { Global, Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccessTokenService } from './access-token.service.js';
import { AuthController, MeController } from './auth.controller.js';
import { AuthMailer } from './auth.mailer.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';

// Global because the app-wide JwtAuthGuard (registered in AppModule) needs AuthService.
@Global()
@Module({
  // In-memory counter, per process: enough for one API instance (staging, beta). shortcut: move to a shared store when scaling out.
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])],
  controllers: [AuthController, MeController],
  providers: [AuthService, AuthRepository, AccessTokenService, AuthMailer],
  exports: [AuthService],
})
export class AuthModule {}
