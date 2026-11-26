"use client";

import { isOnboarded, type MeResponse } from "@loopedu/shared";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, buttonClass, useToast } from "@/components/shared";
import { getMe, logout } from "@/lib/auth";

/**
 * Góc phải header: chưa đăng nhập thì link "Đăng nhập"; đã đăng nhập thì avatar mở menu tài khoản.
 * Access token chỉ nằm trong bộ nhớ nên mỗi lần tải trang phải khôi phục phiên bằng refresh cookie (getMe tự làm).
 */
export function AccountMenu() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const toast = useToast();

  useEffect(() => {
    getMe().then(setMe, () => setMe(null));
  }, []);

  // <details> không tự đóng khi bấm ra ngoài.
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current?.open && !menuRef.current.contains(e.target as Node)) menuRef.current.open = false;
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  if (!me)
    return (
      // Điện thoại: ẩn để nhường chỗ cho nút "Học thử miễn phí", như header cũ.
      <span className="hidden sm:block">
        <Link href="/login" className={buttonClass({ variant: "ghost" })}>
          Đăng nhập
        </Link>
      </span>
    );

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
      setMe(null);
      toast("Đã đăng xuất.", "success");
    } catch {
      toast("Chưa đăng xuất được. Kiểm tra mạng rồi thử lại.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details ref={menuRef} className="relative">
      <summary
        aria-label="Tài khoản"
        className="type-label flex size-11 cursor-pointer list-none items-center justify-center rounded-full bg-selected text-heading uppercase [&::-webkit-details-marker]:hidden"
      >
        {me.email[0]}
      </summary>
      <div className="absolute right-0 z-30 mt-2 flex w-64 flex-col gap-1 rounded-md border border-line bg-surface p-2 shadow-2">
        <p className="type-caption truncate px-3 py-2 text-fg-secondary">{me.email}</p>
        {isOnboarded(me.profile) ? (
          <Link href="/practice" className={buttonClass({ variant: "ghost", fullWidth: true })}>
            Luyện tập
          </Link>
        ) : (
          <Link href="/onboarding" className={buttonClass({ variant: "ghost", fullWidth: true })}>
            Hoàn tất thiết lập
          </Link>
        )}
        <Button variant="ghost" fullWidth loading={busy} onClick={() => void onLogout()}>
          {busy ? "Đang đăng xuất…" : "Đăng xuất"}
        </Button>
      </div>
    </details>
  );
}
