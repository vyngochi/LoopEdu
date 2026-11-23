import type { Metadata } from "next";
import { Be_Vietnam_Pro, Nunito, Playwrite_VN } from "next/font/google";
import { ToastProvider } from "@/components/shared";
import "./globals.css";

// Both families ship a Vietnamese subset, so diacritics never fall back to another font.
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
});

// Chỉ cho chữ "theo" ở hero. Font này không có subset nên Next không preload.
const playwriteVn = Playwrite_VN({
  variable: "--font-playwrite-vn",
  weight: "300",
});

export const metadata: Metadata = {
  title: "LoopEdu – Luyện nói tiếng Anh 10 phút mỗi ngày theo đề IELTS, TOEIC",
  description:
    "Luyện Speaking IELTS Part 1–2 và TOEIC Speaking 10 phút mỗi ngày: đọc theo bài mẫu nói về chính bạn, ghi âm, nhận phản hồi phát âm từng từ và ôn lại sau 3–7–21 ngày. Miễn phí trong beta.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${nunito.variable} ${playwriteVn.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
