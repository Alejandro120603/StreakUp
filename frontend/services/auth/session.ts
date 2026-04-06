import type { AuthSession, AuthUser } from "@/types/auth";

export const ACCESS_TOKEN_STORAGE_KEY = "access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";
export const USER_STORAGE_KEY = "user";
export const AUTH_COOKIE_NAME = "streakup_access_token";

interface JwtPayload {
  exp?: number;
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseCookies(): boolean {
  return typeof document !== "undefined";
}

function decodeBase64UrlSegment(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  if (typeof globalThis.atob === "function") {
    return globalThis.atob(padded);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }

  throw new Error("Base64 decoding is not available in this runtime.");
}

export function parseJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64UrlSegment(parts[1])) as JwtPayload;
    return typeof payload.exp === "number" ? payload : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: JwtPayload): boolean {
  return typeof payload.exp === "number" && payload.exp <= Math.floor(Date.now() / 1000);
}

export function isAccessTokenValid(token: string): boolean {
  const payload = parseJwtPayload(token);
  return payload !== null && !isTokenExpired(payload);
}

function isValidAuthUser(user: unknown): user is AuthUser {
  if (!user || typeof user !== "object") {
    return false;
  }

  const candidate = user as Partial<AuthUser>;
  return (
    typeof candidate.id === "number" &&
    Number.isFinite(candidate.id) &&
    candidate.id > 0 &&
    typeof candidate.username === "string" &&
    candidate.username.trim().length > 0 &&
    typeof candidate.email === "string" &&
    candidate.email.trim().length > 0 &&
    typeof candidate.role === "string" &&
    candidate.role.trim().length > 0
  );
}

function getCookieMaxAge(token: string): number | null {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) {
    return null;
  }

  const maxAge = payload.exp - Math.floor(Date.now() / 1000);
  return maxAge > 0 ? maxAge : 0;
}

export function setSessionCookie(token: string): void {
  if (!canUseCookies()) {
    return;
  }

  const attributes = ["Path=/", "SameSite=Lax"];
  const maxAge = getCookieMaxAge(token);

  if (maxAge !== null) {
    attributes.push(`Max-Age=${maxAge}`);
  }

  if (typeof window !== "undefined" && window.location?.protocol === "https:") {
    attributes.push("Secure");
  }

  document.cookie = `${AUTH_COOKIE_NAME}=${token}; ${attributes.join("; ")}`;
}

export function clearSessionCookie(): void {
  if (!canUseCookies()) {
    return;
  }

  const attributes = ["Path=/", "SameSite=Lax", "Max-Age=0"];

  if (typeof window !== "undefined" && window.location?.protocol === "https:") {
    attributes.push("Secure");
  }

  document.cookie = `${AUTH_COOKIE_NAME}=; ${attributes.join("; ")}`;
}

export function getStoredAccessToken(): string | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function persistSession(data: {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}): void {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.accessToken);

  if (data.refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refreshToken);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }

  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  setSessionCookie(data.accessToken);
}

export function clearStoredSession(): void {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }

  clearSessionCookie();
}

export function getStoredSession(): AuthSession | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  const token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  const userJson = window.localStorage.getItem(USER_STORAGE_KEY);

  if (!token || !userJson) {
    clearSessionCookie();
    return null;
  }

  try {
    const user = JSON.parse(userJson);

    if (!isAccessTokenValid(token) || !isValidAuthUser(user)) {
      clearStoredSession();
      return null;
    }

    setSessionCookie(token);

    return {
      accessToken: token,
      refreshToken: window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ?? undefined,
      user,
    };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function hasStoredSession(): boolean {
  return getStoredSession() !== null;
}
