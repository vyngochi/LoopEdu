# DESIGN · khu vực học tập (đã đăng nhập)

Nguồn: **LoopEdu UI Components v1.0** (`../Documents/LoopEdu_Brand_Guidelines.html`, trang UI 00–07). Landing có token và quy tắc riêng.

## Nguyên tắc

1. **Điện thoại trước**: viết class cho 360 px, thêm `sm:` (≥ 600) và `lg:` (≥ 1024).
2. **Vùng chạm ≥ 44 × 44 px**.
3. **Không chỉ dựa vào màu**: trạng thái luôn kèm icon, gạch chân hoặc chữ.
4. **Một hành động chính**: mỗi màn một nút `primary`, tối đa một `RecordButton`.
5. WCAG 2.1 AA. Giữ viền focus toàn cục (đã có trong `globals.css`).
6. Không hiển thị, không suy ra band IELTS hay điểm TOEIC. Điểm Azure luôn ghi "thang Azure 0–100", không tô màu đạt/trượt.
7. **Hạn chế cuộn**: ở trạng thái mặc định, mỗi màn vừa một khung nhìn (điện thoại 360 × 740, máy tính 1366 × 768) và nút chính luôn thấy được mà không cần cuộn.
   - Form có hơn 4 nhóm trường thì chia bước, mỗi bước 1–3 nhóm, kèm tiến độ "Bước 2/4" và nút "Quay lại". Ví dụ onboarding: năm sinh → lộ trình và mức nội dung → mục tiêu và múi giờ → thử mic.
   - Nội dung dài tự nhiên (bài mẫu, transcript, lịch sử, danh sách) được cuộn, nhưng header và thanh hành động phải dính trên hoặc dưới (`sticky`) để không phải cuộn mới bấm được.
   - Không tự cuộn hay nhảy trang (`scrollIntoView`, `autoFocus` ở ô dưới màn, nội dung chèn thêm làm đẩy layout). Ngoại lệ duy nhất là khi submit lỗi thì đưa ô lỗi đầu tiên vào tầm nhìn.
   - Thứ hiện thêm sau thao tác (banner, gợi ý, kết quả) phải giữ chỗ sẵn hoặc mở trong `Dialog` / sheet, không đẩy nút chính xuống dưới màn.
8. Loopi chỉ ở trạng thái trống và thẻ Bài hôm nay. Lỗi, consent, xóa dữ liệu dùng icon (xem "Logo & Loopi").

## Component dùng chung

Import từ `@/components/shared`. **Tìm ở đây trước khi viết mới.** Đọc JSDoc trong file để biết cách dùng.

| Cần | Dùng | Ghi chú |
| --- | --- | --- |
| Nút | `Button` `variant` primary · secondary · outline · ghost · danger, `size` l · m · s | `loading` hiện spinner, đổi nhãn ở nơi gọi ("Đang gửi…"). `danger` chỉ cho xóa không hoàn tác |
| Liên kết trông như nút | `<Link className={buttonClass({ variant, size })}>` | |
| Nút chỉ có icon | `IconButton label="…"` filled · tonal · outline · ghost, `pressed` cho bật/tắt | `label` bắt buộc |
| Nút ghi âm | `RecordButton state` ready · recording · scoring · done · unavailable, `level` 0–1 | Chữ trạng thái đặt dưới nút |
| Ô nhập | `TextField`, `TextArea` với `label`, `hint`, `error` | Có `value` + `maxLength` thì tự hiện bộ đếm |
| Chọn từ danh sách dài | `SelectField` với `label`, `hint`, `error`, con là `<option>` | vd. múi giờ; ≤ 4 mục thì dùng `SegmentedControl` |
| Checkbox, radio, công tắc | `Checkbox`, `Radio`, `Switch` với `label`, `description` | Nhóm radio đặt trong `<fieldset>` + `<legend>` |
| Chọn 1 trong 2–4 mục | `SegmentedControl` | Radio gốc, dùng được trong `<form>` |
| Nhãn tĩnh | `Tag tone` brand · neutral · success · warning · celebrate | IELTS `brand`, TOEIC `neutral` |
| Lọc bật/tắt | `Chip selected` | |
| Thông báo trong trang | `Banner tone` info · success · warning · error | `AiFeedbackBanner` cho màn kết quả |
| Thẻ | `Card as="article"`, hoặc `cardClass` cho thẻ là liên kết | |
| Đang tải | `Skeleton` cho danh sách, thẻ; `Spinner` cho hành động ngắn | Quá 3 giây phải nói đang làm gì |
| Trống | `EmptyState loopi title description action` | `loopi` mặc định `happy` |
| Logo | `Logo name width` | Xem "Logo & Loopi" |
| Mascot | `Loopi pose width` | Xem "Logo & Loopi" |
| Thông báo ngắn (lỗi gửi form, đã lưu) | `useToast()` → `toast(message, "info" · "success" · "error")` | `ToastProvider` đã nằm ở layout gốc. Tự ẩn sau 5 giây, lỗi đọc to (`role="alert"`). Lỗi theo từng ô vẫn dùng `error` của `TextField`; lỗi cả trang dùng `Banner` |
| Hộp thoại, bottom sheet | `Dialog variant` dialog · alert · sheet | Client component. Nút an toàn đặt `autoFocus` |
| Icon | `CheckIcon`, `AlertIcon`, `InfoIcon`, `ArrowLeftIcon`, `CloseIcon`, `MicIcon`, `MicOffIcon`, `StopIcon`, `Spinner` | Nét 2 px, lưới 24 px |
| Ghép class | `cx(...)` | Không có tailwind-merge: class truyền vào không ghi đè class cùng thuộc tính |

