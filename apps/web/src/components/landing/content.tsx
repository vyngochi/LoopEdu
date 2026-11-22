import type { ReactNode } from "react";

/** Nội dung landing. Anchor `id` ở đây là nguồn duy nhất cho menu, chân trang và các nút CTA. */
export const ANCHOR = {
  leaderboard: "bang-xep-hang",
  how: "cach-hoat-dong",
  features: "tinh-nang",
  pricing: "chi-phi",
  faq: "hoi-dap",
  start: "bat-dau",
} as const;

export const NAV = [
  { href: `#${ANCHOR.leaderboard}`, label: "Bảng xếp hạng" },
  { href: `#${ANCHOR.how}`, label: "Cách dùng" },
  { href: `#${ANCHOR.features}`, label: "Tính năng" },
  { href: `#${ANCHOR.pricing}`, label: "Chi phí" },
  { href: `#${ANCHOR.faq}`, label: "Hỏi đáp" },
];

export const PROBLEMS = [
  { quote: "“Hôm nay luyện gì đây?”", title: "Để Loopi gợi ý cho bạn", body: "Bài ôn đến hạn xếp trước, rồi tới một bài mới đúng lộ trình và trình độ bạn chọn." },
  { quote: "“Bí ý, không biết nói gì.”", title: "Cá nhân hóa bài nói", body: "Bài mẫu dùng tên, thành phố, công việc, sở thích bạn điền để bạn đọc theo thành tiếng ngay từ lần đầu." },
  { quote: "“Không biết mình sai ở đâu.”", title: "Loopi sẽ nhận xét", body: "Từ phát âm chưa chuẩn được tô màu, chỗ ngắt quãng và ý còn thiếu được chỉ ra kèm câu gợi ý." },
  { quote: "“Học xong vài hôm là quên.”", title: "Spaced Repetition", body: "Sau 3, 7 và 21 ngày, bạn tắt bài mẫu, tự nói lại và so sánh với lần đầu." },
];

export const STEPS = [
  { pose: "happy", width: 170, alt: "Loopi vui vẻ vẫy tay chào", title: "Chọn bài hôm nay", body: "Chọn dạng đề bạn muốn luyện tập. Mỗi ngày app gợi ý sẵn bài ôn và bài mới, hoặc để Loopi gợi ý đề theo yêu cầu của bạn." },
  { pose: "scene-speak", width: 210, alt: "Loopi đeo tai nghe, cầm micro đọc theo bài mẫu", title: "Đọc theo và ghi âm", body: "Đọc theo bài mẫu cá nhân hóa, bấm ghi âm, nghe lại rồi gửi chấm." },
  { pose: "scene-feedback", width: 220, alt: "Loopi ngồi trước laptop xem phản hồi", title: "Xem Loopi nhận xét", body: "Thường có kết quả trong khoảng một phút: Loopi chỉ ra từ vựng bạn cần cải thiện phát âm, nghe lại đoạn bạn nói." },
  { pose: "scene-review", width: 210, alt: "Loopi bên lịch ôn 3-7-21 với các ô đã đánh dấu", title: "Bạn ôn tập lại", body: "Ôn tập lại bài nói sau 3 ngày, 7 ngày và 21 ngày, thực hiện khảo sát để Loopi hiểu bạn hơn." },
] as const;

const svgProps = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const FEATURES: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <svg {...svgProps}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>, title: "Bài mẫu cá nhân hóa", body: "Bài mẫu cá nhân hóa các thông tin như tên, địa chỉ, sở thích của bạn." },
  { icon: <svg {...svgProps}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>, title: "Word pattern và Sổ pattern", body: "5–8 cụm dùng lại được trong mỗi bộ đề, có nghĩa tiếng Việt kèm ví dụ." },
  { icon: <svg {...svgProps}><circle cx="12" cy="12" r="3" /><path d="M12 3v6M12 15v6M3 12h6M15 12h6" /></svg>, title: "Sơ đồ khung ý", body: "Mind map, timeline, 5W1H hoặc Answer – Reason – Example." },
  { icon: <svg {...svgProps}><path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" /></svg>, title: "Phản hồi hiệu quả", body: "Chỉ số phát âm và độ trôi chảy, transcript tô từ, nhận xét theo các tiêu chí, kèm câu gợi ý nói lại." },
  { icon: <svg {...svgProps}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>, title: "Chủ đề theo yêu cầu", body: "Gõ chủ đề bằng tiếng Việt hoặc tiếng Anh. Loopi sẽ gợi ý cho bạn đề mới ngay." },
  { icon: <svg {...svgProps}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>, title: "Lịch ôn và bảng so sánh", body: "Mỗi bài hoàn thành tự có 3 lượt ôn. Mỗi lần ôn, bạn thấy chỉ số trực quan về sự tiến bộ." },
];

