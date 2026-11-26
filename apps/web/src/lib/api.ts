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

type Schema<T> = { parse(data: unknown): T };

/** POST JSON tới API, kèm cookie (refresh token nằm trong httpOnly cookie). `schema` kiểm tra phản hồi. */
export const apiPost = <T>(path: string, body: unknown, schema: Schema<T>) => apiRequest("POST", path, body, schema);

/** Gọi API bất kỳ; có `token` thì gửi kèm `Authorization: Bearer`. */
export async function apiRequest<T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body: unknown,
  schema: Schema<T>,
  token?: string | null,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
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