**Thêm component mới vào `shared`** khi nó xuất hiện ở ≥ 2 màn hoặc có trong guideline UI 02–04/07. Thành phần chỉ thuộc một tính năng đặt trong thư mục của tính năng đó và ghép từ component dùng chung. Thêm vào `shared` thì export ở `index.ts` và thêm một dòng vào bảng trên.

Chưa làm (dựng khi màn đầu tiên cần, theo spec bên dưới): Tooltip, Tabs, phân trang, hẹn giờ, tiến trình theo bước, thanh điều hướng.

## Logo & Loopi

File gốc: `Brand/loopedu-brand-assets/v1` (ngoài repo). Bản dùng cho web nằm ở `src/assets/brand/`, import tĩnh qua `Logo` và `Loopi` để có tên file kèm hash (cache lâu dài), tự có kích thước, và Next tự tối ưu PNG. **Không** dùng `<img>` hay `next/image` trực tiếp với các file này. Chỉ chép PNG vào `public/brand/` khi cần URL cố định (logo trong email, ảnh og).

**Logo** · `<Logo name="…" width={…} />`

| `name` | Dùng khi | Rộng mặc định |
| --- | --- | --- |
| `horizontal` | Thanh trên máy tính, header: mặc định | 140 |
| `horizontal-reverse` | Trên nền tối `bg-inverse` | 140 |
| `primary` | Logo có tagline, đứng một mình: đăng nhập, onboarding | 220 |
| `mark` | Chỗ hẹp: thanh trên điện thoại, avatar hệ thống | 40 |
| `mark-reverse` | Biểu tượng trên nền tối | 40 |

- Không đổi màu, kéo méo, xoay, thêm bóng hay viền; chỉ chỉnh `width`.
- Logo ở đầu trang đặt `priority`. Logo là liên kết về trang chủ thì bọc trong `<Link href="/">`, giữ `alt="LoopEdu"`.
- Bản `-mono` (in 1 màu) và bản ngang không tia sáng (cho logo dưới 160 px) chưa có SVG trong Brand v1 nên chưa chép vào. Logo ngang dưới 160 px tạm dùng `horizontal`.
- Favicon `src/app/icon.svg` và `src/app/apple-icon.png` (180 px) lấy từ app-icon; Next tự sinh thẻ `<link>`.

**Loopi** · `<Loopi pose="…" width={…} />`

| `pose` | Dùng khi |
| --- | --- |
| `happy` | Trạng thái trống "chưa có gì để làm" (hôm nay không có bài ôn), thẻ Bài hôm nay |
| `curious` | Trạng thái trống "chưa tìm thấy" (chưa có đề cho chủ đề này, tìm không ra) |
| `excited` | Đề xuất: trống sau khi đã làm xong hết (xong mọi bài ôn hôm nay) |
| `notes` | Đề xuất: trống ở Sổ pattern, lịch sử |
| `speaking` | Đề xuất: trống liên quan luyện nói |
| `main`, `scene-speak`, `scene-review`, `scene-feedback` | Minh họa lớn cho landing, onboarding; không dùng trong màn học |

