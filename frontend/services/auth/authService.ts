import {
  apiPost,
  API_ENDPOINTS,
  shouldUseOfflineFallback,
} from "@/services/api/client";
import type { AuthSession } from "@/types/auth";

const OFFLINE_LOGIN_ERROR = "No hay conexión. Usa una sesión guardada previamente.";
const OFFLINE_REGISTER_ERROR = "No hay conexión. El registro requiere internet.";

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapSessionToLoginResponse(session: AuthSession): LoginResponse {
  return {
    access_token: session.accessToken,
    refresh_token: session.refreshToken ?? "",
    user: {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      role: session.user.role,
      created_at: session.user.created_at ?? "",
    },
  };
}

function getMatchingSavedSession(email: string): AuthSession | null {
  const session = getSession();

  if (!session) {
    return null;
  }

  return normalizeEmail(session.user.email) === normalizeEmail(email) ? session : null;
}

/**
 * Authenticate a user and receive JWT tokens.
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  try {
    return await apiPost<LoginResponse>(API_ENDPOINTS.auth.login, JSON.stringify(payload), {
      headers: { Authorization: "" },
    });
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      const session = getMatchingSavedSession(payload.email);
      if (session) {
        return mapSessionToLoginResponse(session);
      }

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
    });
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      throw new Error(OFFLINE_REGISTER_ERROR);
    }
    throw error;
  }
}

/**
 * Save auth session to localStorage.
 */
export function saveSession(data: LoginResponse): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("access_token", data.access_token);
  if (data.refresh_token) {
    window.localStorage.setItem("refresh_token", data.refresh_token);
  } else {
    window.localStorage.removeItem("refresh_token");
  }
  window.localStorage.setItem("user", JSON.stringify(data.user));
}

/**
 * Get current session from localStorage.
 */
export function getSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem("access_token");
  const userJson = window.localStorage.getItem("user");

  if (!token || !userJson) return null;

  try {
    const user = JSON.parse(userJson);
    return {
      accessToken: token,
      refreshToken: window.localStorage.getItem("refresh_token") ?? undefined,
      user,
    };
  } catch {
    return null;
  }
}

/**
 * Clear auth session from localStorage.
 */
export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("access_token");
  window.localStorage.removeItem("refresh_token");
  window.localStorage.removeItem("user");
}

export function hasSavedSession(): boolean {
  return getSession() !== null;
}
