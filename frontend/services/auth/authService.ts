import {
  apiPost,
  API_ENDPOINTS,
  shouldUseOfflineFallback,
} from "@/services/api/client";
import type { AuthSession } from "@/types/auth";

const OFFLINE_LOGIN_ERROR = "No hay conexión. El inicio de sesión requiere conexión.";
const OFFLINE_REGISTER_ERROR = "No hay conexión. El registro requiere internet.";
const STORAGE_KEYS = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  user: "user",
} as const;

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    created_at: string;
  };
}

export interface RegisterResponse {
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    created_at: string;
  };
}

interface JwtPayload {
  exp?: number;
}

function hasStoredAuthArtifacts(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Object.values(STORAGE_KEYS).some((key) => window.localStorage.getItem(key) !== null);
}

function decodeBase64Url(value: string): string | null {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalizedValue.length % 4;
  const paddedValue =
    padding === 0 ? normalizedValue : `${normalizedValue}${"=".repeat(4 - padding)}`;

  try {
    if (typeof atob === "function") {
      return atob(paddedValue);
    }

    return null;
  } catch {
    return null;
  }
}

function parseTokenPayload(token: string): JwtPayload | null {
  const segments = token.split(".");

  if (segments.length !== 3) {
    return null;
  }

  const decodedPayload = decodeBase64Url(segments[1]);

  if (!decodedPayload) {
    return null;
  }

  try {
    const payload = JSON.parse(decodedPayload) as JwtPayload;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function isStoredUser(value: unknown): value is AuthSession["user"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "number" &&
    typeof user.username === "string" &&
    typeof user.email === "string" &&
    typeof user.role === "string" &&
    (user.created_at === undefined || typeof user.created_at === "string")
  );
}

/**
 * Authenticate a user and receive JWT tokens.
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  clearSession();

  try {
    return await apiPost<LoginResponse>(API_ENDPOINTS.auth.login, JSON.stringify(payload), {
      headers: { Authorization: "" },
      redirectOnUnauthorized: false,
    });
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      throw new Error(OFFLINE_LOGIN_ERROR);
    }
    throw error;
  }
}

/**
 * Register a new user account.
 */
export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  try {
    return await apiPost<RegisterResponse>(API_ENDPOINTS.auth.register, JSON.stringify(payload), {
      headers: { Authorization: "" },
      redirectOnUnauthorized: false,
    });
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      throw new Error(OFFLINE_REGISTER_ERROR);
    }
    throw error;
  }
}

/**
 * Read the current access token from localStorage.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEYS.accessToken);
}

/**
 * Persist the access token in localStorage.
 */
export function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.accessToken, token);
}

/**
 * Remove the persisted access token from localStorage.
 */
export function removeToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEYS.accessToken);
}

/**
 * Save auth session to localStorage.
 */
export function saveSession(data: LoginResponse): void {
  if (typeof window === "undefined") {
    return;
  }

  setToken(data.access_token);
  if (data.refresh_token) {
    window.localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token);
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
  }
  window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));
}

/**
 * Get current session from localStorage.
 */
export function getSession(): AuthSession | null {
  const token = getToken();
  const userJson = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEYS.user);
  const refreshToken =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(STORAGE_KEYS.refreshToken);

  if (!token || !userJson) {
    if (hasStoredAuthArtifacts()) {
      clearSession();
    }
    return null;
  }

  const payload = parseTokenPayload(token);
  if (payload === null) {
    clearSession();
    return null;
  }

  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
    clearSession();
    return null;
  }

  try {
    const user = JSON.parse(userJson);
    if (!isStoredUser(user)) {
      clearSession();
      return null;
    }

    return {
      accessToken: token,
      refreshToken: refreshToken ?? undefined,
      user,
    };
  } catch {
    clearSession();
    return null;
  }
}

export function getCurrentUser(): AuthSession["user"] | null {
  return getSession()?.user ?? null;
}

/**
 * Clear auth session from localStorage.
 */
export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  removeToken();
  window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
  window.localStorage.removeItem(STORAGE_KEYS.user);
}

export function hasSavedSession(): boolean {
  return getSession() !== null;
}
