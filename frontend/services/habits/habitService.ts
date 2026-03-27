import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  API_ENDPOINTS,
  shouldUseOfflineFallback,
} from "@/services/api/client";
import {
  cacheHabits,
  createLocalHabit,
  deleteLocalHabit,
  getLocalHabits,
  updateLocalHabit,
  upsertLocalHabit,
} from "@/services/storage/localData";
import type { Habit, CreateHabitPayload, UpdateHabitPayload } from "@/types/habits";

export async function fetchHabits(): Promise<Habit[]> {
  try {
    const habits = await apiGet<Habit[]>(API_ENDPOINTS.habits.list);
    return cacheHabits(habits);
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      return getLocalHabits();
    }
    throw error;
  }
}

export async function createHabit(payload: CreateHabitPayload): Promise<Habit> {
  try {
    const habit = await apiPost<Habit>(API_ENDPOINTS.habits.create, JSON.stringify(payload));
    return upsertLocalHabit(habit);
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      return createLocalHabit(payload);
    }
    throw error;
  }
}

export async function updateHabit(id: number, payload: UpdateHabitPayload): Promise<Habit> {
  try {
    const habit = await apiPut<Habit>(API_ENDPOINTS.habits.update(id), JSON.stringify(payload));
    return upsertLocalHabit(habit);
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      return updateLocalHabit(id, payload);
    }
    throw error;
  }
}

export async function deleteHabit(id: number): Promise<void> {
  try {
    await apiDelete<void>(API_ENDPOINTS.habits.delete(id));
    deleteLocalHabit(id);
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      deleteLocalHabit(id);
      return;
    }
    throw error;
  }
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
