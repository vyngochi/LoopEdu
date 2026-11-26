import type { ExamTrack, Level, PlayerView, SectionCode, SelfRating, SupportLevel } from "@loopedu/shared";
import { completePracticeSession, completeReview, getQuestionSet, getReviewSession, startPracticeSession } from "@/lib/practice";

/** Phần đầu màn chọn mức hỗ trợ. */
export type PlayerHeader = { topic: string; examType: ExamTrack; sectionCode: SectionCode; difficulty: Level; badge?: string };

/**
 * Màn luyện chạy trên hai nguồn: luyện một đề mới hoặc ôn một lượt đã đến hạn. Cùng giao diện, khác API.
 * Máy chủ luôn quyết định phần hỗ trợ được trả về theo mức đã chọn.
 */
export type PlayerSource = {
  backHref: string;
  /** Nhãn nút về danh sách sau khi xong. */
  backLabel: string;
  startLabel: string;
  doneTitle: string;
  missing: { title: string; description: string };
  defaultLevel: SupportLevel;
  canRetry: boolean;
  loadHeader(): Promise<PlayerHeader>;
  start(level: SupportLevel): Promise<PlayerView & { id: string }>;
  complete(sessionId: string, rating: SelfRating, level: SupportLevel): Promise<unknown>;
};

export const practiceSource = (questionSetId: string): PlayerSource => ({
  backHref: "/practice",
  backLabel: "Chọn đề khác",
  startLabel: "Bắt đầu luyện",
  doneTitle: "Đã ghi nhận phiên luyện",
  missing: { title: "Chưa tìm thấy đề này", description: "Đề có thể đã bị gỡ. Chọn một đề khác nhé." },
  defaultLevel: "sample",
  canRetry: true,
  loadHeader: async () => {
    const d = await getQuestionSet(questionSetId);
    return { topic: d.topic.name, examType: d.examType, sectionCode: d.sectionCode, difficulty: d.difficulty };
  },
  start: (level) => startPracticeSession(questionSetId, level),
  complete: (sessionId, rating) => completePracticeSession(sessionId, rating),
});

export const reviewSource = (taskId: string): PlayerSource => ({
  backHref: "/reviews",
  backLabel: "Về danh sách ôn",
  startLabel: "Bắt đầu ôn",
  doneTitle: "Đã ghi nhận lượt ôn",
  missing: { title: "Chưa tìm thấy lượt ôn này", description: "Lượt ôn có thể chưa đến hạn. Xem lại danh sách ôn nhé." },
  // Ôn là nhớ lại, nên mặc định không hỗ trợ.
  defaultLevel: "none",
  canRetry: false,
  loadHeader: async () => {
    const r = await getReviewSession(taskId, "none");
    return {
      topic: r.questionSet.topic.name,
      examType: r.questionSet.examType,
      sectionCode: r.questionSet.sectionCode,
      difficulty: r.questionSet.difficulty,
      badge: r.milestoneDays ? `Ôn D+${r.milestoneDays}` : "Ôn thêm",
    };
  },
  start: (level) => getReviewSession(taskId, level),
  // Mức hỗ trợ đã dùng được ghi cùng lượt ôn.
  complete: (_sessionId, rating, level) => completeReview(taskId, rating, level),
});
