import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyLink } from "@/components/auth/verify-link";

export const metadata: Metadata = { title: "Đang đăng nhập – LoopEdu", robots: { index: false } };

export default function VerifyPage() {
  return (
    <AuthShell>
      <Suspense>
        <VerifyLink />
      </Suspense>
    </AuthShell>
  );
}
