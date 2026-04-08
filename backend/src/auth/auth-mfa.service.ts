import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import speakeasy from 'speakeasy';
import { PrismaService } from '../prisma/prisma.service';

export interface TotpSetupResponse {
  factorType: 'TOTP';
  issuer: string;
  accountName: string;
  secret: string;
  otpauthUrl: string;
}

@Injectable()
export class AuthMfaService {
  private readonly totpIssuer = process.env.AUTH_TOTP_ISSUER?.trim() || 'School ERP';

  constructor(private readonly prisma: PrismaService) {}

  async setupTotp(userId: string, accountName: string): Promise<TotpSetupResponse> {
    const secret = speakeasy.generateSecret({
      length: 20,
      issuer: this.totpIssuer,
      name: `${this.totpIssuer}:${accountName}`,
    });

    if (!secret.base32 || !secret.otpauth_url) {
      throw new BadRequestException('Unable to generate TOTP secret');
    }

    await this.prisma.userAuthFactor.upsert({
      where: {
        userId_type: {
          userId,
          type: 'TOTP',
        },
      },
      update: {
        secretEncrypted: this.encryptSecret(secret.base32),
        isEnabled: false,
        verifiedAt: null,
        lastUsedAt: null,
        deletedAt: null,
      },
      create: {
        userId,
        type: 'TOTP',
        secretEncrypted: this.encryptSecret(secret.base32),
      },
    });

    return {
      factorType: 'TOTP',
      issuer: this.totpIssuer,
      accountName,
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    };
  }

  async enableTotp(userId: string, code: string): Promise<void> {
    const factor = await this.prisma.userAuthFactor.findFirst({
      where: {
        userId,
        type: 'TOTP',
        deletedAt: null,
      },
      select: {
        id: true,
        secretEncrypted: true,
      },
    });

    if (!factor) {
      throw new BadRequestException('MFA setup is required before enabling.');
    }

    const isValid = this.verifyTotpCode(this.decryptSecret(factor.secretEncrypted), code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA verification code.');
    }

    await this.prisma.userAuthFactor.update({
      where: {
        id: factor.id,
      },
      data: {
        isEnabled: true,
        verifiedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
  }

  async disableTotp(userId: string, code: string): Promise<void> {
    const factor = await this.prisma.userAuthFactor.findFirst({
      where: {
        userId,
        type: 'TOTP',
        isEnabled: true,
        deletedAt: null,
      },
      select: {
        id: true,
        secretEncrypted: true,
      },
    });

    if (!factor) {
      throw new BadRequestException('MFA is not enabled.');
    }

    const isValid = this.verifyTotpCode(this.decryptSecret(factor.secretEncrypted), code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA verification code.');
    }

    await this.prisma.userAuthFactor.update({
      where: {
        id: factor.id,
      },
      data: {
        isEnabled: false,
        verifiedAt: null,
        lastUsedAt: null,
      },
    });
  }

  async hasEnabledTotp(userId: string): Promise<boolean> {
    const factor = await this.prisma.userAuthFactor.findFirst({
      where: {
        userId,
        type: 'TOTP',
        isEnabled: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    return Boolean(factor);
  }

  async verifyEnabledTotpCode(userId: string, code: string): Promise<void> {
    const factor = await this.prisma.userAuthFactor.findFirst({
      where: {
        userId,
        type: 'TOTP',
        isEnabled: true,
        deletedAt: null,
      },
      select: {
        id: true,
        secretEncrypted: true,
      },
    });

    if (!factor) {
      throw new UnauthorizedException('MFA factor is not enabled.');
    }

    const isValid = this.verifyTotpCode(this.decryptSecret(factor.secretEncrypted), code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA verification code.');
    }

    await this.prisma.userAuthFactor.update({
      where: {
        id: factor.id,
      },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  private verifyTotpCode(secret: string, rawCode: string): boolean {
    const code = rawCode.trim();
    if (!/^\d{6}$/.test(code)) {
      return false;
    }

    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
  }

  private encryptSecret(secret: string): string {
    const key = this.resolveEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  private decryptSecret(encryptedValue: string): string {
    const [ivPart, tagPart, payloadPart] = encryptedValue.split('.');
    if (!ivPart || !tagPart || !payloadPart) {
      throw new BadRequestException('Invalid encrypted MFA secret format.');
    }

    const key = this.resolveEncryptionKey();
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payloadPart, 'base64url')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private resolveEncryptionKey(): Buffer {
    const configuredSecret = process.env.AUTH_TOTP_ENCRYPTION_KEY?.trim();
    const fallbackSecret =
      process.env.JWT_ACCESS_SECRET?.trim() ??
      process.env.JWT_SECRET?.trim() ??
      'change_me_with_very_strong_secret';
    const source = configuredSecret || fallbackSecret;

    const rawBuffer = Buffer.from(source, 'base64');
    if (rawBuffer.length === 32) {
      return rawBuffer;
    }

    return createHash('sha256').update(source).digest();
  }
}
