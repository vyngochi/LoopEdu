import { afterEach, describe, expect, it, vi } from "vitest";
import { birthYearError } from "@/components/onboarding/onboarding-form";
import { getMe, pathAfterSignIn, refreshSession } from "@/lib/auth";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const profile = (over: object = {}) => ({
  id: "00000000-0000-4000-8000-000000000000",
  email: "a@b.vn",
  roles: ["learner"],
  hasPassword: false,
  profile: {
    timezone: null, displayName: null, level: null, dailyGoalMinutes: null, examTrack: null, birthYear: null,
    guardianConsent: false, preferredName: null, cityKey: null, occupationKey: null, hobbyKeys: [], ...over,
  },
});

describe("birthYearError", () => {
  const year = new Date().getFullYear();
  it("nhận người đủ 14 tuổi theo năm, từ chối 13", () => {
    expect(birthYearError(String(year - 14))).toBeNull();
    expect(birthYearError(String(year - 13))).toMatch(/từ 14 tuổi/);
  });
  it("bắt nhập đủ 4 chữ số", () => {
    expect(birthYearError("")).toMatch(/4 chữ số/);
    expect(birthYearError("206")).toMatch(/4 chữ số/);
  });
});

describe("auth client có token", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("chưa có token thì refresh trước, rồi gửi Bearer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(json({ accessToken: "fresh", expiresIn: 900 }))
        .mockResolvedValueOnce(json(profile())),
    );
    await getMe();
    expect(fetch).toHaveBeenNthCalledWith(1, expect.stringContaining("/auth/refresh"), expect.anything());
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/v1/me"),
      expect.objectContaining({ method: "GET", headers: { Authorization: "Bearer fresh" } }),
    );
  });

  it("hai lần refresh cùng lúc chỉ gửi một request (refresh token xoay vòng)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ accessToken: "once", expiresIn: 900 })));
    await Promise.all([refreshSession(), refreshSession()]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("đi tới /onboarding khi hồ sơ chưa đủ, về / khi đã đủ", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json(profile())));
    expect(await pathAfterSignIn()).toBe("/onboarding");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(json(profile({ birthYear: 2000, timezone: "Asia/Ho_Chi_Minh", examTrack: "ielts" }))),
    );
    expect(await pathAfterSignIn()).toBe("/");
  });
});
