import { ApiErrorSchema, type ErrorCode } from "@loopedu/shared";

const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

/** Lỗi gọi API: `code` theo hợp đồng chung; NETWORK khi không tới được máy chủ, SERVER khi máy chủ trả lỗi không theo hợp đồng (vd. 500). */
export class ApiRequestError extends Error {
  constructor(
    readonly code: ErrorCode | "NETWORK" | "SERVER",
    message: string,
  ) {
    super(message);
  }
}

/** POST JSON tới API, kèm cookie (refresh token nằm trong httpOnly cookie). `schema` kiểm tra phản hồi. */
export async function apiPost<T>(path: string, body: unknown, schema: { parse(data: unknown): T }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError("NETWORK", "Không kết nối được máy chủ");
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiErrorSchema.safeParse(data);
    throw err.success ? new ApiRequestError(err.data.code, err.data.message) : new ApiRequestError("SERVER", `HTTP ${res.status}`);
  }
  return schema.parse(data);
}