- Cỡ: trạng thái trống 110–120 px (mặc định của `EmptyState`), trong thẻ Bài hôm nay 72 px. 5 biểu cảm `happy`, `curious`, `excited`, `speaking`, `notes` vẽ gốc khoảng 80 px nên viền nhòe khi to: **không vượt 160 px**.
- `alt=""` mặc định vì Loopi minh họa cho chữ bên cạnh; chỉ điền khi hình mang nghĩa riêng.
- **Không dùng Loopi** ở lỗi hệ thống, banner, consent ghi âm, xóa dữ liệu, kết quả chấm. Ở đó dùng icon.
- Guideline chưa thống nhất: UI 04 ghi "Loopi chỉ ở trạng thái trống" nhưng UI 05 có Loopi 72 px trong thẻ Bài hôm nay. Tạm cho phép cả hai chỗ này, không thêm chỗ khác.

## Token

Định nghĩa ở `src/styles/tokens-app.css`. Bảng màu, bo góc, bóng, điểm ngắt mặc định của Tailwind đã tắt: `bg-green-500`, `rounded-xl`, `shadow-md`, `md:` không sinh CSS. Không viết mã màu trong code.

| Vai trò | Class |
| --- | --- |
| Primary (nút, link) | `primary`, `primary-hover`, `primary-pressed` |
| Nút ghi âm, gạch chân pattern | `record` |
| Streak | `celebrate`, `bg-celebrate-bg`, `text-celebrate-fg` |
| Chữ | `text-fg` (chính), `text-fg-secondary`, `text-fg-muted`, `text-heading` (tiêu đề), `text-on-primary` |
| Nền | `bg-surface` (trắng), `bg-subtle` (khối nền), `bg-selected` (Mint: chọn, chip), `bg-warm`, `bg-inverse` (toast), `bg-disabled`, `bg-overlay` (lớp phủ) |
| Viền | `border-line` (thẻ, kẻ), `border-line-input` (ô nhập), `border-focus`, `border-error` |
| Success / info | `text-primary bg-selected` / `text-fg-secondary bg-subtle` |
| Warning | `text-warning`, `bg-warning-bg`, `text-warning-fg`; thẻ quá hạn `bg-warning-subtle border-warning-line` |
| Error | `text-error`, `bg-error-bg` |
| Chữ | `type-display` · `type-h1` · `type-h2` (Nunito) · `type-title` · `type-reading` (bài mẫu, transcript) · `type-body` · `type-label` · `type-caption` · `type-overline` |
| Khoảng cách | bội số 4: trong thẻ `p-4`–`p-5`, giữa thẻ `gap-3`–`gap-4`, giữa khối `gap-6`–`gap-8`, lề điện thoại `px-4` |
| Bo góc | `rounded-xs` (tô từ) · `sm` (ô nhập, thẻ nhỏ) · `md` (thẻ, banner, toast, menu) · `lg` (panel, hộp thoại, sheet) · `full` (nút, chip) |
| Bóng | `shadow-1` (thẻ) · `shadow-2` (menu, toast, nút ghi âm) · `shadow-3` (hộp thoại, sheet) |
| Chuyển động | `duration-150` hover/nhấn · `duration-250` thẻ mở, chip · `duration-350` sheet, hộp thoại; `ease-out`. Form nhiều bước: `animate-step-next` / `animate-step-back` (trượt ngang 24 px + hiện dần, 250 ms) trên khối nội dung có `key={step}` |
| Bố cục | `max-w-content` (1200), `max-w-reading` (720, cột đọc màn luyện nói) |

Cần token mới: thêm vào `tokens-app.css` kèm tên guideline (`nhóm.vai-trò.trạng-thái`) trong comment, rồi thêm vào bảng trên.

## Spec thành phần theo tính năng

Ghép từ component dùng chung; chỉ ghi điều không tự suy ra được.

