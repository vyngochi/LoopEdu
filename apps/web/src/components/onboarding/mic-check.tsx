"use client";

import { useEffect, useRef, useState } from "react";
import { Banner, Button, CheckIcon, MicIcon } from "@/components/shared";

type MicState = "idle" | "listening" | "denied" | "unavailable";

// Mức âm lượng (0–1) coi như đã nghe thấy giọng nói, không phải tiếng ồn nền.
const HEARD_LEVEL = 0.15;

/** Thử mic trong onboarding (PRD 7.x): chỉ đo âm lượng tại chỗ, không ghi, không gửi audio đi đâu. Bỏ qua được. */
export function MicCheck() {
  const [state, setState] = useState<MicState>("idle");
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) return setState("unavailable");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      return setState(err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "unavailable");
    }
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let frame = 0;
    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
      const l = Math.min(1, rms * 8);
      setLevel(l);
      if (l >= HEARD_LEVEL) setHeard(true);
      frame = requestAnimationFrame(tick);
    };
    tick();
    stopRef.current = () => {
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      stopRef.current = null;
      setLevel(0);
      setState("idle");
    };
    setState("listening");
  }

  return (
    <section aria-labelledby="mic-check-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="mic-check-title" className="type-label text-fg">
          Thử mic <span className="text-fg-secondary">(không bắt buộc)</span>
        </h2>
        <p className="type-caption text-fg-secondary">LoopEdu chỉ nghe thử tại máy bạn, không ghi lại và không gửi đi.</p>
      </div>

      {state === "listening" ? (
        <>
          <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <p role="status" className="type-body flex items-center gap-2 text-fg">
            {heard ? (
              <>
                <CheckIcon className="size-5 text-primary" />
                Mic hoạt động tốt.
              </>
            ) : (
              "Nói thử vài từ, ví dụ “Hello LoopEdu”."
            )}
          </p>
          <Button variant="outline" onClick={() => stopRef.current?.()}>
            Dừng thử
          </Button>
        </>
      ) : (
        <Button variant="secondary" icon={<MicIcon className="size-5" />} onClick={() => void start()}>
          {heard ? "Thử lại mic" : "Thử mic"}
        </Button>
      )}

      {state === "denied" && (
        <Banner tone="warning" title="Trình duyệt đang chặn micro">
          Bấm biểu tượng ổ khóa cạnh thanh địa chỉ, cho phép Micro rồi thử lại. Bạn vẫn luyện được bằng chế độ tự nói không ghi âm.
        </Banner>
      )}
      {state === "unavailable" && (
        <Banner tone="warning" title="Chưa tìm thấy micro">
          Kiểm tra tai nghe hoặc micro rồi thử lại. Bạn vẫn luyện được bằng chế độ tự nói không ghi âm.
        </Banner>
      )}
    </section>
  );
}
