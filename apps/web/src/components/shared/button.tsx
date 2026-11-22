import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Spinner } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "inverse" | "inverse-outline";
export type ButtonSize = "l" | "m" | "s";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed disabled:bg-disabled disabled:text-fg-muted",
  secondary:
    "bg-selected text-heading hover:bg-selected-hover active:bg-selected-pressed disabled:bg-disabled disabled:text-fg-muted",
  outline:
    "border-[1.5px] border-line-input bg-surface text-primary hover:border-primary hover:bg-subtle active:bg-selected active:text-heading disabled:border-line disabled:bg-surface disabled:text-fg-muted",
  ghost:
    "text-primary hover:bg-subtle active:bg-selected active:text-heading disabled:bg-transparent disabled:text-fg-muted",
  danger:
    "bg-error text-on-primary hover:bg-error-hover active:bg-error-pressed focus-visible:outline-error disabled:bg-disabled disabled:text-fg-muted",
  // Trên nền tối (bg-inverse): hành động chính và phụ. Landing dùng, màn học thì không.
  inverse:
    "bg-record text-heading hover:bg-lp-lime active:bg-lp-lime focus-visible:outline-on-primary disabled:bg-disabled disabled:text-fg-muted",
  "inverse-outline":
    "border-[1.5px] border-selected/45 text-on-primary hover:bg-on-primary/10 active:bg-on-primary/15 focus-visible:outline-on-primary disabled:text-fg-muted",
};

const SIZE: Record<ButtonSize, string> = {
  l: "h-14 gap-2.5 px-6.5 text-base",
  m: "h-12 gap-2 px-5.5 text-[15px]",
  // S cao 40 nhưng vùng chạm vẫn 44: lớp ::after nới 2 px trên dưới.
  s: "relative h-10 gap-1.5 px-4 text-sm after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']",
};

/** Class của nút, dùng cho <Link> hoặc <a> trông như nút. */
export function buttonClass({
  variant = "primary",
  size = "m",
  fullWidth = false,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean } = {}) {
  return cx(
    "inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-full font-bold transition duration-150 ease-out active:scale-[.98] disabled:cursor-not-allowed disabled:active:scale-100",
    VARIANT[variant],
    SIZE[size],
    fullWidth && "w-full",
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Đang xử lý: hiện spinner, giữ màu, chặn bấm. Đổi nhãn sang "Đang gửi…" ở nơi gọi. */
  loading?: boolean;
  icon?: ReactNode;
  iconEnd?: ReactNode;
};

/** UI 02. Mỗi màn chỉ một `primary`. `danger` chỉ cho xóa không hoàn tác. Nhãn là động từ, ≤ 4 từ. */
export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  icon,
  iconEnd,
  className,
  children,
  type = "button",
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? undefined : onClick}
      className={cx(buttonClass({ variant, size, fullWidth }), loading && "cursor-progress", className)}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
      {!loading && iconEnd}
    </button>
  );
}

const ICON_VARIANT = {
  filled: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed",
  tonal: "bg-selected text-heading hover:bg-selected-hover active:bg-selected-pressed",
  outline: "border-[1.5px] border-line-input bg-surface text-primary hover:border-primary hover:bg-subtle",
  ghost: "text-fg hover:bg-subtle active:bg-selected",
} as const;

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Bắt buộc: thành aria-label. */
  label: string;
  variant?: keyof typeof ICON_VARIANT;
  /** Có giá trị thì là nút bật/tắt (aria-pressed), bật thì nền Mint. */
  pressed?: boolean;
  children: ReactNode;
};

/** Nút chỉ có icon, 44 × 44. */
export function IconButton({
  label,
  variant = "ghost",
  pressed,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      className={cx(
        "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:bg-disabled disabled:text-fg-muted",
        pressed ? "bg-selected text-heading" : ICON_VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}
