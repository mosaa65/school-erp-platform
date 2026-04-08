import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, UserNotificationType } from '@prisma/client';
import * as argon2 from 'argon2';
import { compare as compareBcrypt } from 'bcrypt';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import { UserNotificationsService } from '../modules/user-notifications/user-notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthMfaService, type TotpSetupResponse } from './auth-mfa.service';
import {
  AuthWebAuthnService,
  type BeginWebAuthnAuthenticationResult,
  type BeginWebAuthnRegistrationResult,
  type WebAuthnCredentialView,
} from './auth-webauthn.service';
import { AuthSecurityService } from './auth-security.service';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const authUserInclude = {
  userRoles: {
    where: {
      deletedAt: null,
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            where: {
              deletedAt: null,
            },
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} as const;

type ActiveSessionRecord = Prisma.UserSessionGetPayload<{
  include: {
    user: {
      include: typeof authUserInclude;
    };
  };
}>;

type AuthenticatedUserRecord = Prisma.UserGetPayload<{
  include: typeof authUserInclude;
}>;

type LoginIdentifier =
  | {
      type: 'email';
      normalized: string;
      where: Prisma.UserWhereInput;
    }
  | {
      type: 'phone';
      normalized: string;
      where: Prisma.UserWhereInput;
    };

export interface AuthResponseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCodes: string[];
  permissionCodes: string[];
}

export interface AuthResponsePayload {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: AuthResponseUser;
}

export interface AuthProfileView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneCountryCode: string | null;
  phoneNationalNumber: string | null;
  phoneE164: string | null;
  webAuthnRequired: boolean;
  hasWebAuthnCredentials: boolean;
}

export interface AuthSessionView {
  id: string;
  deviceId: string | null;
  deviceLabel: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastActivity: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

interface AuthIssueContext {
  ipAddress: string | null;
  userAgent: string | null;
  deviceId: string | null;
  deviceLabel: string | null;
}

interface AuthTokensResult {
  response: AuthResponsePayload;
  refreshToken: string;
  refreshTokenMaxAgeSeconds: number;
  sessionId: string;
}

export interface AuthMfaChallengeResult {
  mfaRequired: true;
  factorType: 'TOTP';
  challengeId: string;
  challengeExpiresInSeconds: number;
}

export interface AuthWebAuthnChallengeResult {
  webauthnRequired: true;
  factorType: 'WEBAUTHN';
  challengeId: string;
  challengeExpiresInSeconds: number;
  options: BeginWebAuthnAuthenticationResult['options'];
}

export type AuthLoginResult =
  | AuthTokensResult
  | AuthMfaChallengeResult
  | AuthWebAuthnChallengeResult;

const DEFAULT_ACCESS_EXPIRES_IN = '15m';
const DEFAULT_REFRESH_EXPIRES_IN = '7d';
const DEFAULT_REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const REFRESH_TOKEN_BYTES = 64;
const DEFAULT_MFA_CHALLENGE_TTL_SECONDS = 5 * 60;

@Injectable()
export class AuthService {
  private readonly accessExpiresIn =
    process.env.JWT_ACCESS_EXPIRES_IN ??
    process.env.JWT_EXPIRES_IN ??
    DEFAULT_ACCESS_EXPIRES_IN;

  private readonly refreshExpiresIn =
    process.env.JWT_REFRESH_EXPIRES_IN ?? DEFAULT_REFRESH_EXPIRES_IN;

  private readonly refreshTokenMaxAgeSeconds = this.parseDurationToSeconds(
    this.refreshExpiresIn,
    DEFAULT_REFRESH_MAX_AGE_SECONDS,
  );

  private readonly mfaChallengeTtlSeconds = this.parseIntEnv(
    'AUTH_MFA_CHALLENGE_TTL_SECONDS',
    DEFAULT_MFA_CHALLENGE_TTL_SECONDS,
  );

  private readonly webAuthnChallengeTtlSeconds = this.parseIntEnv(
    'AUTH_WEBAUTHN_CHALLENGE_TTL_SECONDS',
    300,
  );

