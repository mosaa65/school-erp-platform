import type { AuthSession } from "@/features/auth/types/auth-session";
import { AUTH_COOKIE_NAME, AUTH_STORAGE_KEY } from "@/lib/auth/constants";

const DEFAULT_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function parseExpiresInToSeconds(expiresIn: string): number {
  const value = expiresIn.trim().toLowerCase();

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const matched = value.match(/^(\d+)([smhd])$/);
  if (!matched) {
    return DEFAULT_TOKEN_MAX_AGE_SECONDS;
  }

  const amount = Number(matched[1]);
  const unit = matched[2];

  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      return DEFAULT_TOKEN_MAX_AGE_SECONDS;
  }
}

function setAuthCookie(accessToken: string, expiresIn: string): void {
  if (!isBrowser()) {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const maxAge = parseExpiresInToSeconds(expiresIn);

  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(accessToken)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function clearAuthCookie(): void {
  if (!isBrowser()) {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

function isValidSessionPayload(payload: unknown): payload is AuthSession {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  if (typeof candidate.accessToken !== "string") {
    return false;
  }

  if (typeof candidate.user !== "object" || candidate.user === null) {
    return false;
  }

  const user = candidate.user as Record<string, unknown>;

  if (typeof user.id !== "string") {
    return false;
  }

  return true;
}

export function loadAuthSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    clearAuthCookie();
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isValidSessionPayload(parsed)) {
      clearAuthCookie();
      return null;
    }

    return parsed;
  } catch {
    clearAuthCookie();
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  setAuthCookie(session.accessToken, session.expiresIn);
}

export function clearAuthSession(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  clearAuthCookie();
}

export function getAccessTokenFromStorage(): string | null {
  return loadAuthSession()?.accessToken ?? null;
}


