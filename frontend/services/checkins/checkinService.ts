import { apiGet, apiPost, API_ENDPOINTS, shouldUseOfflineFallback } from "@/services/api/client";
import {
  cacheTodayHabits,
  getLocalTodayHabits,
  syncLocalCheckinResult,
} from "@/services/storage/localData";
import type { CheckinToggleResult, TodayHabit } from "@/types/checkins";

interface ToggleCheckinPayload {
  habit_id: number;
  date?: string;
}

export async function fetchTodayHabits(): Promise<TodayHabit[]> {
  try {
    const habits = await apiGet<TodayHabit[]>(API_ENDPOINTS.checkins.today);
    return cacheTodayHabits(habits);
  } catch (error) {
    // Local today data is only valid when offline mode is explicitly enabled.
    if (shouldUseOfflineFallback(error)) {
      return getLocalTodayHabits();
    }
    throw error;
  }
}

export async function toggleCheckin(payload: ToggleCheckinPayload): Promise<CheckinToggleResult> {
  try {
    const result = await apiPost<CheckinToggleResult>(
      API_ENDPOINTS.checkins.toggle,
      JSON.stringify(payload),
    );
    return syncLocalCheckinResult(result);
  } catch (error) {
    // Completion/progress must remain backend-validated; offline mode may read cached data only.
    if (shouldUseOfflineFallback(error)) {
      throw new Error("No se puede completar hábitos en modo offline. Conéctate para validar tu progreso.");
    }
    throw error;
  }
}
