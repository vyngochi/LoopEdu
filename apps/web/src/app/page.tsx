import Image from "next/image";
import { SECTIONS_BY_TRACK, REVIEW_OFFSETS_DAYS, type SectionCode } from "@loopedu/shared";

const SECTION_LABELS: Record<SectionCode, string> = {
  ielts_p1: "Part 1 – câu hỏi ngắn",
  ielts_p2: "Part 2 – cue card",
  toeic_read_aloud: "Read a text aloud",
  toeic_respond: "Respond to questions",
  toeic_respond_info: "Respond using information",
  toeic_opinion: "Express an opinion",
};

const TRACKS = [
  { key: "ielts", name: "IELTS Speaking" },
  { key: "toeic", name: "TOEIC Speaking" },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-12 sm:px-8">
      <Image
        src="/brand/loopedu-logo-horizontal.svg"
        alt="LoopEdu"
        width={182}
        height={64}
        priority
      />

      <section className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-forest-deep sm:text-5xl">
          Mỗi ngày 10 phút nói tiếng Anh
        </h1>
        <p className="max-w-xl text-lg text-ink-muted">
          Luyện theo dạng đề IELTS hoặc TOEIC, nhận phản hồi từng từ, rồi tự nói lại sau{" "}
          {REVIEW_OFFSETS_DAYS.join(", ")} ngày.
        </p>
      </section>

      <section aria-labelledby="tracks" className="grid gap-4 sm:grid-cols-2">
        <h2 id="tracks" className="sr-only">
          Lộ trình luyện nói
        </h2>
        {TRACKS.map((track) => (
          <article
            key={track.key}
            className="rounded-3xl border border-line bg-surface p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]"
          >
            <h3 className="font-display text-xl font-bold text-forest">{track.name}</h3>
            <ul className="mt-3 flex flex-col gap-1 text-sm text-ink">
              {SECTIONS_BY_TRACK[track.key].map((code) => (
                <li key={code}>{SECTION_LABELS[code]}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <p className="text-sm text-ink-muted">
        Nội dung và phản hồi luyện tập, không phải tài liệu hay điểm IELTS/TOEIC chính thức.
      </p>
    </main>
  );
}
