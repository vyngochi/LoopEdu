"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  Button,
  Checkbox,
  Loopi,
  TextField,
  useToast,
} from "@/components/shared";
import { ApiRequestError } from "@/lib/api";
import {
  loginWithGoogle,
  loginWithPassword,
  requestMagicLink,
} from "@/lib/auth";
import { GoogleButton } from "./google-button";

export type LoginScreen = "choose" | "password" | "sent" | "expired";
type Task = "link" | "password" | "google";

const RESEND_SECONDS = 60;
const LINK_TTL_MINUTES = 15;

/** Lỗi nói cách sửa, không đổ lỗi người dùng. Đăng nhập sai không tiết lộ email có tồn tại hay không. */
export function errorMessage(err: unknown, task: Task): string {
  const code = err instanceof ApiRequestError ? err.code : "NETWORK";
  if (code === "NETWORK")
    return "Không kết nối được. Kiểm tra mạng rồi thử lại.";
  if (code === "SERVER")
    return "LoopEdu đang gặp sự cố. Thử lại sau ít phút.";
  if (code === "VALIDATION_FAILED")
    return "Email chưa đúng, ví dụ ban@email.com.";
  if (code === "QUOTA_EXCEEDED")
    return task === "link"
      ? "Bạn gửi quá nhiều link. Chờ vài phút rồi thử lại."
      : "Thử quá nhiều lần. Chờ vài phút hoặc dùng link qua email.";
  if (task === "password")
    return "Email hoặc mật khẩu chưa đúng.";
  if (task === "google")
    return "Chưa đăng nhập được bằng Google. Thử lại nhé.";
  return "Chưa gửi được link. Thử lại sau ít phút.";
}

const H1 =
  "text-3xl font-semibold leading-[1.15] tracking-[-0.03em] text-heading";
const SCRIPT =
  "inline-block -translate-y-[0.1em] -rotate-5 font-script text-[0.6em] font-light tracking-normal text-fg-secondary";

const Divider = ({ children }: { children: ReactNode }) => (
  <div className="type-caption flex items-center gap-3 text-fg-secondary">
    <span className="h-px flex-1 bg-line" />
    {children}
    <span className="h-px flex-1 bg-line" />
  </div>
);

