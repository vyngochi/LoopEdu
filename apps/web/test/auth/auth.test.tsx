import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/shared";
import { LoginForm, errorMessage, type LoginScreen } from "@/components/auth/login-form";
import { ApiRequestError } from "@/lib/api";
import { getAccessToken, loginWithPassword } from "@/lib/auth";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const SCREENS: LoginScreen[] = ["choose", "password", "sent", "expired"];

describe("LoginForm", () => {
  it.each(SCREENS)("màn %s có đúng một h1", (screen) => {
    const html = renderToStaticMarkup(<ToastProvider><LoginForm initialScreen={screen} /></ToastProvider>);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    if (screen !== "sent") expect(html).toContain('type="email"');
  });

  it("màn mật khẩu có ô mật khẩu autocomplete đúng", () => {
    const html = renderToStaticMarkup(<ToastProvider><LoginForm initialScreen="password" /></ToastProvider>);
    expect(html).toContain('autoComplete="current-password"');
  });
});

describe("errorMessage", () => {
  it("không tiết lộ email có tồn tại khi sai mật khẩu", () => {
    expect(errorMessage(new ApiRequestError("UNAUTHORIZED", "x"), "password")).toMatch(/Email hoặc mật khẩu chưa đúng/);
  });
  it("lỗi 500 không bảo người dùng kiểm tra mạng", () => {
    expect(errorMessage(new ApiRequestError("SERVER", "HTTP 500"), "link")).toMatch(/sự cố/);
  });
  it("thông báo ngắn gọn", () => {
    for (const code of ["NETWORK", "SERVER", "VALIDATION_FAILED", "QUOTA_EXCEEDED", "UNAUTHORIZED"] as const)
      for (const task of ["link", "password", "google"] as const)
        expect(errorMessage(new ApiRequestError(code, "x"), task).length).toBeLessThanOrEqual(60);
  });
  it("lỗi mạng nói cách xử lý", () => {
    expect(errorMessage(new ApiRequestError("NETWORK", "x"), "link")).toMatch(/Kiểm tra mạng/);
  });
});

describe("auth client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("giữ access token trong bộ nhớ sau khi đăng nhập", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ accessToken: "tok", expiresIn: 900 }), { status: 200 })));
    await loginWithPassword("a@b.vn", "secret");
    expect(getAccessToken()).toBe("tok");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/auth/login"), expect.objectContaining({ credentials: "include" }));
  });

  it("đổi lỗi API thành ApiRequestError có code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "UNAUTHORIZED", message: "no" }), { status: 401 })));
    await expect(loginWithPassword("a@b.vn", "x")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
