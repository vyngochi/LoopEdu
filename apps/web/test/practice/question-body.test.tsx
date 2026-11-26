import type { PracticeSession } from "@loopedu/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestionBody } from "@/components/practice/question-body";

const topic = { id: "00000000-0000-4000-8000-000000000001", slug: "tech", name: "Technology" };
const session = (over: Partial<PracticeSession> = {}): PracticeSession => ({
  id: "00000000-0000-4000-8000-000000000002",
  status: "in_progress",
  supportLevel: "sample",
  startedAt: "2026-11-27T00:00:00.000Z",
  questionSet: { id: "00000000-0000-4000-8000-000000000003", topic, examType: "ielts", sectionCode: "ielts_p2", difficulty: "intermediate", versionNo: 1 },
  content: {
    prompt: "Describe a piece of technology you use regularly.",
    cuePoints: ["what it is", "why it matters"],
    ideaHints: ["daily communication"],
    usefulExpressions: ["part of my daily routine"],
  },
  sampleAnswers: ["I am Lan from Hanoi."],
  timing: { readSeconds: 0, steps: [{ prepSeconds: 60, speakSeconds: 120 }] },
  ...over,
});
const html = (s: PracticeSession, step = 0) => renderToStaticMarkup(<QuestionBody session={s} phase={{ kind: "prep", step }} />);

describe("QuestionBody", () => {
  it("mức bài mẫu: hiện đề, ý cần nói, gợi ý và bài mẫu đã điền sẵn", () => {
    const out = html(session());
    expect(out).toContain("Describe a piece of technology");
    expect(out).toContain("You should say:");
    expect(out).toContain("what it is");
    expect(out).toContain("daily communication");
    expect(out).toContain("I am Lan from Hanoi.");
    expect(out).not.toContain("{{");
  });

  it("mức không hỗ trợ: chỉ có đề, không gợi ý và không bài mẫu", () => {
    const out = html(session({ supportLevel: "none", sampleAnswers: null, content: { prompt: "Describe an app.", cuePoints: ["what it is"] } }));
    expect(out).toContain("Describe an app.");
    expect(out).not.toContain("Gợi ý");
    expect(out).not.toContain("Bài mẫu");
  });

  it("Part 1 chỉ hiện câu hỏi hiện tại", () => {
    const s = session({
      content: { questions: ["Do you use a computer?", "What is your phone for?"] },
      sampleAnswers: null,
      timing: { readSeconds: 0, steps: [{ prepSeconds: 0, speakSeconds: 40 }, { prepSeconds: 0, speakSeconds: 40 }] },
    });
    expect(html(s, 0)).toContain("Do you use a computer?");
    expect(html(s, 0)).not.toContain("What is your phone for?");
    expect(html(s, 1)).toContain("What is your phone for?");
  });

  it("TOEIC có mỗi câu một bài mẫu thì chỉ hiện bài mẫu của câu hiện tại", () => {
    const s = session({
      content: {
        infoTable: { title: "Workshops", rows: [["Sat 9:00", "Resume writing", "Room A"]] },
        questions: [
          { text: "When does it start?", prepSeconds: 3, responseSeconds: 15 },
          { text: "Where is it?", prepSeconds: 3, responseSeconds: 15 },
        ],
      },
      sampleAnswers: ["At nine.", "In Room A."],
    });
    const first = html(s, 0);
    expect(first).toContain("Resume writing");
    expect(first).toContain("When does it start?");
    expect(first).toContain("At nine.");
    expect(first).not.toContain("In Room A.");
  });
});
