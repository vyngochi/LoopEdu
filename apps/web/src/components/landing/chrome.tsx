import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, buttonClass, cx } from "@/components/shared";
import { ANCHOR, NAV } from "./content";

/** Khối nội dung của một mục landing: nền full-width, nội dung giới hạn 1200 px. */
export function Section({
  id,
  labelledBy,
  className,
  innerClassName,
  children,
}: {
  id?: string;
  labelledBy: string;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cx("scroll-mt-16 py-24", className)}>
      <div className={cx("mx-auto flex max-w-content flex-col gap-10 px-6", innerClassName)}>{children}</div>
    </section>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-6 py-3">
        <a href="#top" aria-label="LoopEdu – về đầu trang" className="flex min-h-11 shrink-0 items-center">
          <Logo width={148} priority />
        </a>
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="type-label px-3 py-2.5 text-fg">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <Link href="/login" className={buttonClass({ variant: "ghost" })}>
              Đăng nhập
            </Link>
          </span>
          <a href={`#${ANCHOR.start}`} className={buttonClass({ variant: "primary" })}>
            Học thử miễn phí
          </a>
        </div>
      </div>
    </header>
  );
}

const FOOTER_LINK = "text-selected hover:text-on-primary";

export function Footer() {
  return (
    <footer className="bg-lp-deep py-14 pb-8 text-selected">
      <div className="mx-auto flex max-w-content flex-col gap-8 px-6">
        <div className="flex flex-wrap justify-between gap-8">
          <div className="flex max-w-sm flex-1 basis-70 flex-col gap-3">
            <Logo name="horizontal-reverse" width={160} />
            <p className="type-label font-normal">
              Ứng dụng luyện nói tiếng Anh theo đề IELTS và TOEIC: 10 phút mỗi ngày, phản hồi có dẫn chứng, ôn lại sau 3 – 7 – 21 ngày.
            </p>
          </div>
          <nav aria-label="Liên kết cuối trang" className="type-label flex flex-wrap gap-10 font-normal">
            <div className="flex flex-col gap-2.5">
              <span className="font-bold text-on-primary">Sản phẩm</span>
              <a href={`#${ANCHOR.how}`} className={FOOTER_LINK}>Cách hoạt động</a>
              <a href={`#${ANCHOR.features}`} className={FOOTER_LINK}>Tính năng</a>
              <a href={`#${ANCHOR.faq}`} className={FOOTER_LINK}>Hỏi đáp</a>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="font-bold text-on-primary">Pháp lý</span>
              {/* Chưa có trang chính sách: tạm trỏ về đầu trang. */}
              <a href="#top" className={FOOTER_LINK}>Chính sách quyền riêng tư</a>
              <a href="#top" className={FOOTER_LINK}>Điều khoản sử dụng</a>
            </div>
          </nav>
        </div>
        <div className="type-caption flex flex-wrap justify-between gap-3 border-t border-selected/20 pt-5 text-lp-mist">
          <span>© 2026 LoopEdu</span>
          <span className="max-w-3xl">
            LoopEdu cung cấp nội dung và phản hồi luyện tập, không phải tài liệu hay điểm thi chính thức, và không được British Council, IDP, Cambridge hay ETS chứng nhận.
          </span>
        </div>
      </div>
    </footer>
  );
}
