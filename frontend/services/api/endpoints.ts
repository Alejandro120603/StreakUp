export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register"
  },
  habits: {
    list: "/api/habits",
    create: "/api/habits",
    detail: (id: number) => `/api/habits/${id}`,
    update: (id: number) => `/api/habits/${id}`,
    delete: (id: number) => `/api/habits/${id}`,
  }
} as const;
