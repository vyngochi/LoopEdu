"use client";

import type { PlayerView, SelfRating, SupportLevel } from "@loopedu/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  Banner,
  Button,
  EmptyState,
  Radio,
  SegmentedControl,
  Skeleton,
  Tag,
  buttonClass,
} from "@/components/shared";
import { ApiRequestError } from "@/lib/api";
import { PhaseTimer } from "./phase-timer";
import { practiceSource, reviewSource, type PlayerHeader } from "./player-source";
import { LEVEL_LABEL, SECTION_LABEL, firstPhase, nextPhase, phaseSeconds, type Phase } from "./player-state";
import { QuestionBody } from "./question-body";

const SUPPORT_OPTIONS = [
  { value: "sample", label: "Bài mẫu" },
  { value: "diagram", label: "Từ khóa" },
  { value: "none", label: "Không hỗ trợ" },
] as const satisfies readonly { value: SupportLevel; label: string }[];

// Ba mức tự đánh giá của PRD (mục 6). Không phải band hay điểm thi.
const RATING_OPTIONS = [
  { value: "not_yet", label: "Chưa nhớ" },
  { value: "partial", label: "Nhớ một phần" },
  { value: "good", label: "Trả lời tương đối tốt" },
] as const satisfies readonly { value: SelfRating; label: string }[];

const SUPPORT_HINT: Record<SupportLevel, string> = {
  sample: "Đọc theo bài mẫu nói về chính bạn. Hợp khi mới học đề này.",
  diagram: "Chỉ có từ khóa và cụm hữu ích, tự nói ý của mình.",
  none: "Chỉ có đề và đồng hồ, như lúc thi. Hợp khi đã quen đề.",
};

const header = (backHref: string, right?: string) => (
  <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-2 sm:px-4">
    <Link href={backHref} aria-label="Thoát, về danh sách" className={buttonClass({ variant: "ghost", size: "s" })}>
      <ArrowLeftIcon className="size-5" />
      Thoát
    </Link>
    {right && <p className="type-label text-fg-secondary">{right}</p>}
  </header>
);

const shell = (top: React.ReactNode, body: React.ReactNode, bottom?: React.ReactNode) => (
  // Trong phiên luyện ẩn điều hướng chính: chỉ còn nút thoát và tiến độ (DESIGN.md · Điều hướng).
  <div className="mx-auto flex h-dvh w-full max-w-reading flex-col bg-surface">
    {top}
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6">{body}</main>
    {bottom && <footer className="shrink-0 border-t border-line bg-surface px-4 py-3">{bottom}</footer>}
  </div>
);

type Session = PlayerView & { id: string };

/**
 * Màn luyện: chọn mức hỗ trợ → chuẩn bị/nói theo đồng hồ của đề → tự đánh giá. `mode` chọn nguồn:
 * luyện một đề mới (`id` là đề) hoặc ôn một lượt đến hạn (`id` là lượt ôn). Chưa ghi âm (V03).
 */
