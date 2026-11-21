import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";
import { CheckIcon, MicIcon, MicOffIcon, Spinner, StopIcon } from "./icons";

export type RecordState = "ready" | "recording" | "scoring" | "done" | "unavailable";

const STATE: Record<RecordState, { className: string; label: string; disabled?: boolean }> = {
  ready: { className: "bg-record border-selected text-on-primary shadow-2", label: "Bắt đầu ghi âm" },
  recording: { className: "bg-inverse border-record text-on-primary", label: "Dừng ghi âm" },
  scoring: { className: "bg-surface border-selected text-primary", label: "Đang chấm bản ghi", disabled: true },
  done: { className: "bg-primary border-selected text-on-primary", label: "Đã gửi chấm, xem kết quả" },
  unavailable: { className: "bg-disabled border-disabled text-fg-muted", label: "Chưa ghi âm được", disabled: true },
};

const ICON: Record<RecordState, typeof MicIcon> = {
  ready: MicIcon,
  recording: StopIcon,
  scoring: Spinner,
  done: CheckIcon,
  unavailable: MicOffIcon,
};

type RecordButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  state: RecordState;
  /** Âm lượng 0–1 khi đang ghi, điều khiển vòng sáng. */
  level?: number;
};

/**
 * Nút ghi âm 80 px (UI 02). Tối đa một nút mỗi màn, không bao giờ đổi sang đỏ.
 * Chữ trạng thái ("Bấm để nói", "0:42 / 2:00") đặt bên dưới ở nơi gọi.
 * Khi `unavailable`, hiện thêm lựa chọn "Tự nói không ghi âm".
 */
export function RecordButton({ state, level = 0, className, style, type = "button", ...props }: RecordButtonProps) {
  const s = STATE[state];
  const Icon = ICON[state];
  return (
    <button
      type={type}
      aria-label={s.label}
      disabled={s.disabled || props.disabled}
      className={cx(
        "inline-flex size-20 shrink-0 cursor-pointer items-center justify-center rounded-full border-6 transition-[background-color,box-shadow] duration-150 ease-out disabled:cursor-not-allowed",
        s.className,
        className,
      )}
      style={
        state === "recording"
          ? {
              boxShadow: `0 0 0 ${8 + Math.round(Math.min(Math.max(level, 0), 1) * 12)}px color-mix(in srgb, var(--color-record) 25%, transparent)`,
              ...style,
            }
          : style
      }
      {...props}
    >
      <Icon className="size-8" />
    </button>
  );
}
