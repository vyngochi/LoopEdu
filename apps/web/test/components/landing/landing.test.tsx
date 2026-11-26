import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Landing } from "@/components/landing";
import { ToastProvider } from "@/components/shared";
import { ANCHOR, FAQ, LEADERBOARD, NAV, PRICING_GROUPS, STEPS } from "@/components/landing/content";

// ToastProvider nằm ở layout gốc; menu tài khoản trên header cần nó.
const html = renderToStaticMarkup(<ToastProvider><Landing /></ToastProvider>);
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const hrefs = [...html.matchAll(/\shref="#([^"]*)"/g)].map((m) => m[1]);

describe("Landing", () => {
  it("có đúng một h1 và đủ các mục chính", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    for (const id of Object.values(ANCHOR)) expect(ids, `thiếu #${id}`).toContain(id);
    expect(ids).toContain("top");
  });

  it("mọi liên kết neo trỏ tới một id có thật", () => {
    expect(hrefs.length).toBeGreaterThan(10);
    for (const h of hrefs) expect(ids, `#${h} không tồn tại`).toContain(h);
  });

  it("menu chính trỏ vào các mục có trên trang", () => {
    for (const item of NAV) expect(ids).toContain(item.href.slice(1));
  });

  it("không còn chỗ giữ chỗ chưa điền", () => {
    expect(html).not.toMatch(/\[(Tên thật|Nghề|số|x,x|Ảnh thật|Trích dẫn)/);
  });

  it("không hứa điểm hay band IELTS/TOEIC", () => {
    expect(html).not.toMatch(/band\s*\d|tăng\s+\d+\s*điểm|đảm bảo/i);
    expect(html).toContain("không phải điểm IELTS hay TOEIC chính thức");
  });

  it("mỗi ảnh có thuộc tính alt", () => {
    const imgs = html.match(/<img\b[^>]*>/g) ?? [];
    expect(imgs.length).toBeGreaterThanOrEqual(STEPS.length + 2);
    for (const img of imgs) expect(img).toMatch(/\balt="/);
  });

  it("form email có type=email, bắt buộc và có nhãn", () => {
    expect(html).toMatch(/<input[^>]*type="email"[^>]*required|<input[^>]*required[^>]*type="email"/);
    expect(html).toContain("Email của bạn");
  });

  it("FAQ: câu đầu mở sẵn, đủ số câu", () => {
    expect(html.match(/<details\b/g)).toHaveLength(FAQ.length);
    expect(html.match(/<details[^>]*\bopen=""/g)).toHaveLength(1);
  });

  it("bảng xếp hạng có nhãn đọc được và dữ liệu nhất quán", () => {
    expect(html).toContain("Hạng 1: Minh Anh, 74 phút nói, 7 trên 7 ngày luyện");
    expect(html).toContain("Hạng 24: Bạn");
    expect(html).toContain("Dữ liệu minh họa");
    expect(new Set(LEADERBOARD.map((p) => p.rank)).size).toBe(LEADERBOARD.length);
    for (const p of LEADERBOARD) expect(p.days).toBeLessThanOrEqual(7);
  });

  it("gói giá nhất quán: 10 lượt chấm, 0đ, mỗi nhóm có mục", () => {
    expect(html).toContain("0đ");
    expect(html.match(/10 lượt chấm/g)!.length).toBeGreaterThanOrEqual(2);
    for (const g of PRICING_GROUPS) expect(g.items.length).toBeGreaterThan(0);
  });

  it("không dùng màu cứng: không hex/rgb trong style, không class màu mặc định", () => {
    expect(html).not.toMatch(/style="[^"]*(#[0-9a-f]{3,8}|rgb)/i);
    expect(html).not.toMatch(/\b(?:bg|text|border)-(?:green|red|gray|slate|blue)-\d/);
  });
});
