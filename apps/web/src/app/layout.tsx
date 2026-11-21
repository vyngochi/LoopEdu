import type { Metadata } from "next";
import { Be_Vietnam_Pro, Nunito } from "next/font/google";
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

export const metadata: Metadata = {
  title: "LoopEdu – Luyện nói tiếng Anh mỗi ngày",
  description:
    "Luyện nói tiếng Anh 10 phút mỗi ngày theo dạng đề IELTS hoặc TOEIC, nhận phản hồi từng từ và ôn lại sau 3, 7, 21 ngày.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
