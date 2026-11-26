<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI rules · khu vực học tập (đã đăng nhập)

Đọc [`DESIGN.md`](DESIGN.md) trước khi làm bất kỳ màn hoặc thành phần nào. Nguồn gốc: LoopEdu UI Components v1.0 (`../Documents/LoopEdu_Brand_Guidelines.html`).

- **Tái sử dụng trước**: dùng component trong `@/components/shared` (bảng "Component dùng chung" trong DESIGN.md). Không viết lại nút, ô nhập, checkbox, tag, banner, hộp thoại hay icon ở tính năng.
- Thiếu biến thể: mở rộng component trong `shared` (thêm prop), không sao chép ra chỗ khác. Component mới dùng ở ≥ 2 màn thì đặt vào `shared`, export ở `index.ts`, thêm một dòng vào bảng trong DESIGN.md.
- Component trong `shared` không có hook thì để là Server Component; chỉ file cần state/effect mới có `"use client"` (như `dialog.tsx`).
- **Chỉ dùng token** trong `src/styles/tokens-app.css`. Không viết mã màu hex/rgb, không `style={{ color: ... }}`, không `bg-[#...]`. Class mặc định như `bg-green-500`, `rounded-xl`, `shadow-md`, `md:` không sinh CSS.
- Chữ dùng `type-*`. Khoảng cách bội số 4. Bo góc chỉ `rounded-xs|sm|md|lg|full`. Bóng chỉ `shadow-1|2|3`.
- Điện thoại trước: class cho 360 px, rồi `sm:` (≥ 600), `lg:` (≥ 1024).
- Vùng chạm ≥ 44 px; nút icon dùng `IconButton` (bắt buộc `label`); trạng thái không chỉ dựa vào màu; không `outline-none` trừ ô nhập có vòng focus riêng.
- Hạn chế cuộn: mỗi màn vừa một khung nhìn và nút chính luôn thấy được. Form dài thì chia bước, không tự cuộn trang (DESIGN.md · Nguyên tắc 7).
- Mỗi màn một `Button variant="primary"`, tối đa một `RecordButton`. Không hiển thị hay suy ra band IELTS / điểm TOEIC.
- Logo và Loopi chỉ dùng qua `Logo`, `Loopi` (file ở `src/assets/brand/`), đúng mục "Logo & Loopi" trong DESIGN.md. Không dùng Loopi ở lỗi, consent, xóa dữ liệu.
- Landing (chưa đăng nhập) dùng token riêng ở `src/styles/tokens-landing.css`; không sửa `tokens-app.css` cho landing.
