import type { PlayerView } from "@loopedu/shared";
import { Card, Tag } from "@/components/shared";
import type { Phase } from "./player-state";

type Props = { session: PlayerView; phase: Phase };

/** Đề của câu hiện tại. Part 1 hiện từng câu; các dạng còn lại hiện cả đề. */
export function QuestionBody({ session, phase }: Props) {
  const { content, sampleAnswers } = session;
  const step = phase.kind === "done" ? 0 : phase.step;
  const question = content.questions?.[step];
  // IELTS Part 1 dùng một bài mẫu cho cả bộ; TOEIC có một bài mẫu cho mỗi câu.
  const samples =
    sampleAnswers && content.questions && sampleAnswers.length === content.questions.length && sampleAnswers.length > 1
      ? [sampleAnswers[step]]
      : sampleAnswers;

  return (
    <div className="flex flex-col gap-5">
      {content.prompt && <h1 className="type-h2 text-heading">{content.prompt}</h1>}
      {question && <h1 className="type-h2 text-heading">{typeof question === "string" ? question : question.text}</h1>}

      {content.cuePoints && (
        <div>
          <p className="type-label text-fg-secondary">You should say:</p>
          <ul className="type-reading mt-2 list-disc pl-5">
            {content.cuePoints.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {content.passage && <p className="type-reading rounded-md bg-subtle p-4">{content.passage}</p>}

      {content.infoTable && (
        <div className="overflow-x-auto rounded-md border border-line">
          <p className="type-label bg-subtle px-4 py-3 text-heading">{content.infoTable.title}</p>
          <table className="type-body w-full">
            <tbody>
              {content.infoTable.rows.map((row, i) => (
                <tr key={i} className="border-t border-line">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(content.ideaHints?.length || content.usefulExpressions?.length) && (
        <Card as="section" aria-label="Gợi ý" className="flex flex-col gap-3">
          <p className="type-overline text-fg-secondary">Gợi ý</p>
          {content.ideaHints && (
            <div className="flex flex-wrap gap-2">
              {content.ideaHints.map((h) => (
                <Tag key={h} tone="neutral">
                  {h}
                </Tag>
              ))}
            </div>
          )}
          {content.usefulExpressions && (
            <ul className="type-body flex flex-col gap-1 text-fg-secondary">
              {content.usefulExpressions.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {samples && samples.length > 0 && (
        <Card as="section" aria-label="Bài mẫu" className="flex flex-col gap-2">
          <p className="type-overline text-fg-secondary">Bài mẫu</p>
          {samples.map((s) => (
            <p key={s} className="type-reading">
              {s}
            </p>
          ))}
        </Card>
      )}
    </div>
  );
}
