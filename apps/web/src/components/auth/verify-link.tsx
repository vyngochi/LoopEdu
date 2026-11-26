"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Spinner } from "@/components/shared";
import { pathAfterSignIn, verifyMagicLink } from "@/lib/auth";

/** Đích của link trong email: đổi token lấy phiên, rồi vào app. Token dùng một lần nên chỉ gọi đúng một lần. */
export function VerifyLink() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode chạy effect hai lần ở dev; lần hai sẽ làm token hết hiệu lực.
    started.current = true;
    if (!token) return router.replace("/login?expired=1");
    verifyMagicLink(token).then(
      async () => router.replace(await pathAfterSignIn()),
      () => router.replace("/login?expired=1"),
    );
  }, [token, router]);

  return (
    <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
      <Spinner className="size-8 text-primary" />
      <p className="type-title text-heading">Đang đăng nhập…</p>
      <p className="type-caption text-fg-secondary">Vài giây nữa là xong.</p>
    </div>
  );
}
