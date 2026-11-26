import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Đăng nhập – LoopEdu" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell>
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

// `?expired=1` do trang xác minh link chuyển sang khi link sai hoặc hết hạn.
async function Form({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { expired } = await searchParams;
  return <LoginForm initialScreen={expired ? "expired" : "choose"} />;
}
