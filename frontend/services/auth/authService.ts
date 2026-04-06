import { apiPost, API_ENDPOINTS, isAppErrorCode } from "@/services/api/client";
import {
  clearStoredSession,
  getStoredSession,
  hasStoredSession,
  persistSession,
} from "@/services/auth/session";
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

/**
 * Authenticate a user and receive JWT tokens.
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  try {
    return await apiPost<LoginResponse>(API_ENDPOINTS.auth.login, JSON.stringify(payload), {
      headers: { Authorization: "" },
    });
  } catch (error) {
    if (isAppErrorCode(error, "network_unavailable") || isAppErrorCode(error, "backend_unavailable")) {
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
    if (isAppErrorCode(error, "network_unavailable") || isAppErrorCode(error, "backend_unavailable")) {
      throw new Error(OFFLINE_REGISTER_ERROR);
    }
    throw error;
  }
}

/**
 * Save auth session to browser storage and keep request-time auth in sync.
 */
export function saveSession(data: LoginResponse): void {
  persistSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user,
  });
}

/**
 * Get current session from browser storage.
 */
export function getSession(): AuthSession | null {
  return getStoredSession();
}

/**
 * Clear auth session from browser storage.
 */
export function clearSession(): void {
  clearStoredSession();
}

export function hasSavedSession(): boolean {
  return hasStoredSession();
}
