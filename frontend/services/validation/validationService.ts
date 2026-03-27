import { API_ENDPOINTS } from "@/services/api/endpoints";
import type { ValidationResult } from "@/types/habits";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function validateHabit(
  habitId: number,
  imageBase64: string
): Promise<ValidationResult> {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.habits.validate}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ habit_id: habitId, image: imageBase64 }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || data.errors?.join(", ") || "Error al validar el hábito");
  }

  return res.json();
}
