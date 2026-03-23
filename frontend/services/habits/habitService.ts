import { API_ENDPOINTS } from "@/services/api/endpoints";
import type { Habit, CreateHabitPayload, UpdateHabitPayload } from "@/types/habits";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchHabits(): Promise<Habit[]> {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.habits.list}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch habits");
  return res.json();
}

export async function createHabit(payload: CreateHabitPayload): Promise<Habit> {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.habits.create}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.errors?.join(", ") || data.error || "Failed to create habit");
  }
  return res.json();
}

export async function updateHabit(id: number, payload: UpdateHabitPayload): Promise<Habit> {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.habits.update(id)}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.errors?.join(", ") || data.error || "Failed to update habit");
  }
  return res.json();
}

export async function deleteHabit(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.habits.delete(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete habit");
}