**Học (UI 05)**
- Thẻ Bài hôm nay: `type-overline` "Bài hôm nay", `type-title`, `Tag` lộ trình + mức nội dung + "~10 phút", `Button size="l"` "Bắt đầu luyện".
- Dòng bài ôn: tối đa 5 trên Home; quá hạn xếp đầu, không ẩn, nền `bg-warning-subtle border-warning-line`; mốc D+3/7/21 bên trái.
- Cue card IELTS Part 2: thời gian "Chuẩn bị 1:00 · Nói 1–2 phút", "You should say:" + gạch đầu dòng, nút "Mở gợi ý".
- Bài mẫu cá nhân hóa: `type-reading`. Pattern tô `<mark className="rounded-xs bg-selected px-1 font-semibold text-heading border-b-2 border-record">`, chạm mở thẻ pattern. Thiếu thông tin cá nhân thì dùng giá trị mặc định.
- Sơ đồ ý: ✓ đã nói / — chưa nói kèm câu gợi ý / ô trống để điền (ô từ khóa ≤ 4 từ). **Dưới 600 px chuyển thành danh sách dọc**, điều khiển được bằng bàn phím.
- Recorder sau khi ghi: "Ghi lại" (secondary) + "Gửi chấm · 1 lượt" (primary), chia đôi trên điện thoại. Ghi lại không tốn lượt. Bản ghi < 5 giây hoặc im lặng không gửi được và phải nói lý do.
- Consent trước lần ghi âm đầu: nêu Azure (Microsoft), OpenAI, tự xóa sau 7 ngày; checkbox đồng ý; "Tự nói không ghi âm" + "Đồng ý và ghi âm".
- Lịch ôn 3 – 7 – 21: ôn trễ không dời mốc còn lại.

**Kết quả (UI 06)**
- Có `AiFeedbackBanner`. Mỗi nhận xét trỏ vào từ, đoạn transcript hoặc chỉ số cụ thể.
- Transcript: từ cần luyện là `<button>` `bg-warning-bg text-warning-fg border-b-[2.5px] border-warning rounded-xs`, `aria-label="<từ>, cần luyện, chạm để nghe"`. Từ bỏ sót viền đứt `border-error`. Có chú giải ký hiệu.
- Chỉ số Azure: Phát âm, Độ trôi chảy, Độ đầy đủ (chỉ khi đọc theo). Không tô màu theo ngưỡng.
- Thẻ nhận xét: IELTS 4 tiêu chí, TOEIC 6 thẻ. Mỗi thẻ: nhận xét → trích dẫn → "Thử: …".
- So sánh lần học và lần ôn: tăng ▲ `text-primary`, giảm ▼ `text-fg-secondary`, **không dùng đỏ**; luôn ghi mức hỗ trợ.
- Thanh hành động cuối màn dính đáy trên điện thoại: "Phản hồi này sai" · "Nói lại" · "Tự đánh giá & hoàn thành".

**Trạng thái (UI 04)**
- Quota: "Còn 7/10 lượt · Làm mới ngày 1/12"; hết lượt vẫn "Tự nói không ghi âm".
- Streak: mất chuỗi không dùng đỏ, không trách.
- Toast: góc dưới, `bg-surface border-line rounded-md shadow-2`, trượt lên 250 ms khi hiện, icon + màu theo loại, tự ẩn sau 5 giây, `role="status"`, có thể kèm "Xem" / "Hoàn tác".
- Tooltip: hiện khi hover và focus bàn phím; điện thoại mở bằng chạm.
- Hẹn giờ: 10 giây cuối chuyển `warning` kèm chữ "sắp hết giờ".

**Điều hướng (UI 07)**
- Máy tính: thanh trên (Hôm nay · Chủ đề · Ôn tập · Sổ pattern · Lịch sử, bên phải quota, streak, avatar). Điện thoại: thanh dưới 5 mục (Hôm nay · Chủ đề · Ôn tập · Sổ pattern · Tôi), mỗi mục cao ≥ 52.
- Mục đang chọn: `bg-selected text-heading font-bold` + `aria-current="page"`, không chỉ đổi màu icon.
- **Trong phiên luyện ẩn điều hướng chính**, chỉ còn nút quay lại và tiến độ.
- Hộp thoại xác nhận xóa: `Dialog variant="alert"`, "Giữ lại" (ghost, `autoFocus`) + "Xóa dữ liệu" (danger).

## Giọng văn

- Tiếng Việt, ngắn, xưng "bạn". Nhãn nút là động từ, viết hoa kiểu câu, ≤ 4 từ; không "OK", "Tiếp tục", "Xác nhận".
- Lỗi nói cách sửa. Lỗi hệ thống không đổ lỗi người học và nói rõ lượt chấm có bị trừ không.
- Gọi "mức nội dung" (Foundation / Intermediate / Advanced), không gọi "band".
