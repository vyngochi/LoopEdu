import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import { AlertIcon } from "./icons";

// Viền 1.5 px; focus thêm 0.5 px viền xanh + vòng Mint 4 px bằng shadow để chữ không xê dịch.
const CONTROL =
  "w-full rounded-sm border-[1.5px] border-line-input bg-surface px-3.5 text-base text-fg outline-none transition-shadow duration-150 placeholder:text-fg-muted focus:border-primary focus:shadow-[0_0_0_0.5px_var(--color-primary),0_0_0_4px_var(--color-selected)] aria-invalid:border-error disabled:border-line disabled:bg-disabled disabled:text-fg-muted";

type FieldProps = {
  label: ReactNode;
  /** Gợi ý dưới ô. Bị thay bằng `error` khi có lỗi. */
  hint?: ReactNode;
  /** Nói cách sửa, vd. "Thiếu phần đuôi, ví dụ .com hoặc .vn". */
  error?: ReactNode;
};

function Field({
  id,
  label,
  hint,
  error,
  count,
  children,
}: FieldProps & { id: string; count?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-label text-fg">
        {label}
      </label>
      {children}
      {(error || hint || count) && (
        <div className="flex items-start justify-between gap-3 type-caption">
          {error ? (
            <p id={`${id}-msg`} className="flex items-start gap-1.5 text-error">
              <AlertIcon className="size-4.5" />
              {error}
            </p>
          ) : (
            <p id={`${id}-msg`} className="text-fg-secondary">
              {hint}
            </p>
          )}
          {count && <span className="shrink-0 text-fg-muted">{count}</span>}
        </div>
      )}
    </div>
  );
}

// Đếm ký tự chỉ khi ô được điều khiển (có `value`) và có `maxLength`.
const counter = (value: unknown, max?: number) =>
  typeof value === "string" && max ? `${value.length}/${max}` : undefined;

/** Ô nhập chữ (UI 03). Nhãn luôn ở trên, không dùng placeholder thay nhãn. Chữ 16 px để iOS không phóng to. */
export function TextField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Field id={fieldId} label={label} hint={hint} error={error} count={counter(props.value, props.maxLength)}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        className={cx(CONTROL, "h-13", className)}
        {...props}
      />
    </Field>
  );
}

/** Ô nhập nhiều dòng, vd. "Phản hồi này sai ở đâu?" kèm bộ đếm 49/300. */
export function TextArea({
  label,
  hint,
  error,
  id,
  className,
  rows = 3,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Field id={fieldId} label={label} hint={hint} error={error} count={counter(props.value, props.maxLength)}>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        className={cx(CONTROL, "resize-y py-3 leading-normal", className)}
        {...props}
      />
    </Field>
  );
}