export function LoginForm({
  initialScreen = "choose",
}: {
  initialScreen?: LoginScreen;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<LoginScreen>(initialScreen);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const toast = useToast();

  async function run(task: Task, action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      toast(errorMessage(err, task), "error");
    } finally {
      setBusy(false);
    }
  }

  const sendLink = () =>
    run("link", async () => {
      await requestMagicLink(email);
      setWait(RESEND_SECONDS);
      setScreen("sent");
    });
  const onSubmitLink = (e: FormEvent) => {
    e.preventDefault();
    void sendLink();
  };
  const onSubmitPassword = (e: FormEvent) => {
    e.preventDefault();
    void run("password", async () => {
      await loginWithPassword(email, password);
      router.replace("/");
    });
  };
  const onGoogle = (idToken: string) =>
    void run("google", async () => {
      await loginWithGoogle(idToken);
      router.replace("/");
    });

  const emailField = (autoComplete: string) => (
    <TextField
      label="Email"
      type="email"
      name="email"
      autoComplete={autoComplete}
      inputMode="email"
      required
      placeholder="ban@email.com"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />
  );
  const loopi = screen !== "expired" && (
    <Loopi
      pose={screen === "sent" ? "excited" : "happy"}
      width={84}
      className="absolute -top-12 -right-6 hidden h-auto sm:block"
    />
  );

  return (
    <>
      {loopi}
      <div className="flex flex-col gap-4">
        {screen === "choose" && (
          <>
            <span className="type-label inline-flex items-center gap-2 self-start rounded-full bg-subtle py-1 pr-3 pl-1.5 text-heading">
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-on-primary">
                Beta
              </span>
              Miễn phí
            </span>
            <div className="flex flex-col gap-2.5">
              <h1 className={H1}>
                Bắt đầu nói tiếng Anh <span className={SCRIPT}>cùng</span>{" "}
                <span className="text-primary">Loopi.</span>
              </h1>
              <p className="type-body text-fg-secondary">
                Đăng nhập hoặc tạo tài khoản mới.
              </p>
            </div>
            <GoogleButton theme="filled_black" onCredential={onGoogle} />
            <Divider>hoặc nhận link đăng nhập qua email</Divider>
            <form onSubmit={onSubmitLink} className="flex flex-col gap-3">
              {emailField("email")}
              <Button
                type="submit"
                variant="secondary"
                size="m"
                fullWidth
                loading={busy}
              >
                {busy ? "Đang gửi…" : "Gửi link đăng nhập"}
              </Button>
            </form>
            <div className="flex items-center justify-center gap-1 border-t border-line pt-2">
              <span className="type-caption text-fg-secondary">
                Đã đặt mật khẩu?
              </span>
              <Button variant="ghost" size="s" onClick={() => setScreen("password")}>
                Đăng nhập bằng mật khẩu
              </Button>
            </div>
          </>
        )}

        {screen === "password" && (
          <>
            <Button
              variant="ghost"
              size="s"
              className="self-start"
              icon={<ArrowLeftIcon className="size-4.5" />}
              onClick={() => setScreen("choose")}
            >
              Cách đăng nhập khác
            </Button>
            <h1 className={H1}>
              Đăng nhập với <span className="text-primary">mật khẩu</span>
            </h1>
            <form onSubmit={onSubmitPassword} className="flex flex-col gap-3">
              {emailField("username")}
              <TextField
                label="Mật khẩu"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                placeholder="Mật khẩu của bạn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex flex-wrap items-center justify-between gap-x-3">
                <Checkbox
                  label="Hiện mật khẩu"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                <Button variant="ghost" size="s" onClick={() => setScreen("choose")}>
                  Quên mật khẩu?
                </Button>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="m"
                fullWidth
                loading={busy}
              >
                {busy ? "Đang đăng nhập…" : "Đăng nhập"}
              </Button>
            </form>
            <p className="type-caption text-center text-fg-secondary">
              Chưa đặt mật khẩu? Dùng Google hoặc link qua email, rồi đặt mật
              khẩu trong Cài đặt.
            </p>
          </>
        )}

        {screen === "sent" && (
          <>
            <div className="flex flex-col gap-2.5">
              <h1 className={H1}>
                Mở <span className={SCRIPT}>hộp thư</span> của bạn nhé.
              </h1>
              <p className="type-body text-fg-secondary">
                LoopEdu vừa gửi link đăng nhập tới{" "}
                <b className="text-fg">{email}</b>. Link có hiệu lực{" "}
                {LINK_TTL_MINUTES} phút.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary font-bold text-on-primary hover:bg-primary-hover"
              >
                Mở Gmail
              </a>
              <a
                href="https://outlook.live.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-full border-[1.5px] border-line-input bg-surface font-bold text-heading hover:bg-subtle"
              >
                Mở Outlook
              </a>
            </div>
            <div className="type-caption flex flex-col gap-2.5 rounded-md bg-subtle px-4 py-3.5 text-fg-secondary">
              <span>
                <b className="text-fg">Chưa thấy email?</b> Xem thêm trong mục
                Spam.
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="s"
                  disabled={wait > 0}
                  loading={busy}
                  onClick={() => void sendLink()}
                >
                  {wait > 0
                    ? `Gửi lại sau ${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, "0")}`
                    : "Gửi lại link"}
                </Button>
                <Button variant="ghost" size="s" onClick={() => setScreen("choose")}>
                  Dùng email khác
                </Button>
              </div>
            </div>
          </>
        )}

        {screen === "expired" && (
          <>
            <span
              aria-hidden="true"
              className="flex size-12 items-center justify-center rounded-md bg-warning-bg text-warning"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-7 fill-none stroke-current stroke-2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7M3 3l18 18" />
              </svg>
            </span>
            <div className="flex flex-col gap-2.5">
              <h1 className={H1}>Link đăng nhập hết hạn</h1>
              <p className="type-body text-fg-secondary">
                Mỗi link chỉ dùng được một lần, trong {LINK_TTL_MINUTES} phút.
                Nhận link mới nhé.
              </p>
            </div>
            <form onSubmit={onSubmitLink} className="flex flex-col gap-3">
              {emailField("email")}
              <Button
                type="submit"
                variant="primary"
                size="m"
                fullWidth
                loading={busy}
              >
                {busy ? "Đang gửi…" : "Gửi link mới"}
              </Button>
            </form>
            <Divider>hoặc</Divider>
            <GoogleButton theme="outline" onCredential={onGoogle} />
          </>
        )}

        <p className="type-caption text-center text-fg-secondary">
          Khi tiếp tục, bạn đồng ý với{" "}
          <Link href="/#top" className="text-primary underline">
            Điều khoản sử dụng
          </Link>{" "}
          và{" "}
          <Link href="/#top" className="text-primary underline">
            Chính sách quyền riêng tư
          </Link>{" "}
          của LoopEdu.
        </p>
      </div>
    </>
  );
}
