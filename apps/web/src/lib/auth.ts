import {
  AuthSessionSchema,
  MagicLinkResponseSchema,
  MeResponseSchema,
  isOnboarded,
  type UpdateProfileRequest,
} from "@loopedu/shared";
import { ApiRequestError, apiPost, apiRequest } from "./api";

// Access token chỉ giữ trong bộ nhớ (không localStorage). Mất khi tải lại trang; lấy lại bằng POST /auth/refresh.
let accessToken: string | null = null;
export const getAccessToken = () => accessToken;

async function startSession(path: string, body: unknown) {
  const session = await apiPost(path, body, AuthSessionSchema);
  accessToken = session.accessToken;
  return session;
}

// Refresh token xoay vòng: hai request song song thì request sau bị server coi là dùng lại token và thu hồi cả phiên.
let refreshing: Promise<unknown> | null = null;

/** Lấy access token mới bằng refresh cookie (vd. sau khi tải lại trang). Gộp các lần gọi trùng lúc thành một request. */
export const refreshSession = () =>
  (refreshing ??= startSession("/auth/refresh", undefined).finally(() => (refreshing = null)));

/** Gọi API cần đăng nhập. Chưa có token hoặc token hết hạn thì refresh một lần rồi thử lại. */
async function authed<T>(method: "GET" | "PUT", path: string, body: unknown, schema: { parse(data: unknown): T }) {
  if (!accessToken) await refreshSession();
  try {
    return await apiRequest(method, path, body, schema, accessToken);
  } catch (err) {
    if (!(err instanceof ApiRequestError && err.code === "UNAUTHORIZED")) throw err;
    await refreshSession();
    return apiRequest(method, path, body, schema, accessToken);
  }
}

/** Thu hồi refresh token (204, không có body) và quên access token. */
export async function logout() {
  try {
    await apiPost("/auth/logout", undefined, { parse: () => undefined });
  } finally {
    accessToken = null;
  }
}

export const getMe =() => authed("GET", "/me", undefined, MeResponseSchema);
export const updateProfile = (patch: UpdateProfileRequest) => authed("PUT", "/me/profile", patch, MeResponseSchema);

/** Trang đích sau khi đăng nhập: chưa onboarding thì vào /onboarding. */
export async function pathAfterSignIn(): Promise<string> {
  try {
    return isOnboarded((await getMe()).profile) ? "/" : "/onboarding";
  } catch {
    return "/";
  }
}

export const requestMagicLink = (email: string) => apiPost("/auth/magic-link", { email }, MagicLinkResponseSchema);
export const verifyMagicLink = (token: string) => startSession("/auth/verify", { token });
export const loginWithPassword = (email: string, password: string) => startSession("/auth/login", { email, password });
export const loginWithGoogle = (idToken: string) => startSession("/auth/google", { idToken });
