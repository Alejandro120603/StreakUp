export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register"
  },
  habits: {
    list: "/habits",
    create: "/habits"
  }
} as const;
