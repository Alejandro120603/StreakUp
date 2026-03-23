export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}
