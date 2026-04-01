import {
  apiDelete,
  apiGet,
  apiPost,
  API_ENDPOINTS,
  shouldUseOfflineFallback,
} from "@/services/api/client";
import {
  cacheHabits,
  getLocalHabits,
  upsertLocalHabit,
} from "@/services/storage/localData";
import type {
  Habit,
  HabitCatalogItem,
  CreateHabitPayload,
  UpdateHabitPayload,
} from "@/types/habits";

export async function fetchHabitCatalog(): Promise<HabitCatalogItem[]> {
  return apiGet<HabitCatalogItem[]>(API_ENDPOINTS.habits.catalog);
}

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
  const habit = await apiPost<Habit>(API_ENDPOINTS.habits.create, JSON.stringify(payload));
  return upsertLocalHabit(habit);
}

export async function updateHabit(id: number, payload: UpdateHabitPayload): Promise<Habit> {
  void id;
  void payload;
  throw new Error("Los hábitos del catálogo no se editan.");
}

export async function deleteHabit(id: number): Promise<void> {
  try {
    await apiDelete<void>(API_ENDPOINTS.habits.delete(id));
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      throw new Error("No se puede desactivar un hábito sin conexión.");
    }
    throw error;
  }
}
