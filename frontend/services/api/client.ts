import {
  ApiBaseUrlConfigurationError,
  getApiBaseUrl,
  isOfflineModeActive,
} from "@/services/config/runtime";

import { API_ENDPOINTS } from "./endpoints";

export class OfflineModeError extends Error {
  constructor(message = "Offline mode is active.") {
    super(message);
    this.name = "OfflineModeError";
  }
}
import { API_ENDPOINTS } from "./endpoints";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface RequestOptions extends RequestInit {
  path: string;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("access_token");
}

export function buildAuthHeaders(headers?: HeadersInit): HeadersInit {
  const token = getAccessToken();

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

export async function apiRequest<T>({ path, headers, ...options }: RequestOptions): Promise<T> {
  if (isOfflineModeActive()) {
    throw new OfflineModeError();
  }

  const apiBaseUrl = getApiBaseUrl();

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: buildAuthHeaders(headers),
  });

  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(responseBody, `API request failed with status ${response.status}`),
    );
  }

  return responseBody as T;
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
export async function apiRequest<T>({ path, ...options }: RequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export { API_ENDPOINTS };
