import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { CheckIcon } from "./icons";

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  /** Dòng mô tả phụ, vd. lý do bị vô hiệu. */
  description?: ReactNode;
};

function ChoiceText({ label, description }: Pick<ChoiceProps, "label" | "description">) {
  return (
    <span className="flex flex-col">
      <span className="type-body">{label}</span>
      {description && <span className="type-caption text-fg-secondary">{description}</span>}
    </span>
  );
}

const ROW = "flex min-h-11 cursor-pointer items-center gap-3 has-disabled:cursor-not-allowed has-disabled:text-fg-muted";

/** Checkbox 22 px (UI 03), vd. checklist khảo sát. */
export function Checkbox({ label, description, className, ...props }: ChoiceProps) {
  return (
    <label className={cx(ROW, className)}>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          className="peer size-5.5 cursor-[inherit] appearance-none rounded-xs border-[1.5px] border-line-input bg-surface checked:border-primary checked:bg-primary disabled:border-line disabled:bg-disabled"
          {...props}
        />
        <CheckIcon className="pointer-events-none absolute inset-0 m-auto size-4 text-on-primary opacity-0 peer-checked:opacity-100" strokeWidth={3} />
      </span>
      <ChoiceText label={label} description={description} />
    </label>
  );
}

/** Radio 22 px. Nhóm radio đặt trong <fieldset> có <legend>. */
export function Radio({ label, description, className, ...props }: ChoiceProps) {
  return (
    <label className={cx(ROW, className)}>
      <input
        type="radio"
        className="size-5.5 shrink-0 cursor-[inherit] appearance-none rounded-full border-[1.5px] border-line-input bg-surface checked:border-primary checked:bg-primary checked:shadow-[inset_0_0_0_4px_var(--color-surface)] disabled:border-line disabled:bg-disabled"
        {...props}
      />
      <ChoiceText label={label} description={description} />
    </label>
  );
}

/** Công tắc cài đặt: nhãn bên trái, công tắc 52 × 32 bên phải. Vô hiệu thì ghi lý do ở `description`. */
export function Switch({ label, description, className, ...props }: ChoiceProps) {
  return (
    <label className={cx(ROW, "justify-between gap-4", className)}>
      <ChoiceText label={label} description={description} />
      <input
        type="checkbox"
        role="switch"
        className="h-8 w-13 shrink-0 cursor-[inherit] appearance-none rounded-full border-2 border-line-input bg-surface p-0.5 transition-colors duration-150 before:block before:size-6 before:rounded-full before:bg-line-input before:transition-transform before:duration-150 before:content-[''] checked:border-primary checked:bg-primary checked:before:translate-x-5 checked:before:bg-surface disabled:border-disabled disabled:bg-disabled disabled:before:bg-surface"
        {...props}
      />
    </label>
  );
}
