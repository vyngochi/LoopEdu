import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { CheckIcon } from "./icons";

const TONE = {
  /** IELTS, pattern, mặc định */
  brand: "bg-selected text-heading",
  /** TOEIC, mức nội dung, nhãn trung tính */
  neutral: "border border-line bg-subtle text-heading",
  success: "bg-selected text-primary",
  warning: "bg-warning-bg text-warning-fg",
  celebrate: "bg-celebrate-bg text-celebrate-fg",
} as const;

export type TagTone = keyof typeof TONE;

/** Nhãn tĩnh (UI 04): lộ trình, dạng câu, mức nội dung, D+3, "Quá hạn 2 ngày" + icon. Không bấm được. */
export function Tag({ tone = "brand", icon, children, className }: { tone?: TagTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] leading-4 font-semibold [&_svg]:size-3.5",
        TONE[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & { selected: boolean };

/** Chip lọc bật/tắt (UI 03), vd. lọc Sổ pattern. Cao 40, vùng chạm 44. Chọn thì có dấu ✓, không chỉ đổi màu. */
export function Chip({ selected, className, children, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        "relative inline-flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-4 text-sm transition-colors duration-150 after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']",
        selected ? "border-primary bg-selected font-bold text-heading" : "border-line-input bg-surface font-semibold text-fg hover:bg-subtle",
        className,
      )}
      {...props}
    >
      {selected && <CheckIcon className="size-4" />}
      {children}
    </button>
  );
}
