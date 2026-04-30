/**
 * accountService
 *
 * Handles account-level actions for the authenticated user.
 */

import { apiDelete, API_ENDPOINTS } from "@/services/api/client";

export interface DeleteAccountResponse {
  message: string;
}

/**
 * Permanently deletes the authenticated user's account and all their data.
 * The caller is responsible for clearing the session and redirecting
 * after this resolves successfully.
 */
export async function deleteAccount(): Promise<DeleteAccountResponse> {
  return apiDelete<DeleteAccountResponse>(API_ENDPOINTS.user.delete);
}
