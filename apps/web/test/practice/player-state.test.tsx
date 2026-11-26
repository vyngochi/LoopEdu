import { describe, expect, it } from "vitest";
import { firstPhase, formatClock, nextPhase, phaseSeconds, type Phase } from "@/components/practice/player-state";

const timing = (readSeconds: number, steps: [number, number][]) => ({
  readSeconds,
  steps: steps.map(([prepSeconds, speakSeconds]) => ({ prepSeconds, speakSeconds })),
});

/** Đi từ pha đầu đến hết, trả danh sách pha đã qua. */
function walk(t: ReturnType<typeof timing>) {
  const seen: Phase[] = [];
  for (let p = firstPhase(t); p.kind !== "done"; p = nextPhase(t, p)) seen.push(p);
  return seen.map((p) => (p.kind === "done" ? "done" : `${p.kind}${p.step}`));
}

describe("pha của phiên luyện", () => {
  it("IELTS Part 2: chuẩn bị rồi nói", () => {
    expect(walk(timing(0, [[60, 120]]))).toEqual(["prep0", "speak0"]);
  });

  it("Part 1: câu không có thời gian chuẩn bị thì vào thẳng phần nói", () => {
    expect(walk(timing(0, [[0, 40], [0, 40], [0, 40]]))).toEqual(["speak0", "speak1", "speak2"]);
  });

  it("TOEIC dùng thông tin: đọc bảng một lần, rồi từng câu chuẩn bị và nói", () => {
    expect(walk(timing(45, [[3, 15], [3, 30]]))).toEqual(["read0", "prep0", "speak0", "prep1", "speak1"]);
  });

  it("hết các câu thì sang done và không đi tiếp", () => {
    const t = timing(0, [[0, 10]]);
    const last = nextPhase(t, firstPhase(t));
    expect(last).toEqual({ kind: "done" });
    expect(nextPhase(t, last)).toEqual({ kind: "done" });
  });

  it("lấy đúng số giây của từng pha", () => {
    const t = timing(45, [[3, 15]]);
    expect(phaseSeconds(t, { kind: "read", step: 0 })).toBe(45);
    expect(phaseSeconds(t, { kind: "prep", step: 0 })).toBe(3);
    expect(phaseSeconds(t, { kind: "speak", step: 0 })).toBe(15);
    expect(phaseSeconds(t, { kind: "done" })).toBe(0);
  });
});

describe("formatClock", () => {
  it("hiện phút:giây", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(9)).toBe("0:09");
    expect(formatClock(75)).toBe("1:15");
    expect(formatClock(120)).toBe("2:00");
  });
});