export function PlayerScreen({ mode, id }: { mode: "practice" | "review"; id: string }) {
  const router = useRouter();
  const source = useMemo(() => (mode === "review" ? reviewSource(id) : practiceSource(id)), [mode, id]);
  const [detail, setDetail] = useState<PlayerHeader | null>(null);
  const [failure, setFailure] = useState<"missing" | "network" | null>(null);
  const [level, setLevel] = useState<SupportLevel>(source.defaultLevel);
  const [starting, setStarting] = useState(false);
  const [startFailed, setStartFailed] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "done" });
  const [rating, setRating] = useState<SelfRating | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeFailed, setCompleteFailed] = useState(false);
  const [finished, setFinished] = useState(false);

  const fail = useCallback(
    (err: unknown) => {
      if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") return router.replace("/login");
      // Ôn chưa đến hạn (CONFLICT) cũng là "không có lượt này" với người học.
      const missing = err instanceof ApiRequestError && (err.code === "NOT_FOUND" || err.code === "CONFLICT");
      setFailure(missing ? "missing" : "network");
    },
    [router],
  );

  const load = useCallback(() => source.loadHeader().then(setDetail, fail), [source, fail]);
  const retry = () => {
    setFailure(null);
    void load();
  };

  useEffect(() => {
    void load();
  }, [load]);

  async function start() {
    setStarting(true);
    setStartFailed(null);
    try {
      const s = await source.start(level);
      setSession(s);
      setPhase(firstPhase(s.timing));
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") return router.replace("/login");
      setStartFailed(
        err instanceof ApiRequestError && err.code === "CONFLICT"
          ? "Lượt này chưa đến hạn hoặc đã xong. Xem lại danh sách nhé."
          : "Thử lại sau vài giây. Chưa có gì bị tính.",
      );
    } finally {
      setStarting(false);
    }
  }

  async function complete() {
    if (!session || !rating) return;
    setCompleting(true);
    setCompleteFailed(false);
    try {
      await source.complete(session.id, rating, level);
      setFinished(true);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") return router.replace("/login");
      setCompleteFailed(true);
    } finally {
      setCompleting(false);
    }
  }

  // Quay lại màn chọn mức hỗ trợ để mở một phiên mới.
  const again = () => {
    setSession(null);
    setPhase({ kind: "done" });
    setRating(null);
    setFinished(false);
    setCompleteFailed(false);
  };

  const advance = useCallback(() => {
    setPhase((p) => (session ? nextPhase(session.timing, p) : p));
  }, [session]);

  const back = source.backHref;

  if (failure === "missing")
    return shell(
      header(back),
      <EmptyState
        loopi="curious"
        title={source.missing.title}
        description={source.missing.description}
        action={
          <Link href={back} className={buttonClass({ variant: "primary" })}>
            {source.backLabel}
          </Link>
        }
      />,
    );
  if (failure === "network")
    return shell(
      header(back),
      <Banner tone="error" title="Chưa mở được đề" action={<Button variant="outline" size="s" onClick={retry}>Thử lại</Button>}>
        Kiểm tra mạng rồi thử lại. Chưa có lượt nào bị trừ.
      </Banner>,
    );

  if (!detail)
    return shell(
      header(back),
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải đề">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>,
    );

  // --- Chọn mức hỗ trợ ---
  if (!session)
    return shell(
      header(back),
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {detail.badge && <Tag tone="success">{detail.badge}</Tag>}
            <Tag tone={detail.examType === "ielts" ? "brand" : "neutral"}>{SECTION_LABEL[detail.sectionCode]}</Tag>
            <Tag tone="neutral">{LEVEL_LABEL[detail.difficulty]}</Tag>
          </div>
          <h1 className="type-h2 text-heading">{detail.topic}</h1>
        </div>

        <div className="flex flex-col gap-3">
          <SegmentedControl legend="Mức hỗ trợ" name="support" options={SUPPORT_OPTIONS} value={level} onChange={setLevel} fullWidth />
          <p className="type-body text-fg-secondary">{SUPPORT_HINT[level]}</p>
        </div>

        {startFailed !== null && (
          <Banner tone="error" title="Chưa bắt đầu được">
            {startFailed}
          </Banner>
        )}
      </div>,
      <Button variant="primary" size="l" fullWidth loading={starting} onClick={() => void start()}>
        {starting ? "Đang mở đề…" : source.startLabel}
      </Button>,
    );

  // --- Phiên luyện ---
  const steps = session.timing.steps.length;
  const step = phase.kind === "done" ? steps : phase.step + 1;
  const progress = phase.kind === "done" ? "Xong" : steps > 1 ? `Câu ${step}/${steps}` : SECTION_LABEL[session.questionSet.sectionCode];

  if (phase.kind === "done" && finished)
    return shell(
      header(back, "Xong"),
      <Banner tone="success" title={source.doneTitle}>
        Bạn tự đánh giá: {RATING_OPTIONS.find((o) => o.value === rating)?.label}.
      </Banner>,
      <div className="flex gap-3">
        {source.canRetry && (
          <Button variant="outline" size="l" fullWidth onClick={again}>
            Luyện lại
          </Button>
        )}
        <Link href={back} className={buttonClass({ variant: "primary", size: "l", fullWidth: true })}>
          {source.backLabel}
        </Link>
      </div>,
    );

  if (phase.kind === "done")
    return shell(
      header(back, progress),
      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-3">
          <legend className="type-h2 mb-1 text-heading">Bạn thấy lần này thế nào?</legend>
          <p className="type-body text-fg-secondary">Tự đánh giá thôi, để bạn biết mình nắm đề này đến đâu.</p>
          {RATING_OPTIONS.map((o) => (
            <Radio key={o.value} name="rating" label={o.label} checked={rating === o.value} onChange={() => setRating(o.value)} />
          ))}
        </fieldset>
        {completeFailed && (
          <Banner tone="error" title="Chưa lưu được kết quả">
            Thử lại sau vài giây. Phiên của bạn vẫn còn.
          </Banner>
        )}
      </div>,
      <div className="flex gap-3">
        {source.canRetry && (
          <Button variant="outline" size="l" fullWidth onClick={again}>
            Luyện lại
          </Button>
        )}
        <Button variant="primary" size="l" fullWidth disabled={!rating} loading={completing} onClick={() => void complete()}>
          {completing ? "Đang lưu…" : "Hoàn thành"}
        </Button>
      </div>,
    );

  const phaseKey = `${phase.kind}-${phase.step}`;
  return shell(
    header(back, progress),
    <QuestionBody session={session} phase={phase} />,
    <div className="flex items-center gap-4">
      <PhaseTimer key={phaseKey} phase={phase} seconds={phaseSeconds(session.timing, phase)} onDone={advance} />
      <Button variant="primary" size="l" onClick={advance}>
        {phase.kind === "speak" ? "Xong câu này" : phase.kind === "prep" ? "Bắt đầu nói" : "Bắt đầu chuẩn bị"}
      </Button>
    </div>,
  );
}
