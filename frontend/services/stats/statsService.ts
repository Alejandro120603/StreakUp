import { apiGet, API_ENDPOINTS, shouldUseOfflineFallback } from "@/services/api/client";
import { fetchHabits } from "@/services/habits/habitService";
import { getLocalStats } from "@/services/storage/localData";
import type { ProfileStats, StatsSummary } from "@/types/stats";

export async function fetchStatsSummary(): Promise<StatsSummary> {
  try {
    return await apiGet<StatsSummary>(API_ENDPOINTS.stats.summary);
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      return getLocalStats();
    }
    throw error;
  }
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  const [summary, habits] = await Promise.all([fetchStatsSummary(), fetchHabitsCount()]);

  return {
    ...summary,
    habits_count: habits,
  };
}

async function fetchHabitsCount(): Promise<number> {
  return (await fetchHabits()).length;
}