  private readonly defaultPhoneRegion = this.resolveDefaultPhoneRegion();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly authSecurityService: AuthSecurityService,
    private readonly authMfaService: AuthMfaService,
    private readonly authWebAuthnService: AuthWebAuthnService,
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  async login(
    loginDto: LoginDto,
    context: AuthIssueContext,
  ): Promise<AuthLoginResult> {
    const rateLimitLoginId = this.extractRateLimitLoginId(loginDto);

    await this.authSecurityService.assertLoginAllowed({
      ipAddress: context.ipAddress,
      loginId: rateLimitLoginId,
      captchaToken: loginDto.captchaToken,
    });

    let loginIdentifier: LoginIdentifier;

    try {
      loginIdentifier = this.resolveLoginIdentifier(loginDto);
    } catch (error) {
      this.authSecurityService.recordLoginFailure({
        ipAddress: context.ipAddress,
        loginId: rateLimitLoginId,
      });
      throw error;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        ...loginIdentifier.where,
        deletedAt: null,
      },
      include: authUserInclude,
    });

    if (!user || !user.isActive) {
      this.authSecurityService.recordLoginFailure({
        ipAddress: context.ipAddress,
        loginId: rateLimitLoginId,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const verification = await this.verifyPassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!verification.matches) {
      this.authSecurityService.recordLoginFailure({
        ipAddress: context.ipAddress,
        loginId: rateLimitLoginId,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const hasTotpMfa = await this.authMfaService.hasEnabledTotp(user.id);

    if (hasTotpMfa && verification.needsRehash) {
      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash: await argon2.hash(loginDto.password),
        },
      });
    }

    if (hasTotpMfa) {
      return this.createMfaChallenge({
        userId: user.id,
        loginId: loginIdentifier.normalized,
        context,
      });
    }

    if (verification.needsRehash) {
      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash: await argon2.hash(loginDto.password),
        },
      });
    }

    if (user.webAuthnRequired) {
      return this.createWebAuthnChallengeForUser(user.id);
    }

    const authTokens = await this.issueTokensForUser({
      user,
      context,
      passwordToRehash: verification.needsRehash ? loginDto.password : null,
      sessionPayload: {
        loginId: loginIdentifier.normalized,
        loginType: loginIdentifier.type,
      },
    });

    this.authSecurityService.recordLoginSuccess({
      ipAddress: context.ipAddress,
      loginId: rateLimitLoginId,
    });

    return authTokens;
  }

  private async createWebAuthnChallengeForUser(
    userId: string,
  ): Promise<AuthWebAuthnChallengeResult> {
    const begin = await this.authWebAuthnService.beginAuthenticationForUser(userId);

    return {
      webauthnRequired: true,
      factorType: 'WEBAUTHN',
      challengeId: begin.challengeId,
      challengeExpiresInSeconds: this.webAuthnChallengeTtlSeconds,
      options: begin.options,
    };
  }

  async verifyMfaChallenge(
    verifyMfaDto: VerifyMfaDto,
  ): Promise<AuthTokensResult> {
    const challenge = await this.prisma.authMfaChallenge.findFirst({
      where: {
        id: verifyMfaDto.challengeId,
        deletedAt: null,
      },
      include: {
        user: {
          include: authUserInclude,
        },
      },
    });

    if (!challenge || challenge.consumedAt) {
      throw new UnauthorizedException('Invalid MFA challenge');
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.prisma.authMfaChallenge.update({
        where: {
          id: challenge.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      throw new UnauthorizedException('MFA challenge expired');
    }

    if (!challenge.user.isActive || challenge.user.deletedAt) {
      throw new UnauthorizedException('Invalid challenge subject');
    }

    try {
      await this.authMfaService.verifyEnabledTotpCode(
        challenge.userId,
        verifyMfaDto.code,
      );
    } catch (error) {
      this.authSecurityService.recordLoginFailure({
        ipAddress: challenge.ipAddress,
        loginId: challenge.loginId ?? challenge.user.email.toLowerCase(),
      });
      throw error;
    }

    const consumedAt = new Date();
    const challengeConsumeResult = await this.prisma.authMfaChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        deletedAt: null,
      },
      data: {
        consumedAt,
      },
    });

    if (challengeConsumeResult.count === 0) {
      throw new UnauthorizedException('Invalid MFA challenge');
    }

    const authTokens = await this.issueTokensForUser({
      user: challenge.user,
      context: {
        ipAddress: this.truncate(challenge.ipAddress, 45),
        userAgent: this.truncate(challenge.userAgent, 255),
        deviceId: this.truncate(challenge.deviceId, 191),
        deviceLabel: this.truncate(challenge.deviceLabel, 191),
      },
      sessionPayload: {
        loginId: challenge.loginId ?? challenge.user.email,
        loginType: 'mfa',
      },
    });

    this.authSecurityService.recordLoginSuccess({
      ipAddress: challenge.ipAddress,
      loginId: challenge.loginId ?? challenge.user.email.toLowerCase(),
    });

    return authTokens;
  }

  async setupTotp(userId: string): Promise<TotpSetupResponse> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid user');
    }

    return this.authMfaService.setupTotp(user.id, user.email);
  }

  async enableTotp(userId: string, code: string): Promise<{ enabled: boolean }> {
    await this.authMfaService.enableTotp(userId, code);

    return {
      enabled: true,
    };
  }

  async disableTotp(
    userId: string,
    code: string,
  ): Promise<{ enabled: boolean }> {
    await this.authMfaService.disableTotp(userId, code);

    return {
      enabled: false,
    };
  }

  async getProfile(userId: string): Promise<AuthProfileView> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneCountryCode: true,
        phoneNationalNumber: true,
        phoneE164: true,
        webAuthnRequired: true,
        isActive: true,
        webAuthnCredentials: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid user');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneCountryCode: user.phoneCountryCode,
      phoneNationalNumber: user.phoneNationalNumber,
      phoneE164: user.phoneE164,
      webAuthnRequired: user.webAuthnRequired,
      hasWebAuthnCredentials: user.webAuthnCredentials.length > 0,
    };
  }

  async updateProfile(
    userId: string,
    payload: UpdateProfileDto,
  ): Promise<AuthProfileView> {
    const phoneInput = this.normalizeProfilePhoneInput(
      payload.phoneCountryCode,
      payload.phoneNationalNumber,
    );

    if (payload.webAuthnRequired) {
      const credentialsCount = await this.prisma.userWebAuthnCredential.count({
        where: {
          userId,
          deletedAt: null,
        },
      });

      if (credentialsCount === 0) {
        throw new BadRequestException('You must register a passkey before enabling it.');
      }
    }

    const updated = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(phoneInput
          ? {
              phoneCountryCode: phoneInput.phoneCountryCode,
              phoneNationalNumber: phoneInput.phoneNationalNumber,
              phoneE164: phoneInput.phoneE164,
            }
          : phoneInput === null
            ? {
                phoneCountryCode: null,
                phoneNationalNumber: null,
                phoneE164: null,
              }
            : {}),
        webAuthnRequired:
          payload.webAuthnRequired === undefined
            ? undefined
            : payload.webAuthnRequired,
        updatedById: userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneCountryCode: true,
        phoneNationalNumber: true,
        phoneE164: true,
        webAuthnRequired: true,
        webAuthnCredentials: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phoneCountryCode: updated.phoneCountryCode,
      phoneNationalNumber: updated.phoneNationalNumber,
      phoneE164: updated.phoneE164,
      webAuthnRequired: updated.webAuthnRequired,
      hasWebAuthnCredentials: updated.webAuthnCredentials.length > 0,
    };
  }

  async beginWebAuthnRegistration(
    userId: string,
  ): Promise<BeginWebAuthnRegistrationResult> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid user');
    }

    const displayName =
      `${user.firstName} ${user.lastName}`.trim() || user.email;

    return this.authWebAuthnService.beginRegistration({
      userId: user.id,
      email: user.email,
      displayName,
    });
  }

  async finishWebAuthnRegistration(input: {
    userId: string;
    challengeId: string;
    response: Record<string, unknown>;
    credentialName?: string;
  }): Promise<WebAuthnCredentialView> {
    return this.authWebAuthnService.verifyRegistration(input);
  }

  async listWebAuthnCredentials(
    userId: string,
  ): Promise<WebAuthnCredentialView[]> {
    return this.authWebAuthnService.listCredentials(userId);
  }

  async removeWebAuthnCredential(
    userId: string,
    credentialId: string,
  ): Promise<void> {
    await this.authWebAuthnService.removeCredential(userId, credentialId);
  }

  async beginWebAuthnAuthentication(): Promise<BeginWebAuthnAuthenticationResult> {
    return this.authWebAuthnService.beginAuthentication();
  }

  async finishWebAuthnAuthentication(
    input: {
      challengeId: string;
      response: Record<string, unknown>;
    },
    context: AuthIssueContext,
  ): Promise<AuthTokensResult> {
    const verification = await this.authWebAuthnService.verifyAuthentication({
      challengeId: input.challengeId,
      response: input.response,
    });

    const user = await this.prisma.user.findFirst({
      where: {
        id: verification.userId,
        deletedAt: null,
      },
      include: authUserInclude,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token subject');
    }

    const authTokens = await this.issueTokensForUser({
      user,
      context,
      sessionPayload: {
        loginId: verification.loginId,
        loginType: 'webauthn',
      },
    });

    this.authSecurityService.recordLoginSuccess({
      ipAddress: context.ipAddress,
      loginId: verification.loginId,
    });

    return authTokens;
  }

  async refresh(
    refreshToken: string,
    context: AuthIssueContext,
  ): Promise<AuthTokensResult> {
    this.authSecurityService.assertRefreshAllowed(context.ipAddress);

    const tokenHash = this.hashRefreshToken(refreshToken);

    const session = await this.prisma.userSession.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        deletedAt: null,
        isRevoked: false,
      },
      include: {
        user: {
          include: authUserInclude,
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.assertSessionActive(session);

    if (!session.user.isActive || session.user.deletedAt) {
      throw new UnauthorizedException('Invalid refresh token subject');
    }

    const { roleCodes, permissionCodes } = this.extractSecurityGrants(
      session.user.userRoles,
    );

    const newRefreshToken = this.generateRefreshToken();
    const newRefreshTokenHash = this.hashRefreshToken(newRefreshToken);
    const now = new Date();
    const newExpiresAt = new Date(
      now.getTime() + this.refreshTokenMaxAgeSeconds * 1000,
    );

    await this.prisma.userSession.update({
      where: {
        id: session.id,
      },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        lastActivity: now,
        expiresAt: newExpiresAt,
        ipAddress: this.truncate(context.ipAddress, 45) ?? session.ipAddress,
        userAgent: this.truncate(context.userAgent, 255) ?? session.userAgent,
        deviceId: this.truncate(context.deviceId, 191) ?? session.deviceId,
        deviceLabel:
          this.truncate(context.deviceLabel, 191) ?? session.deviceLabel,
        updatedById: session.userId,
      },
    });

    const accessToken = await this.buildAccessToken({
      userId: session.user.id,
      email: session.user.email,
      sessionId: session.id,
    });

    return {
      response: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: this.accessExpiresIn,
        user: {
          id: session.user.id,
          email: session.user.email,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          roleCodes,
          permissionCodes,
        },
      },
      refreshToken: newRefreshToken,
      refreshTokenMaxAgeSeconds: this.refreshTokenMaxAgeSeconds,
      sessionId: session.id,
    };
  }

  async logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    await this.prisma.userSession.updateMany({
      where: {
        refreshTokenHash,
        deletedAt: null,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'manual_logout',
        refreshTokenHash: null,
      },
    });
  }

  async listActiveSessions(
    userId: string,
    currentSessionId: string | null,
  ): Promise<AuthSessionView[]> {
    const now = new Date();

    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        deletedAt: null,
        isRevoked: false,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        lastActivity: 'desc',
      },
      select: {
        id: true,
        deviceId: true,
        deviceLabel: true,
        ipAddress: true,
        userAgent: true,
        lastActivity: true,
        expiresAt: true,
      },
    });

    return sessions.map((session) => ({
      ...session,
      isCurrent: currentSessionId === session.id,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await this.prisma.userSession.updateMany({
      where: {
        id: sessionId,
        userId,
        deletedAt: null,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'revoked_by_user',
        refreshTokenHash: null,
        updatedById: userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Session not found');
    }
  }

  private async issueTokensForUser(input: {
    user: AuthenticatedUserRecord;
    context: AuthIssueContext;
    sessionPayload: Record<string, unknown>;
    passwordToRehash?: string | null;
  }): Promise<AuthTokensResult> {
    const normalizedDeviceId = this.truncate(input.context.deviceId, 191);

    const isKnownDevice =
      normalizedDeviceId === null
        ? false
        : (await this.prisma.userSession.findFirst({
            where: {
              userId: input.user.id,
              deviceId: normalizedDeviceId,
              deletedAt: null,
            },
            select: {
              id: true,
            },
          })) !== null;

    const shouldNotifyNewDevice = Boolean(
      input.user.lastLoginAt && normalizedDeviceId && !isKnownDevice,
    );

    const { roleCodes, permissionCodes } = this.extractSecurityGrants(
      input.user.userRoles,
    );

    const now = new Date();
    const sessionId = randomUUID();
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(
      now.getTime() + this.refreshTokenMaxAgeSeconds * 1000,
    );

    const passwordHashToPersist = input.passwordToRehash
      ? await argon2.hash(input.passwordToRehash)
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: input.user.id,
        },
        data: {
          lastLoginAt: now,
          ...(passwordHashToPersist
            ? {
                passwordHash: passwordHashToPersist,
              }
            : {}),
        },
      });

      await tx.userSession.create({
        data: {
          id: sessionId,
          userId: input.user.id,
          ipAddress: this.truncate(input.context.ipAddress, 45),
          userAgent: this.truncate(input.context.userAgent, 255),
          payload: this.stringifySessionPayload(input.sessionPayload),
          lastActivity: now,
          expiresAt,
          refreshTokenHash,
          deviceId: normalizedDeviceId,
          deviceLabel: this.truncate(input.context.deviceLabel, 191),
          createdById: input.user.id,
          updatedById: input.user.id,
        },
      });
    });

    if (shouldNotifyNewDevice) {
      await this.notifyNewDeviceLogin(input.user.id, {
        ipAddress: this.truncate(input.context.ipAddress, 45),
        userAgent: this.truncate(input.context.userAgent, 255),
        deviceId: normalizedDeviceId,
        deviceLabel: this.truncate(input.context.deviceLabel, 191),
      });
    }

    const accessToken = await this.buildAccessToken({
      userId: input.user.id,
      email: input.user.email,
      sessionId,
    });

    return {
      response: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: this.accessExpiresIn,
        user: {
          id: input.user.id,
          email: input.user.email,
          firstName: input.user.firstName,
          lastName: input.user.lastName,
          roleCodes,
          permissionCodes,
        },
      },
      refreshToken,
      refreshTokenMaxAgeSeconds: this.refreshTokenMaxAgeSeconds,
      sessionId,
    };
  }

  private async createMfaChallenge(input: {
    userId: string;
    loginId: string;
    context: AuthIssueContext;
  }): Promise<AuthMfaChallengeResult> {
    const expiresAt = new Date(Date.now() + this.mfaChallengeTtlSeconds * 1000);
    const challenge = await this.prisma.authMfaChallenge.create({
      data: {
        userId: input.userId,
        factorType: 'TOTP',
        loginId: this.truncate(input.loginId.toLowerCase(), 191),
        ipAddress: this.truncate(input.context.ipAddress, 45),
        userAgent: this.truncate(input.context.userAgent, 255),
        deviceId: this.truncate(input.context.deviceId, 191),
        deviceLabel: this.truncate(input.context.deviceLabel, 191),
        expiresAt,
      },
      select: {
        id: true,
      },
    });

    return {
      mfaRequired: true,
      factorType: 'TOTP',
      challengeId: challenge.id,
      challengeExpiresInSeconds: this.mfaChallengeTtlSeconds,
    };
  }

  private extractRateLimitLoginId(loginDto: LoginDto): string {
    const raw = (loginDto.loginId ?? loginDto.email)?.trim();

    if (!raw) {
      return 'missing_login_id';
    }

    return raw.toLowerCase();
  }

  private resolveLoginIdentifier(loginDto: LoginDto): LoginIdentifier {
    const rawIdentifier = loginDto.loginId?.trim() || loginDto.email?.trim();

    if (!rawIdentifier) {
      throw new BadRequestException('loginId is required');
    }

    if (rawIdentifier.includes('@')) {
      const normalizedEmail = rawIdentifier.toLowerCase();

      return {
        type: 'email',
        normalized: normalizedEmail,
        where: {
          email: normalizedEmail,
        },
      };
    }

    const phoneE164 = this.normalizePhoneToE164(rawIdentifier);
    if (!phoneE164) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      type: 'phone',
      normalized: phoneE164,
      where: {
        phoneE164,
      },
    };
  }

  private normalizePhoneToE164(phoneInput: string): string | null {
    const trimmed = phoneInput.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = trimmed.startsWith('+')
      ? parsePhoneNumberFromString(trimmed)
      : parsePhoneNumberFromString(trimmed, this.defaultPhoneRegion);

    if (!parsed?.isValid()) {
      return null;
    }

    return parsed.number;
  }

  private normalizeProfilePhoneInput(
    phoneCountryCode: string | undefined,
    phoneNationalNumber: string | undefined,
  ): {
    phoneCountryCode: string;
    phoneNationalNumber: string;
    phoneE164: string;
  } | null | undefined {
    const hasCountry = phoneCountryCode !== undefined;
    const hasNational = phoneNationalNumber !== undefined;

    if (!hasCountry && !hasNational) {
      return undefined;
    }

    if (!hasCountry || !hasNational) {
      throw new BadRequestException(
        'Both phoneCountryCode and phoneNationalNumber are required together',
      );
    }

    const rawCountryCode = phoneCountryCode?.trim() ?? '';
    const rawNationalNumber = phoneNationalNumber?.trim() ?? '';

    if (!rawCountryCode && !rawNationalNumber) {
      return null;
    }

    if (!rawCountryCode || !rawNationalNumber) {
      throw new BadRequestException('Invalid phone number');
    }

    const normalizedCountryCode = rawCountryCode.startsWith('+')
      ? rawCountryCode
      : `+${rawCountryCode}`;
    const normalizedNationalNumber = rawNationalNumber.replace(/\D+/g, '');

    if (!normalizedNationalNumber) {
      throw new BadRequestException('Invalid phone number');
    }

    const parsed = parsePhoneNumberFromString(
      `${normalizedCountryCode}${normalizedNationalNumber}`,
      this.defaultPhoneRegion,
    );

    if (!parsed?.isValid()) {
      throw new BadRequestException('Invalid phone number');
    }

    return {
      phoneCountryCode: normalizedCountryCode,
      phoneNationalNumber: normalizedNationalNumber,
      phoneE164: parsed.number,
    };
  }

  private resolveDefaultPhoneRegion(): CountryCode {
    const configuredValue = process.env.AUTH_DEFAULT_PHONE_REGION
      ?.trim()
      .toUpperCase();

    if (configuredValue && /^[A-Z]{2}$/.test(configuredValue)) {
      return configuredValue as CountryCode;
    }

    return 'YE';
  }

  private async verifyPassword(
    rawPassword: string,
    passwordHash: string,
  ): Promise<{ matches: boolean; needsRehash: boolean }> {
    if (passwordHash.startsWith('$argon2')) {
      const matches = await argon2.verify(passwordHash, rawPassword);
      return {
        matches,
        needsRehash: false,
      };
    }

    const matches = await compareBcrypt(rawPassword, passwordHash);

    return {
      matches,
      needsRehash: matches,
    };
  }

  private async buildAccessToken(payload: {
    userId: string;
    email: string;
    sessionId: string;
  }): Promise<string> {
    return this.jwtService.signAsync({
      sub: payload.userId,
      email: payload.email,
      sid: payload.sessionId,
    });
  }

  private extractSecurityGrants(
    userRoles: Array<{
      role: {
        code: string;
        isActive: boolean;
        deletedAt: Date | null;
        rolePermissions: Array<{
          permission: {
            code: string;
            deletedAt: Date | null;
          };
        }>;
      };
    }>,
  ): { roleCodes: string[]; permissionCodes: string[] } {
    const roleCodes: string[] = [];
    const permissionCodes = new Set<string>();

    for (const userRole of userRoles) {
      if (!userRole.role.isActive || userRole.role.deletedAt) {
        continue;
      }

      roleCodes.push(userRole.role.code);

      for (const rolePermission of userRole.role.rolePermissions) {
        if (!rolePermission.permission.deletedAt) {
          permissionCodes.add(rolePermission.permission.code);
        }
      }
    }

    return {
      roleCodes,
      permissionCodes: [...permissionCodes],
    };
  }

  private parseDurationToSeconds(value: string, fallback: number): number {
    const normalized = value.trim().toLowerCase();

    if (/^\d+$/.test(normalized)) {
      return Number(normalized);
    }

    const matched = normalized.match(/^(\d+)([smhd])$/);
    if (!matched) {
      return fallback;
    }

    const amount = Number(matched[1]);
    const unit = matched[2];

    switch (unit) {
      case 's':
        return amount;
      case 'm':
        return amount * 60;
      case 'h':
        return amount * 60 * 60;
      case 'd':
        return amount * 60 * 60 * 24;
      default:
        return fallback;
    }
  }

  private parseIntEnv(key: string, fallback: number): number {
    const rawValue = process.env[key]?.trim();
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private truncate(
    value: string | null | undefined,
    maxLength: number,
  ): string | null {
    if (!value) {
      return null;
    }

    return value.slice(0, maxLength);
  }

  private stringifySessionPayload(payload: Record<string, unknown>): string {
    return JSON.stringify(payload);
  }

  private async notifyNewDeviceLogin(
    userId: string,
    context: {
      ipAddress: string | null;
      userAgent: string | null;
      deviceId: string | null;
      deviceLabel: string | null;
    },
  ): Promise<void> {
    const subject = context.deviceLabel ?? context.deviceId ?? 'Unknown device';
    const messageParts = [`New login detected from ${subject}.`];

    if (context.ipAddress) {
      messageParts.push(`IP: ${context.ipAddress}`);
    }

    if (context.userAgent) {
      messageParts.push(`Agent: ${context.userAgent}`);
    }

    try {
      await this.userNotificationsService.createForUser({
        userId,
        title: 'New device login',
        message: messageParts.join(' '),
        notificationType: UserNotificationType.WARNING,
        resource: 'auth',
        actionUrl: '/app/profile',
        triggeredByUserId: userId,
      });
    } catch {
      // Login should not fail if notifications fail.
    }
  }

  private assertSessionActive(session: ActiveSessionRecord): void {
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (session.isRevoked || session.deletedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  getRefreshTokenMaxAgeSeconds(): number {
    return this.refreshTokenMaxAgeSeconds;
  }
}
