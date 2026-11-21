import type { ChangeEvent } from "react";
import { cx } from "./cx";

type Option<V extends string> = { value: V; label: string };

type SegmentedControlProps<V extends string> = {
  /** Tên nhóm, đọc bởi trình đọc màn hình. */
  legend: string;
  name: string;
  options: readonly Option<V>[];
  /** Có `value` là điều khiển (cần `onChange`), không có thì dùng `defaultValue`. */
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  /** Chia đều chiều rộng, vd. "Bài mẫu · Sơ đồ · Không hỗ trợ". */
  fullWidth?: boolean;
  className?: string;
};

/** Chọn một trong 2–4 mục (UI 03), dựng trên radio gốc nên phím mũi tên chạy sẵn và gửi được trong <form>. */
export function SegmentedControl<V extends string>({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
  fullWidth = false,
  className,
}: SegmentedControlProps<V>) {
  return (
    <fieldset
      className={cx(
        "gap-0.5 rounded-full border-[1.5px] border-line bg-subtle p-0.75",
        fullWidth ? "grid auto-cols-fr grid-flow-col" : "inline-flex w-fit",
        className,
      )}
    >
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-5.5 text-[15px] font-semibold text-heading transition-colors duration-150 has-checked:bg-primary has-checked:font-bold has-checked:text-on-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            className="sr-only"
            {...(value !== undefined
              ? { checked: value === o.value, onChange: (e: ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value as V) }
              : { defaultChecked: defaultValue === o.value })}
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
