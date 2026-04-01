export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register"
  },
  habits: {
    list: "/api/mis-habitos",
    catalog: "/api/habitos",
    create: "/api/habitos_usuario",
    detail: (id: number) => `/api/habitos_usuario/${id}`,
    update: (id: number) => `/api/habitos_usuario/${id}`,
    delete: (id: number) => `/api/habitos_usuario/${id}`,
    validate: "/api/habits/validate",
  },
  checkins: {
    toggle: "/api/checkins/toggle",
    today: "/api/checkins/today",
  },
  stats: {
    summary: "/api/stats/summary",
    detailed: "/api/stats/detailed",
    xp: "/api/stats/xp",
  },
  pomodoro: {
    sessions: "/api/pomodoro/sessions",
    complete: (id: number) => `/api/pomodoro/sessions/${id}/complete`,
  },
} as const;
