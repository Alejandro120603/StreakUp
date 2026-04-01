import {
  ApiBaseUrlConfigurationError,
  getApiBaseUrl,
  isOfflineModeActive,
} from "@/services/config/runtime";
import { clearSession, getToken } from "@/services/auth/authService";

import { API_ENDPOINTS } from "./endpoints";

export class OfflineModeError extends Error {
  constructor(message = "Offline mode is active.") {
    super(message);
    this.name = "OfflineModeError";
  }
}

export interface RequestOptions extends RequestInit {
  path: string;
  redirectOnUnauthorized?: boolean;
}

export class UnauthorizedError extends Error {
  constructor(message = "API request failed with status 401") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function buildAuthHeaders(headers?: HeadersInit): HeadersInit {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

export function getApiErrorMessage(errorBody: unknown, fallback: string): string {
  if (typeof errorBody === "string" && errorBody.trim()) {
    return errorBody;
  }

  if (errorBody && typeof errorBody === "object") {
    const candidate = errorBody as { error?: string; errors?: string[]; message?: string };
    if (candidate.error) {
      return candidate.error;
    }
    if (candidate.message) {
      return candidate.message;
    }
    if (candidate.errors?.length) {
      return candidate.errors.join(", ");
    }
  }

  return fallback;
}

export function shouldUseOfflineFallback(error: unknown): boolean {
  if (error instanceof OfflineModeError) {
    return true;
  }

  if (error instanceof ApiBaseUrlConfigurationError) {
    return false;
  }

  if (error instanceof TypeError) {
    return true;
  }

  return false;
}

function redirectToLogin(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.location.replace("/login");
}

export async function fetchWithAuth<T>({
  path,
  headers,
  redirectOnUnauthorized = true,
  ...options
}: RequestOptions): Promise<T> {
  if (isOfflineModeActive()) {
    throw new OfflineModeError();
  }

  const apiBaseUrl = getApiBaseUrl();

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: buildAuthHeaders(headers),
  });

  const responseBody = await parseResponseBody(response);

  if (response.status === 401) {
    const message = getApiErrorMessage(responseBody, "API request failed with status 401");

    if (redirectOnUnauthorized) {
      clearSession();
      redirectToLogin();
    }

    throw new UnauthorizedError(message);
  }

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(responseBody, `API request failed with status ${response.status}`),
    );
  }

  return responseBody as T;
}

export async function apiRequest<T>(options: RequestOptions): Promise<T> {
  return fetchWithAuth<T>(options);
}

export function apiGet<T>(path: string, options?: Omit<RequestOptions, "path" | "method">): Promise<T> {
  return apiRequest<T>({ path, method: "GET", ...options });
}

export function apiPost<T>(
  path: string,
  body?: RequestOptions["body"],
  options?: Omit<RequestOptions, "path" | "method" | "body">,
): Promise<T> {
  return apiRequest<T>({ path, method: "POST", body, ...options });
}

export function apiPut<T>(
  path: string,
  body?: RequestOptions["body"],
  options?: Omit<RequestOptions, "path" | "method" | "body">,
): Promise<T> {
  return apiRequest<T>({ path, method: "PUT", body, ...options });
}

export function apiDelete<T>(
  path: string,
  options?: Omit<RequestOptions, "path" | "method">,
): Promise<T> {
  return apiRequest<T>({ path, method: "DELETE", ...options });
}

export { API_ENDPOINTS };
