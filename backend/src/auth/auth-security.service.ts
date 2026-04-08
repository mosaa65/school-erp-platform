import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

interface LoginSecurityInput {
  ipAddress: string | null;
  loginId: string;
  captchaToken?: string;
}

interface LoginFailureInput {
  ipAddress: string | null;
  loginId: string;
}

interface LoginState {
  failedTimestamps: number[];
  lockedUntil: number | null;
}

@Injectable()
export class AuthSecurityService {
  private readonly loginState = new Map<string, LoginState>();
  private readonly refreshAttempts = new Map<string, number[]>();

  private readonly failedWindowMs =
    this.parseIntEnv('AUTH_LOGIN_WINDOW_SECONDS', 15 * 60) * 1000;

  private readonly maxFailedAttempts = this.parseIntEnv(
    'AUTH_LOGIN_MAX_FAILED_ATTEMPTS',
    5,
  );

  private readonly lockDurationMs =
    this.parseIntEnv('AUTH_LOGIN_LOCK_SECONDS', 15 * 60) * 1000;

  private readonly captchaAfterFailedAttempts = this.parseIntEnv(
    'AUTH_CAPTCHA_AFTER_FAILED_ATTEMPTS',
    3,
  );

  private readonly refreshWindowMs =
    this.parseIntEnv('AUTH_REFRESH_WINDOW_SECONDS', 5 * 60) * 1000;

  private readonly refreshLimit = this.parseIntEnv(
    'AUTH_REFRESH_RATE_LIMIT',
    60,
  );

  private readonly recaptchaSecret =
    process.env.AUTH_RECAPTCHA_SECRET?.trim() ?? '';

  private readonly recaptchaMinScore = this.parseFloatEnv(
    'AUTH_RECAPTCHA_MIN_SCORE',
    0.5,
  );

  async assertLoginAllowed(input: LoginSecurityInput): Promise<void> {
    const now = Date.now();
    const key = this.buildLoginKey(input.ipAddress, input.loginId);
    const state = this.getOrCreateLoginState(key);

    this.compactLoginState(state, now);

    if (state.lockedUntil && state.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((state.lockedUntil - now) / 1000);
      throw new HttpException(
        `Too many login attempts. Retry in ${retryAfterSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (state.failedTimestamps.length >= this.captchaAfterFailedAttempts) {
      await this.assertCaptchaToken(input.captchaToken, input.ipAddress);
    }
  }

  recordLoginFailure(input: LoginFailureInput): void {
    const now = Date.now();
    const key = this.buildLoginKey(input.ipAddress, input.loginId);
    const state = this.getOrCreateLoginState(key);

    this.compactLoginState(state, now);
    state.failedTimestamps.push(now);

    if (state.failedTimestamps.length >= this.maxFailedAttempts) {
      state.lockedUntil = now + this.lockDurationMs;
    }

    this.loginState.set(key, state);
  }

  recordLoginSuccess(input: LoginFailureInput): void {
    const key = this.buildLoginKey(input.ipAddress, input.loginId);
    this.loginState.delete(key);
  }

  assertRefreshAllowed(ipAddress: string | null): void {
    const now = Date.now();
    const key = this.buildRefreshKey(ipAddress);
    const history = this.refreshAttempts.get(key) ?? [];
    const validHistory = history.filter(
      (timestamp) => timestamp >= now - this.refreshWindowMs,
    );

    if (validHistory.length >= this.refreshLimit) {
      throw new HttpException(
        'Too many token refresh attempts. Please try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    validHistory.push(now);
    this.refreshAttempts.set(key, validHistory);
  }

  private async assertCaptchaToken(
    captchaToken: string | undefined,
    ipAddress: string | null,
  ): Promise<void> {
    if (!this.recaptchaSecret) {
      return;
    }

    const token = captchaToken?.trim();
    if (!token) {
      throw new BadRequestException(
        'CAPTCHA token is required after repeated failed attempts.',
      );
    }

    const payload = new URLSearchParams();
    payload.set('secret', this.recaptchaSecret);
    payload.set('response', token);
    if (ipAddress) {
      payload.set('remoteip', ipAddress);
    }

    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
      },
    );

    if (!response.ok) {
      throw new BadRequestException(
        'CAPTCHA verification service is unavailable.',
      );
    }

    const result = (await response.json()) as {
      success?: boolean;
      score?: number;
    };

    if (!result.success) {
      throw new UnauthorizedException('CAPTCHA verification failed.');
    }

    if (
      typeof result.score === 'number' &&
      result.score < this.recaptchaMinScore
    ) {
      throw new UnauthorizedException('CAPTCHA verification score is too low.');
    }
  }

  private getOrCreateLoginState(key: string): LoginState {
    return (
      this.loginState.get(key) ?? {
        failedTimestamps: [],
        lockedUntil: null,
      }
    );
  }

  private compactLoginState(state: LoginState, now: number): void {
    state.failedTimestamps = state.failedTimestamps.filter(
      (timestamp) => timestamp >= now - this.failedWindowMs,
    );

    if (state.lockedUntil && state.lockedUntil <= now) {
      state.lockedUntil = null;
    }
  }

  private buildLoginKey(ipAddress: string | null, loginId: string): string {
    return `${this.normalizeIp(ipAddress)}|${loginId.toLowerCase()}`;
  }

  private buildRefreshKey(ipAddress: string | null): string {
    return this.normalizeIp(ipAddress);
  }

  private normalizeIp(ipAddress: string | null): string {
    const normalized = ipAddress?.trim();
    if (!normalized) {
      return 'unknown_ip';
    }

    return normalized;
  }

  private parseIntEnv(key: string, fallback: number): number {
    const raw = process.env[key]?.trim();
    if (!raw) {
      return fallback;
    }

    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private parseFloatEnv(key: string, fallback: number): number {
    const raw = process.env[key]?.trim();
    if (!raw) {
      return fallback;
    }

    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }
}
