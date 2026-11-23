import { AuthSessionSchema, MagicLinkResponseSchema } from "@loopedu/shared";
import { apiPost } from "./api";

// Access token chỉ giữ trong bộ nhớ (không localStorage). Mất khi tải lại trang; lấy lại bằng POST /auth/refresh.
let accessToken: string | null = null;
export const getAccessToken = () => accessToken;

async function startSession(path: string, body: unknown) {
  const session = await apiPost(path, body, AuthSessionSchema);
  accessToken = session.accessToken;
  return session;
}

export const requestMagicLink = (email: string) => apiPost("/auth/magic-link", { email }, MagicLinkResponseSchema);
export const verifyMagicLink = (token: string) => startSession("/auth/verify", { token });
export const loginWithPassword = (email: string, password: string) => startSession("/auth/login", { email, password });
export const loginWithGoogle = (idToken: string) => startSession("/auth/google", { idToken });
