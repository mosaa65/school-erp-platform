import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AccountApprovalPurpose,
  AccountApprovalStatus,
  Prisma,
  UserActivationStatus,
  UserNotificationType,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { compare as compareBcrypt } from 'bcrypt';
import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import { AuditLogsService } from '../modules/audit-logs/audit-logs.service';
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
import { ListAccountApprovalRequestsDto } from './dto/list-account-approval-requests.dto';

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

const approvalRequestInclude = {
  user: {
    select: {
      id: true,
      email: true,
      phoneE164: true,
      phoneCountryCode: true,
      phoneNationalNumber: true,
      firstName: true,
      lastName: true,
      guardianId: true,
      employeeId: true,
      activationStatus: true,
      isActive: true,
    },
  },
  approvedByUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
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

type ApprovalRequestRecord = Prisma.AccountApprovalRequestGetPayload<{
  include: typeof approvalRequestInclude;
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

export interface AuthAccountApprovalView {
  id: string;
  userId: string;
  purpose: AccountApprovalPurpose;
  status: AccountApprovalStatus;
  loginId: string | null;
  deviceId: string | null;
  deviceLabel: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    phoneE164: string | null;
    phoneCountryCode: string | null;
    phoneNationalNumber: string | null;
    firstName: string;
    lastName: string;
    guardianId: string | null;
    employeeId: string | null;
    activationStatus: UserActivationStatus;
    isActive: boolean;
  };
  approvedByUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface AuthApprovalListPayload {
  data: AuthAccountApprovalView[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

export interface AuthActivationRequiredResult {
  activationRequired: true;
  loginId: string;
  activationStatus: 'PENDING_INITIAL_PASSWORD';
  initialPasswordExpiresAt: Date | null;
  requiresApproval: boolean;
}

export interface AuthApprovalPendingResult {
  approvalRequired: true;
  purpose: 'FIRST_PASSWORD_SETUP' | 'NEW_DEVICE_LOGIN' | 'PASSWORD_RESET';
  requestId: string;
  expiresAt: Date;
}

export interface AuthDeviceApprovalRequiredResult {
  deviceApprovalRequired: true;
  purpose: 'NEW_DEVICE_LOGIN';
  requestId: string;
  expiresAt: Date;
}

export interface AuthIdentifyResult {
  status: 'ACTIVE_LOGIN' | 'PENDING_ACTIVATION' | 'UNKNOWN_ACCOUNT';
  loginId: string;
  requiresOneTimePassword: boolean;
}

export type AuthLoginResult =
  | AuthTokensResult
  | AuthMfaChallengeResult
  | AuthWebAuthnChallengeResult
  | AuthActivationRequiredResult
  | AuthDeviceApprovalRequiredResult;

const DEFAULT_ACCESS_EXPIRES_IN = '15m';
const DEFAULT_REFRESH_EXPIRES_IN = '7d';
const DEFAULT_REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const REFRESH_TOKEN_BYTES = 64;
const DEFAULT_MFA_CHALLENGE_TTL_SECONDS = 5 * 60;
const DEFAULT_APPROVAL_CODE_TTL_SECONDS = 10 * 60;
const PASSWORD_RESET_PURPOSE = 'PASSWORD_RESET' as AccountApprovalPurpose;

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

  private readonly approvalCodeTtlSeconds = this.parseIntEnv(
    'AUTH_APPROVAL_CODE_TTL_SECONDS',
    DEFAULT_APPROVAL_CODE_TTL_SECONDS,
  );

  private readonly defaultPhoneRegion = this.resolveDefaultPhoneRegion();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly authSecurityService: AuthSecurityService,
    private readonly authMfaService: AuthMfaService,
    private readonly authWebAuthnService: AuthWebAuthnService,
    private readonly userNotificationsService: UserNotificationsService,
    private readonly auditLogsService: AuditLogsService,
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

    if (user.activationStatus === UserActivationStatus.SUSPENDED) {
      this.authSecurityService.recordLoginFailure({
        ipAddress: context.ipAddress,
        loginId: rateLimitLoginId,
      });
      throw new UnauthorizedException('Account suspended');
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

    if (user.activationStatus === UserActivationStatus.PENDING_INITIAL_PASSWORD) {
      if (
        user.initialPasswordExpiresAt &&
        user.initialPasswordExpiresAt.getTime() <= Date.now()
      ) {
        this.authSecurityService.recordLoginFailure({
          ipAddress: context.ipAddress,
          loginId: rateLimitLoginId,
        });
        throw new UnauthorizedException('Initial password expired');
      }

      return {
        activationRequired: true,
        loginId: loginIdentifier.normalized,
        activationStatus: UserActivationStatus.PENDING_INITIAL_PASSWORD,
        initialPasswordExpiresAt: user.initialPasswordExpiresAt,
        requiresApproval: await this.requiresAdminApprovalForInitialActivation(
          user,
        ),
      };
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

    const deviceApproval = await this.createDeviceApprovalIfRequired({
      user,
      loginId: loginIdentifier.normalized,
      context,
    });

    if (deviceApproval) {
      return deviceApproval;
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

  async identifyAccount(loginId: string): Promise<AuthIdentifyResult> {
    const normalizedLoginId = loginId.trim();

    if (!normalizedLoginId) {
      throw new BadRequestException('loginId is required');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        ...(normalizedLoginId.includes('@')
          ? { email: normalizedLoginId.toLowerCase() }
          : { phoneE164: this.normalizePhoneToE164(normalizedLoginId) ?? '__none__' }),
        deletedAt: null,
      },
      select: {
        id: true,
        activationStatus: true,
      },
    });

    if (!user) {
      return {
        status: 'UNKNOWN_ACCOUNT',
        loginId: normalizedLoginId,
        requiresOneTimePassword: false,
      };
    }

    if (user.activationStatus === UserActivationStatus.PENDING_INITIAL_PASSWORD) {
      return {
        status: 'PENDING_ACTIVATION',
        loginId: normalizedLoginId,
        requiresOneTimePassword: true,
      };
    }

    return {
      status: 'ACTIVE_LOGIN',
      loginId: normalizedLoginId,
      requiresOneTimePassword: false,
    };
  }

  async beginAccountActivation(
    input: {
      loginId: string;
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    },
    context: AuthIssueContext,
  ): Promise<AuthTokensResult | AuthApprovalPendingResult> {
    if (input.newPassword !== input.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const loginIdentifier = this.resolveLoginIdentifier({
      loginId: input.loginId,
      password: input.currentPassword,
    } as LoginDto);

    const user = await this.prisma.user.findFirst({
      where: {
        ...loginIdentifier.where,
        deletedAt: null,
      },
      include: authUserInclude,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid activation credentials');
    }

    if (user.activationStatus === UserActivationStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }

    if (user.activationStatus !== UserActivationStatus.PENDING_INITIAL_PASSWORD) {
      throw new ConflictException('Account does not require initial activation');
    }

    if (!user.employeeId && !user.guardianId) {
      throw new ConflictException('Account must be linked to employee or guardian');
    }

    if (
      user.initialPasswordExpiresAt &&
      user.initialPasswordExpiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Initial password expired');
    }

    const verification = await this.verifyPassword(
      input.currentPassword,
      user.passwordHash,
    );

    if (!verification.matches) {
      throw new UnauthorizedException('Invalid activation credentials');
    }

    const pendingPasswordHash = await argon2.hash(input.newPassword);
    const requiresApproval = await this.requiresAdminApprovalForInitialActivation(
      user,
    );

    if (!requiresApproval) {
      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash: pendingPasswordHash,
          activationStatus: UserActivationStatus.ACTIVE,
          passwordSetAt: new Date(),
          initialPasswordIssuedAt: null,
          initialPasswordExpiresAt: null,
        },
      });

      const refreshedUser = await this.prisma.user.findUniqueOrThrow({
        where: {
          id: user.id,
        },
        include: authUserInclude,
      });

      await this.auditLogsService.record({
        actorUserId: user.id,
        action: 'AUTH_FIRST_PASSWORD_SETUP_COMPLETE',
        resource: 'auth-approval-requests',
        resourceId: user.id,
        details: {
          purpose: AccountApprovalPurpose.FIRST_PASSWORD_SETUP,
          loginId: loginIdentifier.normalized,
          mode: 'self_service',
        },
      });

      return this.issueTokensForUser({
        user: refreshedUser,
        context,
        sessionPayload: {
          loginId: loginIdentifier.normalized,
          loginType: 'activation',
        },
      });
    }

    const approvalCode = this.generateApprovalCode();
    const expiresAt = new Date(Date.now() + this.approvalCodeTtlSeconds * 1000);

    const request = await this.upsertApprovalRequest({
      user,
      purpose: AccountApprovalPurpose.FIRST_PASSWORD_SETUP,
      loginId: loginIdentifier.normalized,
      approvalCode,
      pendingPasswordHash,
      context,
    });

    await this.notifyApprovalManagers({
      purpose: AccountApprovalPurpose.FIRST_PASSWORD_SETUP,
      subjectUser: user,
      approvalCode,
      requestId: request.id,
      context,
    });

    await this.auditLogsService.record({
      actorUserId: user.id,
      action: 'AUTH_FIRST_PASSWORD_SETUP_REQUEST_CREATE',
      resource: 'auth-approval-requests',
      resourceId: request.id,
      details: {
        purpose: AccountApprovalPurpose.FIRST_PASSWORD_SETUP,
        loginId: loginIdentifier.normalized,
        approvalCodeExpiresAt: request.expiresAt.toISOString(),
      },
    });

    return {
      approvalRequired: true,
      purpose: 'FIRST_PASSWORD_SETUP',
      requestId: request.id,
      expiresAt: request.expiresAt,
    };
  }

  async completeAccountActivation(
    input: {
      requestId: string;
      approvalCode: string;
    },
    context: AuthIssueContext,
  ): Promise<AuthTokensResult> {
    const request = await this.prisma.accountApprovalRequest.findFirst({
      where: {
        id: input.requestId,
        purpose: AccountApprovalPurpose.FIRST_PASSWORD_SETUP,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        loginId: true,
        pendingPasswordHash: true,
        approvalCodeHash: true,
        expiresAt: true,
        deletedAt: true,
        status: true,
        user: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (
      !request ||
      request.status !== AccountApprovalStatus.APPROVED ||
      request.deletedAt
    ) {
      throw new UnauthorizedException('Invalid activation request');
    }

    if (!request.user.isActive) {
      throw new UnauthorizedException('Invalid activation request');
    }

    if (request.expiresAt.getTime() <= Date.now()) {
      await this.prisma.accountApprovalRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: AccountApprovalStatus.EXPIRED,
        },
      });
      throw new UnauthorizedException('Activation request expired');
    }

    if (!this.verifyApprovalCode(input.approvalCode, request.approvalCodeHash)) {
      throw new UnauthorizedException('Invalid approval code');
    }

    if (!request.pendingPasswordHash) {
      throw new UnauthorizedException('Activation request is incomplete');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: request.userId,
        },
        data: {
          passwordHash: request.pendingPasswordHash!,
          activationStatus: UserActivationStatus.ACTIVE,
          passwordSetAt: new Date(),
          initialPasswordIssuedAt: null,
          initialPasswordExpiresAt: null,
        },
      });

      await tx.accountApprovalRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: AccountApprovalStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    });

    await this.auditLogsService.record({
      actorUserId: request.userId,
      action: 'AUTH_FIRST_PASSWORD_SETUP_COMPLETE',
      resource: 'auth-approval-requests',
      resourceId: request.id,
      details: {
        purpose: AccountApprovalPurpose.FIRST_PASSWORD_SETUP,
        loginId: request.loginId,
      },
    });

    const refreshedUser = await this.prisma.user.findUniqueOrThrow({
      where: {
        id: request.userId,
      },
      include: authUserInclude,
    });

    return this.issueTokensForUser({
      user: refreshedUser,
      context,
      sessionPayload: {
        loginId: request.loginId ?? refreshedUser.email ?? refreshedUser.id,
        loginType: 'activation_approved',
      },
    });
  }

  async beginForgotPasswordReset(
    input: {
      loginId: string;
    },
    context: AuthIssueContext,
  ): Promise<AuthApprovalPendingResult> {
    const loginIdentifier = this.resolveLoginIdentifier({
      loginId: input.loginId,
      password: '__placeholder__',
    } as LoginDto);

    const user = await this.prisma.user.findFirst({
      where: {
        ...loginIdentifier.where,
        deletedAt: null,
      },
      include: authUserInclude,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid account');
    }

    if (user.activationStatus === UserActivationStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }

    if (user.activationStatus === UserActivationStatus.PENDING_INITIAL_PASSWORD) {
      throw new ConflictException('Account must complete initial activation first');
    }

    const approvalCode = this.generateApprovalCode();
    const request = await this.upsertApprovalRequest({
      user,
      purpose: PASSWORD_RESET_PURPOSE,
      loginId: loginIdentifier.normalized,
      approvalCode,
      context,
    });

    await this.notifyApprovalManagers({
      purpose: PASSWORD_RESET_PURPOSE,
      subjectUser: user,
      approvalCode,
      requestId: request.id,
      context,
    });

    await this.auditLogsService.record({
      actorUserId: user.id,
      action: 'AUTH_PASSWORD_RESET_REQUEST_CREATE',
      resource: 'auth-approval-requests',
      resourceId: request.id,
      details: {
        purpose: PASSWORD_RESET_PURPOSE,
        loginId: loginIdentifier.normalized,
        approvalCodeExpiresAt: request.expiresAt.toISOString(),
      },
    });

    return {
      approvalRequired: true,
      purpose: 'PASSWORD_RESET',
      requestId: request.id,
      expiresAt: request.expiresAt,
    };
  }

  async completeForgotPasswordReset(
    input: {
      requestId: string;
      approvalCode: string;
      newPassword: string;
      confirmPassword: string;
    },
    _context: AuthIssueContext,
  ): Promise<{ success: true }> {
    if (input.newPassword !== input.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const request = await this.prisma.accountApprovalRequest.findFirst({
      where: {
        id: input.requestId,
        purpose: PASSWORD_RESET_PURPOSE,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        loginId: true,
        approvalCodeHash: true,
        expiresAt: true,
        deletedAt: true,
        status: true,
        user: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (
      !request ||
      request.status !== AccountApprovalStatus.APPROVED ||
      request.deletedAt
    ) {
      throw new UnauthorizedException('Invalid password reset request');
    }

    if (!request.user.isActive) {
      throw new UnauthorizedException('Invalid password reset request');
    }

    if (request.expiresAt.getTime() <= Date.now()) {
      await this.prisma.accountApprovalRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: AccountApprovalStatus.EXPIRED,
        },
      });
      throw new UnauthorizedException('Password reset request expired');
    }

    if (!this.verifyApprovalCode(input.approvalCode, request.approvalCodeHash)) {
      throw new UnauthorizedException('Invalid approval code');
    }

    const passwordHash = await argon2.hash(input.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: request.userId,
        },
        data: {
          passwordHash,
          passwordSetAt: new Date(),
          initialPasswordIssuedAt: null,
          initialPasswordExpiresAt: null,
        },
      });

      await tx.accountApprovalRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: AccountApprovalStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      await tx.userSession.updateMany({
        where: {
          userId: request.userId,
          deletedAt: null,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'password_reset',
          refreshTokenHash: null,
          updatedById: request.userId,
        },
      });
    });

    await this.auditLogsService.record({
      actorUserId: request.userId,
      action: 'AUTH_PASSWORD_RESET_COMPLETE',
      resource: 'auth-approval-requests',
      resourceId: request.id,
      details: {
        purpose: PASSWORD_RESET_PURPOSE,
        loginId: request.loginId,
      },
    });

    return {
      success: true,
    };
  }

  async changePasswordByCredentials(input: {
    loginId: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: true }> {
    if (input.newPassword !== input.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const loginIdentifier = this.resolveLoginIdentifier({
      loginId: input.loginId,
      password: input.currentPassword,
    } as LoginDto);

    const user = await this.prisma.user.findFirst({
      where: {
        ...loginIdentifier.where,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
        passwordHash: true,
        activationStatus: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.activationStatus === UserActivationStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }

    if (user.activationStatus === UserActivationStatus.PENDING_INITIAL_PASSWORD) {
      throw new ConflictException('Account must complete initial activation first');
    }

    const verification = await this.verifyPassword(
      input.currentPassword,
      user.passwordHash,
    );

    if (!verification.matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordHash = await argon2.hash(input.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash,
          passwordSetAt: new Date(),
          initialPasswordIssuedAt: null,
          initialPasswordExpiresAt: null,
        },
      });

      await tx.userSession.updateMany({
        where: {
          userId: user.id,
          deletedAt: null,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'password_changed',
          refreshTokenHash: null,
          updatedById: user.id,
        },
      });
    });

    await this.auditLogsService.record({
      actorUserId: user.id,
      action: 'AUTH_PASSWORD_CHANGE_BY_CREDENTIALS',
      resource: 'users',
      resourceId: user.id,
      details: {
        loginId: loginIdentifier.normalized,
      },
    });

    return {
      success: true,
    };
  }

  async completeDeviceApproval(
    input: {
      requestId: string;
      approvalCode: string;
    },
    context: AuthIssueContext,
  ): Promise<AuthTokensResult> {
    const request = await this.prisma.accountApprovalRequest.findFirst({
      where: {
        id: input.requestId,
        purpose: AccountApprovalPurpose.NEW_DEVICE_LOGIN,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        loginId: true,
        approvalCodeHash: true,
        deviceId: true,
        deviceLabel: true,
        ipAddress: true,
        userAgent: true,
        expiresAt: true,
        deletedAt: true,
        status: true,
        user: {
          select: {
            id: true,
            isActive: true,
            email: true,
          },
        },
      },
    });

    if (
      !request ||
      request.status !== AccountApprovalStatus.APPROVED ||
      request.deletedAt
    ) {
      throw new UnauthorizedException('Invalid device approval request');
    }

    if (!request.user.isActive) {
      throw new UnauthorizedException('Invalid device approval request');
    }

    if (request.expiresAt.getTime() <= Date.now()) {
      await this.prisma.accountApprovalRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: AccountApprovalStatus.EXPIRED,
        },
      });
      throw new UnauthorizedException('Device approval request expired');
    }

    if (!this.verifyApprovalCode(input.approvalCode, request.approvalCodeHash)) {
      throw new UnauthorizedException('Invalid approval code');
    }

    const singleSessionMode = await this.getBooleanSystemSetting(
      'employee_single_session_mode',
      false,
    );

    await this.prisma.accountApprovalRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status: AccountApprovalStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.auditLogsService.record({
      actorUserId: request.userId,
      action: 'AUTH_DEVICE_APPROVAL_COMPLETE',
      resource: 'auth-approval-requests',
      resourceId: request.id,
      details: {
        purpose: AccountApprovalPurpose.NEW_DEVICE_LOGIN,
        loginId: request.loginId,
      },
    });

    if (singleSessionMode) {
      await this.prisma.userSession.updateMany({
        where: {
          userId: request.userId,
          deletedAt: null,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'approved_new_device_login',
          refreshTokenHash: null,
          updatedById: request.userId,
        },
      });
    }

    const refreshedUser = await this.prisma.user.findUniqueOrThrow({
      where: {
        id: request.userId,
      },
      include: authUserInclude,
    });

    return this.issueTokensForUser({
      user: refreshedUser,
      context: {
        ipAddress: this.truncate(context.ipAddress, 45) ?? request.ipAddress,
        userAgent: this.truncate(context.userAgent, 255) ?? request.userAgent,
        deviceId: this.truncate(context.deviceId, 191) ?? request.deviceId,
        deviceLabel:
          this.truncate(context.deviceLabel, 191) ?? request.deviceLabel,
      },
      sessionPayload: {
        loginId: request.loginId ?? refreshedUser.email ?? refreshedUser.id,
        loginType: 'device_approval',
      },
    });
  }

  async listPendingApprovalRequests(
    query: ListAccountApprovalRequestsDto,
  ): Promise<AuthApprovalListPayload> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AccountApprovalRequestWhereInput = {
      deletedAt: null,
      status: AccountApprovalStatus.PENDING,
      purpose: query.purpose,
      OR: query.search
        ? [
            {
              loginId: {
                contains: query.search,
              },
            },
            {
              user: {
                firstName: {
                  contains: query.search,
                },
              },
            },
            {
              user: {
                lastName: {
                  contains: query.search,
                },
              },
            },
            {
              user: {
                phoneE164: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.accountApprovalRequest.count({ where }),
      this.prisma.accountApprovalRequest.findMany({
        where,
        include: approvalRequestInclude,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => this.mapApprovalRequestView(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approveApprovalRequest(
    requestId: string,
    actorUserId: string,
  ): Promise<AuthAccountApprovalView> {
    const request = await this.ensureApprovalRequestExists(requestId);

    if (request.status === AccountApprovalStatus.REJECTED) {
      throw new ConflictException('Approval request was rejected');
    }

    if (request.expiresAt.getTime() <= Date.now()) {
      await this.prisma.accountApprovalRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: AccountApprovalStatus.EXPIRED,
        },
      });
      throw new ConflictException('Approval request expired');
    }

    if (request.status === AccountApprovalStatus.COMPLETED) {
      throw new ConflictException('Approval request was completed');
    }

    const updated =
      request.status === AccountApprovalStatus.APPROVED
        ? request
        : await this.prisma.accountApprovalRequest.update({
            where: {
              id: request.id,
            },
            data: {
              status: AccountApprovalStatus.APPROVED,
              approvedByUserId: actorUserId,
              approvedAt: new Date(),
              rejectedAt: null,
            },
            include: approvalRequestInclude,
          });

    await this.auditLogsService.record({
      actorUserId,
      action: 'AUTH_APPROVAL_REQUEST_APPROVE',
      resource: 'auth-approval-requests',
      resourceId: request.id,
      details: {
        purpose: request.purpose,
        loginId: request.loginId,
      },
    });

    return this.mapApprovalRequestView(updated);
  }

  async rejectApprovalRequest(
    requestId: string,
    actorUserId: string,
  ): Promise<AuthAccountApprovalView> {
    const request = await this.ensureApprovalRequestExists(requestId);

    if (request.status === AccountApprovalStatus.COMPLETED) {
      throw new ConflictException('Approval request was completed');
    }

    if (request.expiresAt.getTime() <= Date.now()) {
      await this.prisma.accountApprovalRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: AccountApprovalStatus.EXPIRED,
        },
      });
      throw new ConflictException('Approval request expired');
    }

    if (request.status === AccountApprovalStatus.REJECTED) {
      return this.mapApprovalRequestView(request);
    }

    const updated = await this.prisma.accountApprovalRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status: AccountApprovalStatus.REJECTED,
        rejectedAt: new Date(),
      },
      include: approvalRequestInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'AUTH_APPROVAL_REQUEST_REJECT',
      resource: 'auth-approval-requests',
      resourceId: request.id,
      details: {
        purpose: request.purpose,
        loginId: request.loginId,
      },
    });

    return this.mapApprovalRequestView(updated);
  }

  async reissueApprovalRequest(
    requestId: string,
    actorUserId: string,
  ): Promise<{ request: AuthAccountApprovalView; approvalCode: string }> {
    const request = await this.ensureApprovalRequestExists(requestId);

    if (request.status === AccountApprovalStatus.REJECTED) {
      throw new ConflictException('Approval request was rejected');
    }

    if (request.status === AccountApprovalStatus.COMPLETED) {
      throw new ConflictException('Approval request was completed');
    }

    const approvalCode = this.generateApprovalCode();
    const expiresAt = new Date(Date.now() + this.approvalCodeTtlSeconds * 1000);

    const updated = await this.prisma.accountApprovalRequest.update({
      where: {
        id: request.id,
      },
      data: {
        approvalCodeHash: this.hashApprovalCode(approvalCode),
        expiresAt,
        status:
          request.status === AccountApprovalStatus.EXPIRED
            ? AccountApprovalStatus.PENDING
            : request.status,
        ...(request.status === AccountApprovalStatus.EXPIRED
          ? {
              approvedByUserId: null,
              approvedAt: null,
              rejectedAt: null,
              completedAt: null,
            }
          : {}),
      },
      include: approvalRequestInclude,
    });

    await this.notifyApprovalManagers({
      purpose: request.purpose,
      subjectUser: request.user,
      approvalCode,
      requestId: request.id,
      context: {
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        deviceId: request.deviceId,
        deviceLabel: request.deviceLabel,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'AUTH_APPROVAL_REQUEST_REISSUE',
      resource: 'auth-approval-requests',
      resourceId: request.id,
      details: {
        purpose: request.purpose,
        loginId: request.loginId,
        approvalCodeExpiresAt: expiresAt.toISOString(),
      },
    });

    return {
      request: this.mapApprovalRequestView(updated),
      approvalCode,
    };
  }

  async beginDeviceApproval(
    loginDto: LoginDto,
    context: AuthIssueContext,
  ): Promise<AuthLoginResult> {
    return this.login(loginDto, context);
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
    const shouldUpdatePhone =
      payload.phoneCountryCode !== undefined ||
      payload.phoneNationalNumber !== undefined;

    const phoneInput = shouldUpdatePhone
      ? this.normalizeProfilePhoneInput(
          payload.phoneCountryCode,
          payload.phoneNationalNumber,
        )
      : undefined;

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

  private async createDeviceApprovalIfRequired(input: {
    user: AuthenticatedUserRecord;
    loginId: string;
    context: AuthIssueContext;
  }): Promise<AuthDeviceApprovalRequiredResult | null> {
    const normalizedDeviceId =
      this.truncate(input.context.deviceId, 191) ??
      this.buildFallbackDeviceId(input.context);

    if (!normalizedDeviceId) {
      return null;
    }

    const existingSession = await this.prisma.userSession.findFirst({
      where: {
        userId: input.user.id,
        deviceId: normalizedDeviceId,
        deletedAt: null,
        isRevoked: false,
      },
      select: {
        id: true,
      },
    });

    if (existingSession || !input.user.lastLoginAt) {
      return null;
    }

    const requiresApproval = await this.requiresNewDeviceApproval(input.user);
    if (!requiresApproval) {
      return null;
    }

    const request = await this.upsertApprovalRequest({
      user: input.user,
      purpose: AccountApprovalPurpose.NEW_DEVICE_LOGIN,
      loginId: input.loginId,
      approvalCode: this.generateApprovalCode(),
      context: input.context,
    });

    await this.notifyApprovalManagers({
      purpose: AccountApprovalPurpose.NEW_DEVICE_LOGIN,
      subjectUser: input.user,
      approvalCode: request.approvalCode,
      requestId: request.id,
      context: input.context,
    });

    await this.auditLogsService.record({
      actorUserId: input.user.id,
      action: 'AUTH_NEW_DEVICE_APPROVAL_REQUEST_CREATE',
      resource: 'auth-approval-requests',
      resourceId: request.id,
      details: {
        purpose: AccountApprovalPurpose.NEW_DEVICE_LOGIN,
        loginId: input.loginId,
        deviceId: normalizedDeviceId,
        approvalCodeExpiresAt: request.expiresAt.toISOString(),
      },
    });

    return {
      deviceApprovalRequired: true,
      purpose: 'NEW_DEVICE_LOGIN',
      requestId: request.id,
      expiresAt: request.expiresAt,
    };
  }

  private async issueTokensForUser(input: {
    user: AuthenticatedUserRecord;
    context: AuthIssueContext;
    sessionPayload: Record<string, unknown>;
    passwordToRehash?: string | null;
  }): Promise<AuthTokensResult> {
    const normalizedDeviceId =
      this.truncate(input.context.deviceId, 191) ??
      this.buildFallbackDeviceId(input.context);

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

    if (await this.shouldForceSingleSession(input.user)) {
      await this.prisma.userSession.updateMany({
        where: {
          userId: input.user.id,
          deletedAt: null,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'single_session_replaced',
          refreshTokenHash: null,
          updatedById: input.user.id,
        },
      });
    }

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
  } {
    const hasCountry = phoneCountryCode !== undefined;
    const hasNational = phoneNationalNumber !== undefined;

    if (!hasCountry && !hasNational) {
      throw new BadRequestException('Phone number is required');
    }

    if (!hasCountry || !hasNational) {
      throw new BadRequestException(
        'Both phoneCountryCode and phoneNationalNumber are required together',
      );
    }

    const rawCountryCode = phoneCountryCode?.trim() ?? '';
    const rawNationalNumber = phoneNationalNumber?.trim() ?? '';

    if (!rawCountryCode && !rawNationalNumber) {
      throw new BadRequestException('Phone number is required');
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

  private async requiresAdminApprovalForInitialActivation(
    user: AuthenticatedUserRecord,
  ): Promise<boolean> {
    const { roleCodes } = this.extractSecurityGrants(user.userRoles);
    const isGuardianOnly =
      roleCodes.length === 1 && roleCodes[0]?.toLowerCase() === 'guardian';

    if (isGuardianOnly) {
      return this.getBooleanSystemSetting(
        'first_activation_requires_admin_approval_for_guardian',
        false,
      );
    }

    return this.getBooleanSystemSetting(
      'first_activation_requires_admin_approval_for_employee',
      true,
    );
  }

  private async requiresNewDeviceApproval(
    user: AuthenticatedUserRecord,
  ): Promise<boolean> {
    const { roleCodes } = this.extractSecurityGrants(user.userRoles);
    const isGuardianOnly =
      roleCodes.length === 1 && roleCodes[0]?.toLowerCase() === 'guardian';

    if (isGuardianOnly) {
      return !(await this.getBooleanSystemSetting(
        'guardian_multi_device_allowed',
        true,
      ));
    }

    const singleSessionMode = await this.getBooleanSystemSetting(
      'employee_single_session_mode',
      false,
    );

    if (singleSessionMode) {
      return true;
    }

    return this.getBooleanSystemSetting(
      'employee_new_device_requires_approval',
      false,
    );
  }

  private async shouldForceSingleSession(
    user: AuthenticatedUserRecord,
  ): Promise<boolean> {
    const { roleCodes } = this.extractSecurityGrants(user.userRoles);
    const isGuardianOnly =
      roleCodes.length === 1 && roleCodes[0]?.toLowerCase() === 'guardian';

    if (isGuardianOnly) {
      return false;
    }

    return this.getBooleanSystemSetting('employee_single_session_mode', false);
  }

  private async getBooleanSystemSetting(
    settingKey: string,
    fallback: boolean,
  ): Promise<boolean> {
    const setting = await this.prisma.systemSetting.findFirst({
      where: {
        settingKey,
        deletedAt: null,
      },
      select: {
        settingValue: true,
      },
    });

    const raw = setting?.settingValue?.trim().toLowerCase();
    if (!raw) {
      return fallback;
    }

    if (raw === 'true' || raw === '1') {
      return true;
    }

    if (raw === 'false' || raw === '0') {
      return false;
    }

    return fallback;
  }

  private generateApprovalCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private buildFallbackDeviceId(context: AuthIssueContext): string | null {
    const userAgent = this.truncate(context.userAgent, 255) ?? '';
    const ipAddress = this.truncate(context.ipAddress, 45) ?? '';

    if (!userAgent && !ipAddress) {
      return null;
    }

    const fingerprint = createHash('sha256')
      .update(`${userAgent}|${ipAddress}`)
      .digest('hex')
      .slice(0, 40);

    return `fallback:${fingerprint}`;
  }

  private hashApprovalCode(code: string): string {
    return createHash('sha256').update(code.trim()).digest('hex');
  }

  private verifyApprovalCode(rawCode: string, expectedHash: string): boolean {
    const received = Buffer.from(this.hashApprovalCode(rawCode), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');

    if (received.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(received, expected);
  }

  private async notifyApprovalManagers(input: {
    purpose: AccountApprovalPurpose;
    subjectUser: {
      id: string;
      firstName: string;
      lastName: string;
      phoneE164: string | null;
    };
    approvalCode: string;
    requestId: string;
    context: AuthIssueContext;
  }): Promise<void> {
    const managers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        userRoles: {
          some: {
            deletedAt: null,
            role: {
              deletedAt: null,
              isActive: true,
              code: {
                in: ['super_admin', 'school_admin'],
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (managers.length === 0) {
      return;
    }

    const title =
      input.purpose === AccountApprovalPurpose.FIRST_PASSWORD_SETUP
        ? 'طلب تفعيل كلمة المرور الأولى'
        : input.purpose === AccountApprovalPurpose.NEW_DEVICE_LOGIN
          ? 'طلب اعتماد جهاز جديد'
          : 'طلب استعادة كلمة المرور';

    const message = [
      `المستخدم: ${input.subjectUser.firstName} ${input.subjectUser.lastName}`.trim(),
      input.subjectUser.phoneE164 ? `الهاتف: ${input.subjectUser.phoneE164}` : null,
      `الكود: ${input.approvalCode}`,
      input.context.deviceLabel ? `الجهاز: ${input.context.deviceLabel}` : null,
      input.context.ipAddress ? `IP: ${input.context.ipAddress}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    await this.userNotificationsService.createForUsers(
      managers.map((manager) => ({
        userId: manager.id,
        title,
        message,
        notificationType: UserNotificationType.ACTION_REQUIRED,
        resource: 'auth',
        resourceId: input.requestId,
        actionUrl: '/app/user-notifications',
        triggeredByUserId: input.subjectUser.id,
      })),
    );
  }

  private async upsertApprovalRequest(input: {
    user: AuthenticatedUserRecord;
    purpose: AccountApprovalPurpose;
    loginId: string;
    approvalCode: string;
    context: AuthIssueContext;
    pendingPasswordHash?: string | null;
  }): Promise<{ id: string; approvalCode: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + this.approvalCodeTtlSeconds * 1000);
    const normalizedDeviceId = this.truncate(input.context.deviceId, 191);
    const normalizedDeviceLabel = this.truncate(input.context.deviceLabel, 191);
    const normalizedIpAddress = this.truncate(input.context.ipAddress, 45);
    const normalizedUserAgent = this.truncate(input.context.userAgent, 255);

    const openRequest = await this.prisma.accountApprovalRequest.findFirst({
      where: {
        userId: input.user.id,
        purpose: input.purpose,
        deletedAt: null,
        ...(input.purpose === AccountApprovalPurpose.NEW_DEVICE_LOGIN &&
        normalizedDeviceId
          ? {
              deviceId: normalizedDeviceId,
            }
          : {}),
        status: {
          in: [AccountApprovalStatus.PENDING, AccountApprovalStatus.APPROVED],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (openRequest) {
      await this.prisma.accountApprovalRequest.update({
        where: {
          id: openRequest.id,
        },
        data: {
          loginId: input.loginId,
          pendingPasswordHash: input.pendingPasswordHash ?? null,
          approvalCodeHash: this.hashApprovalCode(input.approvalCode),
          deviceId: normalizedDeviceId,
          deviceLabel: normalizedDeviceLabel,
          ipAddress: normalizedIpAddress,
          userAgent: normalizedUserAgent,
          expiresAt,
          status: openRequest.status,
          ...(openRequest.status === AccountApprovalStatus.PENDING
            ? {
                approvedByUserId: null,
                approvedAt: null,
                rejectedAt: null,
                completedAt: null,
              }
            : {}),
        },
      });

      return {
        id: openRequest.id,
        approvalCode: input.approvalCode,
        expiresAt,
      };
    }

    const request = await this.prisma.accountApprovalRequest.create({
      data: {
        userId: input.user.id,
        purpose: input.purpose,
        status: AccountApprovalStatus.PENDING,
        loginId: input.loginId,
        pendingPasswordHash: input.pendingPasswordHash ?? null,
        approvalCodeHash: this.hashApprovalCode(input.approvalCode),
        deviceId: normalizedDeviceId,
        deviceLabel: normalizedDeviceLabel,
        ipAddress: normalizedIpAddress,
        userAgent: normalizedUserAgent,
        expiresAt,
      },
      select: {
        id: true,
      },
    });

    return {
      id: request.id,
      approvalCode: input.approvalCode,
      expiresAt,
    };
  }

  private async ensureApprovalRequestExists(
    requestId: string,
  ): Promise<ApprovalRequestRecord> {
    const request = await this.prisma.accountApprovalRequest.findFirst({
      where: {
        id: requestId,
        deletedAt: null,
      },
      include: approvalRequestInclude,
    });

    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    return request;
  }

  private mapApprovalRequestView(
    request: ApprovalRequestRecord,
  ): AuthAccountApprovalView {
    return {
      id: request.id,
      userId: request.userId,
      purpose: request.purpose,
      status: request.status,
      loginId: request.loginId,
      deviceId: request.deviceId,
      deviceLabel: request.deviceLabel,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      expiresAt: request.expiresAt,
      approvedAt: request.approvedAt,
      rejectedAt: request.rejectedAt,
      completedAt: request.completedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      user: request.user,
      approvedByUser: request.approvedByUser,
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
