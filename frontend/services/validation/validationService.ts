import { apiPost, API_ENDPOINTS } from "@/services/api/client";
import type { ValidationResult } from "@/types/habits";

export async function validateHabit(
  habitId: number,
  imageBase64: string
): Promise<ValidationResult> {
  return apiPost<ValidationResult>(
    API_ENDPOINTS.habits.validate,
    JSON.stringify({ habit_id: habitId, image: imageBase64 }),
  );
}
