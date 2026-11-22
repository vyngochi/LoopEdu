import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Loopi, type LoopiPose } from "./brand";
import { AlertIcon, CheckIcon, InfoIcon } from "./icons";

const BANNER = {
  info: { box: "bg-subtle", icon: "text-fg-secondary", Icon: InfoIcon },
  success: { box: "bg-selected", icon: "text-primary", Icon: CheckIcon },
  warning: { box: "bg-warning-bg", icon: "text-warning", Icon: AlertIcon },
  error: { box: "bg-error-bg", icon: "text-error", Icon: AlertIcon },
} as const;

type BannerProps = {
  tone?: keyof typeof BANNER;
  title?: ReactNode;
  children?: ReactNode;
  /** Nút hoặc liên kết, vd. "Thử lại" + "Hoàn thành không chấm". */
  action?: ReactNode;
  className?: string;
};

/**
 * Banner trong trang (UI 04). Nói điều đã xảy ra và bước tiếp theo.
 * Lỗi dùng role="alert", còn lại role="status". Lỗi hệ thống luôn nói lượt chấm có bị trừ không.
 */
export function Banner({ tone = "info", title, children, action, className }: BannerProps) {
  const t = BANNER[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("flex items-start gap-3 rounded-md px-4 py-3.5 text-fg", t.box, className)}>
      <t.Icon className={cx("mt-0.5", t.icon)} />
      <div className="flex flex-1 flex-col gap-1">
        {title && <p className="type-label">{title}</p>}
        {children && <div className="type-caption text-fg-secondary">{children}</div>}
        {action && <div className="mt-1 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

/** Banner AI bắt buộc trên màn kết quả và transcript. */
export const AiFeedbackBanner = () => <Banner>Phản hồi luyện tập do AI tạo, không phải điểm IELTS hay TOEIC.</Banner>;

/** Thẻ: viền mảnh, nền trắng, bo md. Dùng `as` cho thẻ ngữ nghĩa; thẻ là liên kết thì dùng `cardClass` trên <Link>. */
export const cardClass = "rounded-md border-[1.5px] border-line bg-surface p-5";

export function Card({
  as: Tag = "div",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "div" | "article" | "section" | "li" }) {
  return <Tag className={cx(cardClass, className)} {...props} />;
}

/** Khối chờ cho danh sách, thẻ. Đặt chiều rộng/cao ở nơi gọi. Spinner chỉ cho hành động ngắn. */
export const Skeleton = ({ className }: { className?: string }) => (
  <span aria-hidden="true" className={cx("block h-3 animate-pulse rounded-xs bg-disabled", className)} />
);

type EmptyStateProps = {
  /** Biểu cảm Loopi. happy: chưa có gì để làm; curious: chưa tìm thấy, mời thử cách khác. */
  loopi?: LoopiPose;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Trạng thái trống (UI 04): Loopi + tiêu đề + một câu + một nút. Lỗi hệ thống không dùng Loopi, dùng Banner. */
export function EmptyState({ loopi = "happy", title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx("flex flex-col items-center gap-2.5 rounded-md bg-subtle p-6 text-center", className)}>
      <Loopi pose={loopi} width={120} />
      <p className="type-title text-heading">{title}</p>
      {description && <p className="type-body text-fg-secondary">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
