"use client";

import type { ReviewTask } from "@loopedu/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertIcon, ArrowLeftIcon, Banner, Button, EmptyState, Skeleton, Tag, buttonClass, cardClass, cx } from "@/components/shared";
import { ApiRequestError } from "@/lib/api";
import { listDueReviews } from "@/lib/practice";
import { SECTION_LABEL } from "./player-state";

const PAGE_SIZE = 20;

// Thẻ quá hạn: nền và viền cảnh báo (DESIGN.md · Học). Không dùng cardClass vì cx không ghi đè màu nền.
const OVERDUE_CARD = "rounded-md border-[1.5px] border-warning-line bg-warning-subtle p-5";

const milestone = (t: ReviewTask) => (t.milestoneDays ? `D+${t.milestoneDays}` : "Ôn thêm");

/** My Reviews (US-07): bài đến hạn và quá hạn theo ngày địa phương; bài quá hạn xếp đầu và không bị ẩn. */
export function ReviewsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ReviewTask[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    (offset: number) =>
      listDueReviews(PAGE_SIZE, offset).then(
        (page) => {
          setItems((prev) => (offset === 0 ? page.items : [...(prev ?? []), ...page.items]));
          setTotal(page.total);
        },
        (err: unknown) => {
          if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") router.replace("/login");
          else setFailed(true);
        },
      ),
    [router],
  );

  useEffect(() => {
    void fetchPage(0);
  }, [fetchPage]);

  const retry = () => {
    setFailed(false);
    void fetchPage(items?.length ?? 0);
  };

  async function more() {
    setLoadingMore(true);
    await fetchPage(items?.length ?? 0);
    setLoadingMore(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-reading flex-col gap-6 px-4 py-4">
      <header>
        <Link href="/" className={buttonClass({ variant: "ghost", size: "s" })}>
          <ArrowLeftIcon className="size-5" />
          Trang chủ
        </Link>
      </header>

      <main className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="type-h1 text-heading">Ôn tập</h1>
          {items && total > 0 && <p className="type-body text-fg-secondary">{total} bài đến hạn</p>}
        </div>

        {failed && (
          <Banner tone="error" title="Chưa tải được danh sách ôn" action={<Button variant="outline" size="s" onClick={retry}>Thử lại</Button>}>
            Kiểm tra mạng rồi thử lại. Lịch ôn của bạn không bị ảnh hưởng.
          </Banner>
        )}

        {!items && !failed && (
          <div aria-busy="true" aria-label="Đang tải danh sách ôn" className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {items && items.length === 0 && (
          <EmptyState
            loopi="happy"
            title="Hôm nay không có bài ôn"
            description="Luyện một đề mới để có lịch ôn sau 3, 7 và 21 ngày."
            action={
              <Link href="/practice" className={buttonClass({ variant: "primary" })}>
                Chọn đề luyện
              </Link>
            }
          />
        )}

        {items && items.length > 0 && (
          <ul className="flex flex-col gap-3">
            {items.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/reviews/${t.id}`}
                  className={cx(t.daysOverdue > 0 ? OVERDUE_CARD : cardClass, "flex min-h-14 items-center justify-between gap-3 hover:border-primary")}
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="type-title truncate text-heading">{t.questionSet.topic.name}</span>
                    <span className="type-caption text-fg-secondary">{SECTION_LABEL[t.questionSet.sectionCode]}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <Tag tone="brand">{milestone(t)}</Tag>
                    {t.daysOverdue > 0 ? (
                      <Tag tone="warning" icon={<AlertIcon />}>
                        Quá hạn {t.daysOverdue} ngày
                      </Tag>
                    ) : (
                      <Tag tone="neutral">Hôm nay</Tag>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {items && items.length < total && (
          <Button variant="outline" fullWidth loading={loadingMore} onClick={() => void more()}>
            {loadingMore ? "Đang tải…" : "Xem thêm"}
          </Button>
        )}
      </main>
    </div>
  );
}
