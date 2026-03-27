import { apiGet, apiPost, API_ENDPOINTS, shouldUseOfflineFallback } from "@/services/api/client";
import {
  cacheTodayHabits,
  getLocalTodayHabits,
  syncLocalCheckinResult,
  toggleLocalCheckin,
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
    if (shouldUseOfflineFallback(error)) {
      return toggleLocalCheckin(payload.habit_id, undefined, payload.date);
    }
    throw error;
  }
}
