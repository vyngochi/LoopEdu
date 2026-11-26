"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/shared";
import { PHASE_LABEL, WARN_SECONDS, formatClock, type Phase } from "./player-state";

/** Đếm ngược theo mốc giờ thật (không cộng dồn từng tick) nên không trôi khi tab bị làm chậm. */
function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 250);
    return () => clearInterval(id);
  }, [seconds]);
  return left;
}

/**
 * Đồng hồ của một pha. Đặt `key` theo pha để mỗi pha đếm lại từ đầu; hết giờ thì gọi `onDone`.
 * 10 giây cuối chuyển warning kèm chữ "sắp hết giờ", không chỉ đổi màu.
 */
export function PhaseTimer({ phase, seconds, onDone }: { phase: Exclude<Phase, { kind: "done" }>; seconds: number; onDone: () => void }) {
  const left = useCountdown(seconds);
  useEffect(() => {
    if (left === 0) onDone();
  }, [left, onDone]);

  const warning = left <= WARN_SECONDS && left > 0 && seconds > WARN_SECONDS;
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        {/* Chỉ đọc khi đổi pha, không đọc từng giây. */}
        <p aria-live="polite" className="type-label text-heading">
          {PHASE_LABEL[phase.kind]}
        </p>
        <p role="timer" className={cx("type-title tabular-nums", warning ? "text-warning" : "text-heading")}>
          {formatClock(left)}
          {warning && <span className="type-caption ml-2 font-semibold">sắp hết giờ</span>}
        </p>
      </div>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-subtle">
        <div
          className={cx("h-full rounded-full transition-[width] duration-250 ease-out", warning ? "bg-warning" : "bg-primary")}
          style={{ width: `${seconds === 0 ? 0 : (left / seconds) * 100}%` }}
        />
      </div>
    </div>
  );
}
