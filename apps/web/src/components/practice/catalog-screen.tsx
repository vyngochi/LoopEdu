"use client";

import { isOnboarded, type ExamTrack, type QuestionSetSummary } from "@loopedu/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeftIcon, Banner, Button, EmptyState, Skeleton, Tag, buttonClass, cardClass, cx } from "@/components/shared";
import { ApiRequestError } from "@/lib/api";
import { getMe } from "@/lib/auth";
import { listQuestionSets } from "@/lib/practice";
import { LEVEL_LABEL, SECTION_LABEL } from "./player-state";

type Loaded = { track: ExamTrack; sets: QuestionSetSummary[] };

/** Nhóm theo chủ đề, giữ thứ tự API trả về (đã xếp theo tên chủ đề). */
function byTopic(sets: QuestionSetSummary[]) {
  const groups = new Map<string, { name: string; sets: QuestionSetSummary[] }>();
  for (const s of sets) {
    const g = groups.get(s.topic.id) ?? { name: s.topic.name, sets: [] };
    g.sets.push(s);
    groups.set(s.topic.id, g);
  }
  return [...groups.values()];
}

/** Danh sách đề người học được mở, theo lộ trình đã chọn lúc onboarding (US-32). */
export function CatalogScreen() {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    return getMe()
      .then(async ({ profile }) => {
        if (!isOnboarded(profile) || !profile.examTrack) return router.replace("/onboarding");
        setData({ track: profile.examTrack, sets: await listQuestionSets(profile.examTrack) });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") router.replace("/login");
        else setFailed(true);
      });
  }, [router]);

  const retry = () => {
    setFailed(false);
    void load();
  };

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-reading flex-col gap-6 px-4 py-4">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className={buttonClass({ variant: "ghost", size: "s" })}>
          <ArrowLeftIcon className="size-5" />
          Trang chủ
        </Link>
        {data && <Tag tone={data.track === "ielts" ? "brand" : "neutral"}>{data.track === "ielts" ? "IELTS" : "TOEIC"}</Tag>}
      </header>

      <main className="flex flex-col gap-5">
        <h1 className="type-h1 text-heading">Chọn đề luyện</h1>

        {failed && (
          <Banner tone="error" title="Chưa tải được danh sách đề" action={<Button variant="outline" size="s" onClick={retry}>Thử lại</Button>}>
            Kiểm tra mạng rồi thử lại.
          </Banner>
        )}

        {!data && !failed && (
          <div aria-busy="true" aria-label="Đang tải danh sách đề" className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {data && data.sets.length === 0 && (
          <EmptyState loopi="curious" title="Chưa có đề cho lộ trình này" description="Đề mới sẽ sớm có. Bạn có thể đổi lộ trình trong phần thiết lập." />
        )}

        {data &&
          byTopic(data.sets).map((g) => (
            <section key={g.name} aria-label={g.name} className="flex flex-col gap-2">
              <h2 className="type-title text-heading">{g.name}</h2>
              <ul className="flex flex-col gap-2">
                {g.sets.map((s) => (
                  <li key={s.id}>
                    <Link href={`/practice/${s.id}`} className={cx(cardClass, "flex min-h-14 items-center justify-between gap-3 hover:border-primary")}>
                      <span className="type-label text-heading">{SECTION_LABEL[s.sectionCode]}</span>
                      <span className="flex items-center gap-2">
                        {s.status === "pending_review" && <Tag tone="warning">Chờ duyệt</Tag>}
                        <Tag tone="neutral">{LEVEL_LABEL[s.difficulty]}</Tag>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </main>
    </div>
  );
}
