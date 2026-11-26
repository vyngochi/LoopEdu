import type { PracticeSession, SectionCode } from "@loopedu/shared";

type Timing = PracticeSession["timing"];

/** Các pha của một phiên: đọc đề (chỉ TOEIC có bảng/đoạn), chuẩn bị, nói; lặp theo từng câu. */
export type Phase = { kind: "read" | "prep" | "speak"; step: number } | { kind: "done" };

/** Pha có thời lượng 0 thì bỏ qua (Part 1 không có thời gian chuẩn bị). */
function settle(timing: Timing, phase: Phase): Phase {
  while (phase.kind !== "done" && phaseSeconds(timing, phase) === 0) phase = advance(timing, phase);
  return phase;
}

function advance(timing: Timing, phase: Phase): Phase {
  if (phase.kind === "done") return phase;
  if (phase.kind === "read") return { kind: "prep", step: phase.step };
  if (phase.kind === "prep") return { kind: "speak", step: phase.step };
  return phase.step + 1 < timing.steps.length ? { kind: "prep", step: phase.step + 1 } : { kind: "done" };
}

export function phaseSeconds(timing: Timing, phase: Phase): number {
  if (phase.kind === "done") return 0;
  if (phase.kind === "read") return timing.readSeconds;
  const s = timing.steps[phase.step];
  return phase.kind === "prep" ? s.prepSeconds : s.speakSeconds;
}

export const firstPhase = (timing: Timing): Phase => settle(timing, { kind: "read", step: 0 });
export const nextPhase = (timing: Timing, phase: Phase): Phase => settle(timing, advance(timing, phase));

/** 75 → "1:15". */
export const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// DESIGN.md · Hẹn giờ: 10 giây cuối chuyển warning kèm chữ "sắp hết giờ".
export const WARN_SECONDS = 10;

export const SECTION_LABEL: Record<SectionCode, string> = {
  ielts_p1: "IELTS Part 1",
  ielts_p2: "IELTS Part 2",
  toeic_read_aloud: "TOEIC · Đọc to",
  toeic_respond: "TOEIC · Trả lời câu hỏi",
  toeic_respond_info: "TOEIC · Dùng thông tin",
  toeic_opinion: "TOEIC · Nêu ý kiến",
};

// "Mức nội dung", không phải band (DESIGN.md · Giọng văn).
export const LEVEL_LABEL = { beginner: "Foundation", intermediate: "Intermediate", advanced: "Advanced" } as const;

export const PHASE_LABEL = { read: "Đọc đề", prep: "Chuẩn bị", speak: "Nói" } as const;
