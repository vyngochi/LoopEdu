"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { IconButton } from "./button";
import { cx } from "./cx";
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from "./icons";

// Icon + màu theo loại: trạng thái không chỉ dựa vào màu.
const TONE = {
  info: { Icon: InfoIcon, color: "text-fg-secondary" },
  success: { Icon: CheckIcon, color: "text-primary" },
  error: { Icon: AlertIcon, color: "text-error" },
} as const;

type ToastTone = keyof typeof TONE;
type ToastItem = { id: number; message: string; tone: ToastTone; leaving?: boolean };

const HIDE_AFTER_MS = 5000;
const EXIT_MS = 250; // khớp --animate-toast-out
const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

/** Gọi `toast("Đã lưu", "success")`. Lỗi dùng tone "error" để đọc to ngay (role="alert"). Cần `ToastProvider` ở layout. */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast cần nằm trong ToastProvider");
  return toast;
}

let nextId = 0;

/** Toast (UI 04): góc dưới, nền trắng, trượt lên khi hiện, tự ẩn sau 5 giây, có nút đóng. Cùng nội dung thì thay toast cũ, không chồng lên. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => {
    setItems((all) => all.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((all) => all.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = ++nextId;
      setItems((all) => [...all.filter((t) => t.message !== message), { id, message, tone }]);
      setTimeout(() => dismiss(id), HIDE_AFTER_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-6 sm:items-end">
        {items.map(({ id, message, tone, leaving }) => {
          const { Icon, color } = TONE[tone];
          return (
            <div
              key={id}
              role={tone === "error" ? "alert" : "status"}
              className={cx(
                "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-md border-[1.5px] border-line bg-surface py-1 pr-1 pl-4 text-fg shadow-2",
                leaving ? "animate-toast-out" : "animate-toast-in",
              )}
            >
              <Icon className={cx("mt-3 size-5", color)} />
              <p className="type-label flex-1 py-3">{message}</p>
              <IconButton label="Đóng thông báo" onClick={() => dismiss(id)}>
                <CloseIcon />
              </IconButton>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
