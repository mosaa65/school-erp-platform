import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { MfaCodeDto } from './dto/mfa-code.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { WebAuthnAuthenticationVerifyDto } from './dto/webauthn-authentication-verify.dto';
import { WebAuthnRegistrationVerifyDto } from './dto/webauthn-registration-verify.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Authenticate user (email or phone) and issue access + refresh tokens',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Authentication successful',
    schema: {
      example: {
        accessToken: '<jwt>',
        tokenType: 'Bearer',
        expiresIn: '15m',
        user: {
          id: 'clx123...',
          email: 'admin@school.local',
          firstName: 'System',
          lastName: 'Admin',
          roleCodes: ['super_admin'],
          permissionCodes: ['users.read', 'users.create'],
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const loginResult = await this.authService.login(loginDto, {
      ipAddress: this.resolveRequestIp(req),
      userAgent: req.headers['user-agent'] ?? null,
      deviceId: loginDto.deviceId ?? null,
      deviceLabel: loginDto.deviceLabel ?? null,
    });

    if ('mfaRequired' in loginResult) {
      return loginResult;
    }

    if ('webauthnRequired' in loginResult) {
      return loginResult;
    }

    this.setRefreshTokenCookie(
      res,
      loginResult.refreshToken,
      loginResult.refreshTokenMaxAgeSeconds,
    );

    return loginResult.response;
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify MFA challenge and issue access + refresh tokens',
  })
  async verifyMfaChallenge(
    @Body() verifyMfaDto: VerifyMfaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authTokens = await this.authService.verifyMfaChallenge(verifyMfaDto);

    this.setRefreshTokenCookie(
      res,
      authTokens.refreshToken,
      authTokens.refreshTokenMaxAgeSeconds,
    );

    return authTokens.response;
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Generate TOTP secret and setup payload for MFA' })
  async setupMfa(@CurrentUser() currentUser: AuthUser) {
    return this.authService.setupTotp(currentUser.userId);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Enable TOTP MFA for current user' })
  async enableMfa(
    @CurrentUser() currentUser: AuthUser,
    @Body() mfaCodeDto: MfaCodeDto,
  ) {
    return this.authService.enableTotp(currentUser.userId, mfaCodeDto.code);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Disable TOTP MFA for current user' })
  async disableMfa(
    @CurrentUser() currentUser: AuthUser,
    @Body() mfaCodeDto: MfaCodeDto,
  ) {
    return this.authService.disableTotp(currentUser.userId, mfaCodeDto.code);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() currentUser: AuthUser) {
    return this.authService.getProfile(currentUser.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update current user profile (phone/passkey policy)' })
  async updateProfile(
    @CurrentUser() currentUser: AuthUser,
    @Body() payload: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(currentUser.userId, payload);
  }

  @Post('webauthn/registration/options')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Generate WebAuthn registration options for current user' })
  async beginWebAuthnRegistration(@CurrentUser() currentUser: AuthUser) {
    return this.authService.beginWebAuthnRegistration(currentUser.userId);
  }

  @Post('webauthn/registration/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Verify WebAuthn registration and store passkey' })
  async finishWebAuthnRegistration(
    @CurrentUser() currentUser: AuthUser,
    @Body() webAuthnRegistrationVerifyDto: WebAuthnRegistrationVerifyDto,
  ) {
    return this.authService.finishWebAuthnRegistration({
      userId: currentUser.userId,
      challengeId: webAuthnRegistrationVerifyDto.challengeId,
      response: webAuthnRegistrationVerifyDto.response,
      credentialName: webAuthnRegistrationVerifyDto.credentialName,
    });
  }

  @Get('webauthn/credentials')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List current user WebAuthn credentials' })
  async listWebAuthnCredentials(@CurrentUser() currentUser: AuthUser) {
    return this.authService.listWebAuthnCredentials(currentUser.userId);
  }

  @Delete('webauthn/credentials/:credentialId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete one WebAuthn credential for current user' })
  async removeWebAuthnCredential(
    @CurrentUser() currentUser: AuthUser,
    @Param('credentialId') credentialId: string,
  ) {
    await this.authService.removeWebAuthnCredential(
      currentUser.userId,
      credentialId,
    );

    return {
      success: true,
      credentialId,
    };
  }

  @Post('webauthn/authentication/options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate WebAuthn authentication options for login' })
  async beginWebAuthnAuthentication() {
    return this.authService.beginWebAuthnAuthentication();
  }

  @Post('webauthn/authentication/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify WebAuthn authentication and issue access + refresh tokens',
  })
  async finishWebAuthnAuthentication(
    @Body() webAuthnAuthenticationVerifyDto: WebAuthnAuthenticationVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authTokens = await this.authService.finishWebAuthnAuthentication(
      {
        challengeId: webAuthnAuthenticationVerifyDto.challengeId,
        response: webAuthnAuthenticationVerifyDto.response,
      },
      {
        ipAddress: this.resolveRequestIp(req),
        userAgent: req.headers['user-agent'] ?? null,
        deviceId:
          webAuthnAuthenticationVerifyDto.deviceId ??
          this.extractDeviceId(req),
        deviceLabel:
          webAuthnAuthenticationVerifyDto.deviceLabel ??
          this.extractDeviceLabel(req),
      },
    );

    this.setRefreshTokenCookie(
      res,
      authTokens.refreshToken,
      authTokens.refreshTokenMaxAgeSeconds,
    );

    return authTokens.response;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  @ApiOkResponse({
    description: 'Token refresh successful',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.extractRefreshToken(req);

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const authTokens = await this.authService.refresh(refreshToken, {
      ipAddress: this.resolveRequestIp(req),
      userAgent: req.headers['user-agent'] ?? null,
      deviceId: this.extractDeviceId(req),
      deviceLabel: this.extractDeviceLabel(req),
    });

    this.setRefreshTokenCookie(
      res,
      authTokens.refreshToken,
      authTokens.refreshTokenMaxAgeSeconds,
    );

    return authTokens.response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke current refresh token and clear auth cookie' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(this.extractRefreshToken(req));
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
    };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List active sessions for current user' })
  async listSessions(@CurrentUser() currentUser: AuthUser) {
    return this.authService.listActiveSessions(
      currentUser.userId,
      currentUser.sessionId ?? null,
    );
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Revoke one active session for current user' })
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() currentUser: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.revokeSession(currentUser.userId, sessionId);

    if (currentUser.sessionId === sessionId) {
      this.clearRefreshTokenCookie(res);
    }

    return {
      success: true,
      sessionId,
    };
  }

  private resolveRequestIp(request: Request): string | null {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      return forwardedFor.split(',')[0].trim();
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0]?.trim() ?? null;
    }

    return request.ip ?? null;
  }

  private extractRefreshToken(request: Request): string | null {
    const cookieValue = request.cookies?.[this.getRefreshCookieName()];
    if (typeof cookieValue !== 'string' || cookieValue.trim().length === 0) {
      return null;
    }

    return cookieValue;
  }

  private extractDeviceId(request: Request): string | null {
    const headerValue = request.headers['x-device-id'];

    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue.trim();
    }

    return null;
  }

  private extractDeviceLabel(request: Request): string | null {
    const headerValue = request.headers['x-device-label'];

    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue.trim();
    }

    return null;
  }

  private getRefreshCookieName(): string {
    return process.env.AUTH_REFRESH_COOKIE_NAME ?? 'school_erp_refresh_token';
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
    maxAgeSeconds: number,
  ): void {
    response.cookie(this.getRefreshCookieName(), refreshToken, {
      httpOnly: true,
      secure: this.resolveCookieSecure(),
      sameSite: this.resolveCookieSameSite(),
      path: process.env.AUTH_COOKIE_PATH ?? '/',
      maxAge: maxAgeSeconds * 1000,
    });
  }

  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(this.getRefreshCookieName(), {
      httpOnly: true,
      secure: this.resolveCookieSecure(),
      sameSite: this.resolveCookieSameSite(),
      path: process.env.AUTH_COOKIE_PATH ?? '/',
    });
  }

  private resolveCookieSecure(): boolean {
    if (process.env.AUTH_COOKIE_SECURE === 'true') {
      return true;
    }

    if (process.env.AUTH_COOKIE_SECURE === 'false') {
      return false;
    }

    return process.env.NODE_ENV === 'production';
  }

  private resolveCookieSameSite(): 'lax' | 'strict' | 'none' {
    const sameSite = process.env.AUTH_COOKIE_SAMESITE?.toLowerCase();

    if (sameSite === 'strict' || sameSite === 'none' || sameSite === 'lax') {
      return sameSite;
    }

    return 'lax';
  }
}
