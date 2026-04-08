import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { UserNotificationsModule } from '../modules/user-notifications/user-notifications.module';
import { AuthController } from './auth.controller';
import { AuthMfaService } from './auth-mfa.service';
import { AuthSecurityService } from './auth-security.service';
import { AuthWebAuthnService } from './auth-webauthn.service';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

const jwtSecret =
  process.env.JWT_ACCESS_SECRET?.trim() ||
  process.env.JWT_SECRET?.trim() ||
  'change_me_with_very_strong_secret';
const jwtExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ??
  process.env.JWT_EXPIRES_IN ??
  '15m') as StringValue;

@Module({
  imports: [
    PassportModule,
    UserNotificationsModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        expiresIn: jwtExpiresIn,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AuthSecurityService,
    AuthMfaService,
    AuthWebAuthnService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