export const PERSONAS = [
  { title: "Người tự học bận rộn", body: "Sinh viên hoặc người mới đi làm đang ôn IELTS hay TOEIC, chỉ có 5–15 phút mỗi ngày. Mở app là có ngay một bài vừa sức." },
  { title: "Người hay bí ý khi nói", body: "Đọc hiểu tốt nhưng ít khi nói thành tiếng. Đọc theo bài mẫu trước, rồi dần tắt mẫu và tự nói được." },
];

export const PRICING_GROUPS = [
  { title: "Luyện nói", items: ["Không giới hạn bài luyện IELTS và TOEIC", "Bài mẫu cá nhân hóa, sơ đồ ý và word pattern", "Gõ chủ đề riêng, tạo tối đa 3 đề mới mỗi ngày"] },
  { title: "Phản hồi", items: ["10 lượt chấm ghi âm mỗi tháng", "Phát âm từng từ, độ trôi chảy, nhận xét theo tiêu chí đề", "Nói thử pattern 10 câu/ngày, không trừ lượt"] },
  { title: "Ôn tập", items: ["Không giới hạn lịch ôn 3 – 7 – 21", "Bảng so sánh giữa lần học và lần ôn", "Chuỗi ngày luyện và bảng xếp hạng tuần"] },
  { title: "Linh hoạt", items: ["Hết lượt chấm vẫn tự nói và hoàn thành bài được", "Đổi lộ trình bất kỳ lúc nào", "Dùng trên điện thoại và máy tính"] },
];

export const FAQ = [
  { q: "Kết quả trên LoopEdu có phải điểm IELTS hay TOEIC không?", a: "Không. Đây là phản hồi luyện tập do AI tạo. Chỉ số phát âm và độ trôi chảy theo thang 0–100 của Azure, không quy đổi sang band IELTS hay điểm TOEIC, và LoopEdu không hứa tăng điểm." },
  { q: "Tôi cần gì để bắt đầu?", a: "Một trình duyệt trên điện thoại hoặc máy tính, một email để nhận link đăng nhập và micro (micro tai nghe là đủ). Phần thiết lập đầu tiên có bước thử mic." },
  { q: "Không muốn ghi âm thì có học được không?", a: "Được. Bạn chọn “Tự nói không ghi âm”, tự đánh giá rồi hoàn thành bài. Lịch ôn vẫn được tạo như bình thường." },
  { q: "Lịch ôn 3 – 7 – 21 hoạt động thế nào?", a: "Khi bạn hoàn thành một bài lần đầu, LoopEdu hẹn 3 lượt ôn sau 3, 7 và 21 ngày, đúng câu bạn đã học. Mức hỗ trợ giảm dần: lần đầu có bài mẫu, ngày 3 còn sơ đồ ý, ngày 7 và 21 bạn tự nói. Ôn trễ vẫn được, các mốc sau không bị dời." },
  { q: "Đề trên LoopEdu có phải đề thi thật không?", a: "Không. Đề và bài mẫu được soạn theo cấu trúc công khai của IELTS và TOEIC, qua kiểm tra tự động và được đội nội dung duyệt. Đề sinh theo yêu cầu của bạn mang nhãn “đang chờ duyệt” cho đến khi được duyệt." },
  { q: "LoopEdu có mất phí không?", a: "Trong beta, LoopEdu miễn phí với 10 lượt chấm mỗi tháng, làm mới vào ngày 1. Chưa có thanh toán trong app; mọi thay đổi về gói sẽ được báo trước." },
];

/** Dữ liệu minh họa cho bảng xếp hạng, xếp theo thứ tự hiển thị (đỉnh ở giữa). */
export const LEADERBOARD = [
  { rank: 6, name: "Gia Huy", initials: "GH", minutes: 38, days: 5 },
  { rank: 4, name: "Hoàng Nam", initials: "HN", minutes: 47, days: 6 },
  { rank: 2, name: "Quốc Bảo", initials: "QB", minutes: 61, days: 7 },
  { rank: 1, name: "Minh Anh", initials: "MA", minutes: 74, days: 7 },
  { rank: 3, name: "Thảo Vy", initials: "TV", minutes: 58, days: 6 },
  { rank: 5, name: "Lan Chi", initials: "LC", minutes: 42, days: 5 },
  { rank: 7, name: "Ngọc Mai", initials: "NM", minutes: 33, days: 4 },
];
export const YOU = { rank: 24, minutes: 21, days: 3 };
