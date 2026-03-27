import {
  apiGet,
  apiPost,
  apiPut,
  API_ENDPOINTS,
  shouldUseOfflineFallback,
} from "@/services/api/client";
import {
  cachePomodoroSessions,
  completeLocalPomodoroSession,
  createLocalPomodoroSession,
  getLocalPomodoroSessions,
  upsertLocalPomodoroSession,
} from "@/services/storage/localData";
import type { CreatePomodoroSessionPayload, PomodoroSession } from "@/types/pomodoro";

export async function fetchPomodoroSessions(limit = 10): Promise<PomodoroSession[]> {
  try {
    const sessions = await apiGet<PomodoroSession[]>(API_ENDPOINTS.pomodoro.sessions);
    return cachePomodoroSessions(sessions).slice(0, limit);
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      return getLocalPomodoroSessions(undefined, limit);
    }
    throw error;
  }
}

export async function createPomodoroSession(
  payload: CreatePomodoroSessionPayload,
): Promise<PomodoroSession> {
  try {
    const session = await apiPost<PomodoroSession>(
      API_ENDPOINTS.pomodoro.sessions,
      JSON.stringify(payload),
    );
    return upsertLocalPomodoroSession(session);
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      return createLocalPomodoroSession(payload);
    }
    throw error;
  }
}

export async function completePomodoroSession(sessionId: number): Promise<PomodoroSession> {
  try {
    const session = await apiPut<PomodoroSession>(API_ENDPOINTS.pomodoro.complete(sessionId));
    return upsertLocalPomodoroSession(session);
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      return completeLocalPomodoroSession(sessionId);
    }
    throw error;
  }
}
