import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { AuthWebAuthnChallengeFlow } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface BeginRegistrationInput {
  userId: string;
  email: string;
  displayName: string;
}

export interface WebAuthnCredentialView {
  id: string;
  credentialName: string | null;
  deviceType: string;
  backedUp: boolean;
  transports: string[];
  lastUsedAt: Date | null;
  createdAt: Date;
}

export interface BeginWebAuthnRegistrationResult {
  challengeId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}

export interface BeginWebAuthnAuthenticationResult {
  challengeId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}

export interface VerifiedWebAuthnAuthentication {
  userId: string;
  loginId: string;
}

@Injectable()
export class AuthWebAuthnService {
  private readonly expectedOrigins = this.resolveExpectedOrigins();
  private readonly rpId = this.resolveRpId();
  private readonly rpName =
    process.env.AUTH_WEBAUTHN_RP_NAME?.trim() || 'School ERP';

  private readonly challengeTtlSeconds = this.parseIntEnv(
    'AUTH_WEBAUTHN_CHALLENGE_TTL_SECONDS',
    300,
  );

  constructor(private readonly prisma: PrismaService) {}

  async beginRegistration(
    input: BeginRegistrationInput,
  ): Promise<BeginWebAuthnRegistrationResult> {
    const existingCredentials = await this.prisma.userWebAuthnCredential.findMany({
      where: {
        userId: input.userId,
        deletedAt: null,
      },
      select: {
        credentialId: true,
        transports: true,
      },
    });

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userName: input.email.toLowerCase(),
      userDisplayName: input.displayName,
      userID: Buffer.from(input.userId, 'utf8'),
      timeout: this.challengeTtlSeconds * 1000,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      excludeCredentials: existingCredentials.map((credential) => ({
        id: credential.credentialId,
        transports: this.parseTransports(credential.transports),
      })),
    });

    const challenge = await this.prisma.authWebAuthnChallenge.create({
      data: {
        userId: input.userId,
        flow: AuthWebAuthnChallengeFlow.REGISTRATION,
        challenge: options.challenge,
        expiresAt: this.resolveChallengeExpiry(),
      },
      select: {
        id: true,
      },
    });

    return {
      challengeId: challenge.id,
      options,
    };
  }

  async verifyRegistration(input: {
    userId: string;
    challengeId: string;
    response: Record<string, unknown>;
    credentialName?: string;
  }): Promise<WebAuthnCredentialView> {
    const challenge = await this.prisma.authWebAuthnChallenge.findFirst({
      where: {
        id: input.challengeId,
        userId: input.userId,
        flow: AuthWebAuthnChallengeFlow.REGISTRATION,
        deletedAt: null,
      },
      select: {
        id: true,
        challenge: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!challenge || challenge.usedAt) {
      throw new UnauthorizedException('Invalid WebAuthn registration challenge.');
    }

    this.assertChallengeActive(challenge.expiresAt);

    const verification = await verifyRegistrationResponse({
      response: input.response as unknown as RegistrationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: this.expectedOrigins,
      expectedRPID: this.rpId,
      requireUserVerification: true,
    });

    if (!verification.verified) {
      throw new UnauthorizedException('WebAuthn registration could not be verified.');
    }

    const transports = verification.registrationInfo.credential.transports;
    const credential = await this.prisma.userWebAuthnCredential.upsert({
      where: {
        credentialId: verification.registrationInfo.credential.id,
      },
      update: {
        userId: input.userId,
        publicKey: isoBase64URL.fromBuffer(
          verification.registrationInfo.credential.publicKey,
        ),
        counter: verification.registrationInfo.credential.counter,
        deviceType: verification.registrationInfo.credentialDeviceType,
        backedUp: verification.registrationInfo.credentialBackedUp,
        transports: this.serializeTransports(transports),
        credentialName: this.normalizeCredentialName(input.credentialName),
        deletedAt: null,
      },
      create: {
        userId: input.userId,
        credentialId: verification.registrationInfo.credential.id,
        publicKey: isoBase64URL.fromBuffer(
          verification.registrationInfo.credential.publicKey,
        ),
        counter: verification.registrationInfo.credential.counter,
        deviceType: verification.registrationInfo.credentialDeviceType,
        backedUp: verification.registrationInfo.credentialBackedUp,
        transports: this.serializeTransports(transports),
        credentialName: this.normalizeCredentialName(input.credentialName),
      },
      select: {
        id: true,
        credentialName: true,
        deviceType: true,
        backedUp: true,
        transports: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    await this.prisma.authWebAuthnChallenge.update({
      where: {
        id: challenge.id,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return {
      id: credential.id,
      credentialName: credential.credentialName,
      deviceType: credential.deviceType,
      backedUp: credential.backedUp,
      transports: this.parseTransports(credential.transports),
      lastUsedAt: credential.lastUsedAt,
      createdAt: credential.createdAt,
    };
  }

  async listCredentials(userId: string): Promise<WebAuthnCredentialView[]> {
    const credentials = await this.prisma.userWebAuthnCredential.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        credentialName: true,
        deviceType: true,
        backedUp: true,
        transports: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return credentials.map((credential) => ({
      id: credential.id,
      credentialName: credential.credentialName,
      deviceType: credential.deviceType,
      backedUp: credential.backedUp,
      transports: this.parseTransports(credential.transports),
      lastUsedAt: credential.lastUsedAt,
      createdAt: credential.createdAt,
    }));
  }

  async removeCredential(userId: string, credentialId: string): Promise<void> {
    const result = await this.prisma.userWebAuthnCredential.updateMany({
      where: {
        id: credentialId,
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Passkey not found');
    }
  }

  async beginAuthentication(): Promise<BeginWebAuthnAuthenticationResult> {
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      timeout: this.challengeTtlSeconds * 1000,
      userVerification: 'preferred',
    });

    const challenge = await this.prisma.authWebAuthnChallenge.create({
      data: {
        flow: AuthWebAuthnChallengeFlow.AUTHENTICATION,
        challenge: options.challenge,
        expiresAt: this.resolveChallengeExpiry(),
      },
      select: {
        id: true,
      },
    });

    return {
      challengeId: challenge.id,
      options,
    };
  }

  async beginAuthenticationForUser(
    userId: string,
  ): Promise<BeginWebAuthnAuthenticationResult> {
    const credentials = await this.prisma.userWebAuthnCredential.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        credentialId: true,
        transports: true,
      },
    });

    if (credentials.length === 0) {
      throw new BadRequestException('No passkeys registered for this user.');
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      timeout: this.challengeTtlSeconds * 1000,
      userVerification: 'preferred',
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        transports: this.parseTransports(credential.transports),
      })),
    });

    const challenge = await this.prisma.authWebAuthnChallenge.create({
      data: {
        userId,
        flow: AuthWebAuthnChallengeFlow.AUTHENTICATION,
        challenge: options.challenge,
        expiresAt: this.resolveChallengeExpiry(),
      },
      select: {
        id: true,
      },
    });

    return {
      challengeId: challenge.id,
      options,
    };
  }

  async verifyAuthentication(input: {
    challengeId: string;
    response: Record<string, unknown>;
  }): Promise<VerifiedWebAuthnAuthentication> {
    const challenge = await this.prisma.authWebAuthnChallenge.findFirst({
      where: {
        id: input.challengeId,
        flow: AuthWebAuthnChallengeFlow.AUTHENTICATION,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        challenge: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!challenge || challenge.usedAt) {
      throw new UnauthorizedException('Invalid WebAuthn authentication challenge.');
    }

    this.assertChallengeActive(challenge.expiresAt);

    const response = input.response as unknown as AuthenticationResponseJSON;
    const responseCredentialId = response.id?.trim();
    if (!responseCredentialId) {
      throw new BadRequestException('Missing credential id in authentication response.');
    }

    const credential = await this.prisma.userWebAuthnCredential.findFirst({
      where: {
        credentialId: responseCredentialId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!credential) {
      throw new UnauthorizedException('Unknown passkey credential.');
    }

    if (challenge.userId && challenge.userId !== credential.userId) {
      throw new UnauthorizedException('Passkey does not match this challenge.');
    }

    if (!credential.user.isActive || credential.user.deletedAt) {
      throw new UnauthorizedException('Passkey owner is inactive.');
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: this.expectedOrigins,
      expectedRPID: this.rpId,
      credential: {
        id: credential.credentialId,
        publicKey: isoBase64URL.toBuffer(credential.publicKey),
        counter: credential.counter,
        transports: this.parseTransports(credential.transports),
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      throw new UnauthorizedException('WebAuthn authentication failed.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userWebAuthnCredential.update({
        where: {
          id: credential.id,
        },
        data: {
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
          deviceType: verification.authenticationInfo.credentialDeviceType,
          backedUp: verification.authenticationInfo.credentialBackedUp,
        },
      });

      await tx.authWebAuthnChallenge.update({
        where: {
          id: challenge.id,
        },
        data: {
          usedAt: new Date(),
        },
      });
    });

    return {
      userId: credential.userId,
      loginId: credential.user.email.toLowerCase(),
    };
  }

  private resolveExpectedOrigins(): string[] {
    const fromList = process.env.AUTH_WEBAUTHN_ORIGINS?.trim();
    if (fromList) {
      const origins = fromList
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      if (origins.length > 0) {
        return origins;
      }
    }

    const singleOrigin = process.env.AUTH_WEBAUTHN_ORIGIN?.trim();
    if (singleOrigin) {
      return [singleOrigin];
    }

    return ['http://localhost:3000'];
  }

  private resolveRpId(): string {
    const configured = process.env.AUTH_WEBAUTHN_RP_ID?.trim();
    if (configured) {
      return configured;
    }

    try {
      return new URL(this.expectedOrigins[0]).hostname;
    } catch {
      return 'localhost';
    }
  }

  private resolveChallengeExpiry(): Date {
    return new Date(Date.now() + this.challengeTtlSeconds * 1000);
  }

  private assertChallengeActive(expiresAt: Date): void {
    if (expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('WebAuthn challenge has expired.');
    }
  }

  private serializeTransports(
    transports: AuthenticatorTransportFuture[] | undefined,
  ): string | null {
    if (!transports || transports.length === 0) {
      return null;
    }

    return JSON.stringify([...new Set(transports)]);
  }

  private parseTransports(rawValue: string | null): AuthenticatorTransportFuture[] {
    if (!rawValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      const allowed = new Set<AuthenticatorTransportFuture>([
        'ble',
        'cable',
        'hybrid',
        'internal',
        'nfc',
        'smart-card',
        'usb',
      ]);

      return parsed.filter((value): value is AuthenticatorTransportFuture => {
        return typeof value === 'string' && allowed.has(value as AuthenticatorTransportFuture);
      });
    } catch {
      return [];
    }
  }

  private normalizeCredentialName(value: string | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) {
      return null;
    }

    return trimmed.slice(0, 120);
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
}
