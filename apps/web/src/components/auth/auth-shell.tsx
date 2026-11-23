import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon, Logo } from "@/components/shared";

// Chiều cao các cột sóng âm ở chân trang (trang trí).
const BARS = [62, 91, 88, 110, 112, 125, 128, 130, 136, 125, 131, 109, 114, 85, 86, 58, 48, 46, 69, 90, 105, 130, 136, 163, 158, 183, 174, 189, 178, 178, 166, 152, 140, 114, 103, 67, 59, 31, 69, 79, 109, 120, 138, 150, 155, 166, 158, 168, 147, 156, 131, 133, 110, 102, 83, 68, 55, 34, 53, 53, 77, 68, 91, 83];

/** Khung chung của các màn đăng nhập (nền hero tối, thẻ trắng nổi). Nền và token dùng chung với landing. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-lp-hero">
      <div aria-hidden="true" className="absolute inset-x-0 -bottom-2 flex h-40 items-end justify-center gap-2.5 overflow-hidden">
        {BARS.map((h, i) => (
          <span key={i} className="w-2.5 shrink-0 rounded-full bg-lp-lime/20" style={{ height: h }} />
        ))}
      </div>

      <header className="relative mx-auto flex w-full max-w-content items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center">
          <Logo name="horizontal-reverse" width={148} priority />
        </Link>
        <Link href="/" className="type-label inline-flex min-h-11 items-center gap-2 text-selected">
          <ArrowLeftIcon className="size-4.5 text-lp-lime" />
          Về trang chủ
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pt-2 pb-8 sm:pt-12">
        <div className="relative w-full max-w-120 rounded-lg bg-surface p-5 shadow-lp-float sm:px-8 sm:py-7">{children}</div>
      </main>
    </div>
  );
}
