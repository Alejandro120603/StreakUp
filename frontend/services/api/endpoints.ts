export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register"
  },
  habits: {
    list: "/habits",
    create: "/habits"
  }
} as const;
