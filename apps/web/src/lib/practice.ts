import {
  PracticeSessionSchema,
  QuestionSetDetailSchema,
  QuestionSetListSchema,
  type ExamTrack,
  type SelfRating,
  type SupportLevel,
} from "@loopedu/shared";
import { authed } from "./auth";

/** Đề người học được mở, theo lộ trình đã chọn. */
export const listQuestionSets = (exam: ExamTrack) => authed("GET", `/question-sets?exam=${exam}`, undefined, QuestionSetListSchema);

/** Mở phiên luyện: máy chủ ghim đúng phiên bản đề và chỉ trả phần hỗ trợ của mức đã chọn. */
export const startPracticeSession = (questionSetId: string, supportLevel: SupportLevel) =>
  authed("POST", "/practice-sessions", { questionSetId, supportLevel }, PracticeSessionSchema);

/** Đề để hiện màn chọn mức hỗ trợ trước khi mở phiên. */
export const getQuestionSet = (id: string) => authed("GET", `/question-sets/${id}`, undefined, QuestionSetDetailSchema);

/** Hoàn thành phiên kèm tự đánh giá. Gọi lại cùng đánh giá thì nhận lại đúng kết quả đã lưu. */
export const completePracticeSession = (id: string, selfRating: SelfRating) =>
  authed("POST", `/practice-sessions/${id}/complete`, { selfRating }, PracticeSessionSchema);
