"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx } from "./cx";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Hàng nút cuối. Nút an toàn ("Giữ lại") đặt trước và có `autoFocus` để nhận focus khi mở. */
  actions?: ReactNode;
  /** `alert`: xác nhận hành động nguy hiểm (role="alertdialog"). `sheet`: bottom sheet trên điện thoại. */
  variant?: "dialog" | "alert" | "sheet";
  className?: string;
};

/**
 * Hộp thoại / bottom sheet (UI 07) trên <dialog> gốc: showModal() lo khóa focus, Esc để đóng,
 * nền phía sau không tương tác được. Chạm lớp phủ để đóng. Khóa cuộn trang nền nằm ở globals.css.
 * shortcut: chưa có vuốt xuống để đóng sheet và hiệu ứng mở; thêm khi làm màn đầu tiên cần.
 */
export function Dialog({ open, onClose, title, description, children, actions, variant = "dialog", className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const sheet = variant === "sheet";
  return (
    <dialog
      ref={ref}
      role={variant === "alert" ? "alertdialog" : undefined}
      aria-labelledby={`${id}-t`}
      aria-describedby={description ? `${id}-d` : undefined}
      onClose={onClose}
      // Bấm trúng chính <dialog> (không phải nội dung bên trong) nghĩa là bấm lớp phủ.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cx(
        "bg-surface text-fg shadow-3 backdrop:bg-overlay",
        sheet
          ? "mx-auto mt-auto mb-0 w-full max-w-120 rounded-t-lg"
          : "m-auto w-[calc(100%-2rem)] max-w-120 rounded-lg",
        className,
      )}
    >
      <div className={cx("flex flex-col gap-3.5", sheet ? "px-5 pt-3 pb-6" : "p-7")}>
        {sheet && <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line" />}
        <h2 id={`${id}-t`} className="type-h2">
          {title}
        </h2>
        {description && (
          <p id={`${id}-d`} className="type-body text-fg-secondary">
            {description}
          </p>
        )}
        {children}
        {actions && <div className="mt-2 flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </dialog>
  );
}
