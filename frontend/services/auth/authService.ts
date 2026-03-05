import { apiRequest, API_ENDPOINTS } from "@/services/api/client";
import type { AuthSession } from "@/types/auth";

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
  return apiRequest<LoginResponse>({
    path: API_ENDPOINTS.auth.login,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Register a new user account.
 */
export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>({
    path: API_ENDPOINTS.auth.register,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Save auth session to localStorage.
 */
export function saveSession(data: LoginResponse): void {
  localStorage.setItem("access_token", data.access_token);
  if (data.refresh_token) {
    localStorage.setItem("refresh_token", data.refresh_token);
  }
  localStorage.setItem("user", JSON.stringify(data.user));
}

/**
 * Get current session from localStorage.
 */
export function getSession(): AuthSession | null {
  const token = localStorage.getItem("access_token");
  const userJson = localStorage.getItem("user");

  if (!token || !userJson) return null;

  try {
    const user = JSON.parse(userJson);
    return {
      accessToken: token,
      refreshToken: localStorage.getItem("refresh_token") ?? undefined,
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
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}
