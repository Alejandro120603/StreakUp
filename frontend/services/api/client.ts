import { API_ENDPOINTS } from "./endpoints";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface RequestOptions extends RequestInit {
  path: string;
}

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
