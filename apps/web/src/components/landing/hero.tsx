import { Loopi, MicIcon, buttonClass, cx } from "@/components/shared";
import { ANCHOR } from "./content";

const WAVE_PATH =
  "M -40 330 C 30 320, 70 200, 135 200 C 260 200, 320 96, 429 96 C 540 96, 610 140, 723 140 C 845 140, 905 16, 1017 16 C 1085 16, 1135 6, 1190 -30";
const WAVEFORM = [8, 16, 22, 12, 24, 14, 20, 9, 18, 24, 12, 16];

// Thẻ trắng nổi trên nền hero; so le theo chiều dọc từ lg để thành đường cong.
const CARD = "relative flex flex-col gap-3 rounded-lp-card bg-surface px-4.5 pt-7.5 pb-4.5 text-fg shadow-lp-float";
const BADGE =
  "absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 font-display text-base font-black text-heading ring-4 ring-heading";
const CARD_TITLE = "type-label text-heading";
const FOOT = "type-label flex justify-between border-t border-line pt-2.5 font-normal text-fg-secondary";
const MARK = "rounded-xs bg-selected px-1 font-semibold text-heading";
const PILL = "rounded-sm bg-selected px-2 py-1.5";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-lp-hero text-on-primary">
      <div className="mx-auto flex max-w-content flex-col gap-14 px-6 pt-20 pb-18">
        <div className="flex flex-col items-center gap-5.5 text-center">
          <span className="type-label inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-selected/30 py-1.5 pr-3.5 pl-1.5 text-selected">
            <span className="rounded-full bg-record px-2.5 py-0.5 text-xs font-bold text-heading">Beta miễn phí</span>
            Học thử miễn phí trong giai đoạn Beta
          </span>

          <h1 id="hero-title" className="type-lp-hero max-w-5xl text-balance">
            Luyện nói tiếng Anh
            <br />
            <span className="mr-[0.22em] inline-block -translate-y-[0.12em] -rotate-5 font-script text-[0.6em] font-light tracking-normal text-lp-sage">
              theo
            </span>
            <span className="relative inline-block whitespace-nowrap font-bold text-lp-lime">
              spaced repetition
              <svg
                aria-hidden="true"
                viewBox="0 0 400 40"
                preserveAspectRatio="none"
                className="absolute -bottom-[0.32em] -left-[2%] h-[0.42em] w-[104%] overflow-visible"
              >
                <g fill="none" className="stroke-celebrate" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
                  <path d="M4 26 C 70 12, 150 8, 230 12 C 290 15, 330 22, 352 18 C 372 14, 378 2, 364 4 C 350 6, 356 26, 396 20" vectorEffect="non-scaling-stroke" />
                  <path d="M384 10 L397 20 L382 28" vectorEffect="non-scaling-stroke" />
                </g>
              </svg>
            </span>
            .
          </h1>

          <p className="max-w-2xl text-lg text-selected">
            Dành 10 phút mỗi ngày luyện nói theo bài mẫu được tạo bởi Loopi, ghi âm và Loopi sẽ gửi cho bạn nhận xét. Tạo thói quen quay lại ôn tập theo D+3, D+7 và D+21 và thực hiện khảo sát cá nhân hóa.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <a href={`#${ANCHOR.start}`} className={buttonClass({ variant: "inverse", size: "l" })}>
              <MicIcon />
              Nói bài đầu tiên hôm nay
            </a>
            <a href={`#${ANCHOR.how}`} className={buttonClass({ variant: "inverse-outline", size: "l" })}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4.5 fill-none stroke-lp-lime stroke-[2.2]" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 5v14l11-7z" />
              </svg>
              Xem thử DEMO
            </a>
          </div>
          <p className="type-label font-normal text-lp-mist">Miễn phí trong beta · 10 lượt chấm mỗi tháng</p>
        </div>

        {/* Một câu nói, bốn lần: học, ôn D+3, D+7, D+21 */}
        <div className="relative">
          <svg
            aria-hidden="true"
            viewBox="0 0 1152 460"
            preserveAspectRatio="none"
            className="absolute top-0 left-0 hidden h-115 w-full overflow-visible lg:block"
          >
            <defs>
              <linearGradient id="lp-loop" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" className="[stop-color:var(--color-lp-lime)]" stopOpacity={0.35} />
                <stop offset="0.55" className="[stop-color:var(--color-record)]" />
                <stop offset="1" className="[stop-color:var(--color-celebrate)]" />
              </linearGradient>
            </defs>
            <path d={WAVE_PATH} fill="none" className="stroke-selected/20" strokeWidth={14} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={WAVE_PATH} fill="none" stroke="url(#lp-loop)" strokeWidth={4} strokeLinecap="round" strokeDasharray="2 12" vectorEffect="non-scaling-stroke" />
          </svg>

          <ol className="relative grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-start gap-6 pt-4">
            <li className={cx(CARD, "lg:mt-50")}>
              <span className={cx(BADGE, "bg-selected")}>Hôm nay</span>
              <span className={CARD_TITLE}>Đọc theo bài mẫu</span>
              <p className="text-base leading-7">
                One place I really love is Hội An. It feels{" "}
                <span className="rounded-xs border-b-[2.5px] border-warning bg-warning-bg px-1 text-warning-fg">comfortable</span>, and{" "}
                <mark className={MARK}>the more</mark> I visit, <mark className={MARK}>the more</mark> relaxed I feel.
              </p>
              <span className="type-caption rounded-sm bg-warning-bg px-2.5 py-2 text-warning-fg">
                Nhấn âm đầu: <b>COM</b>-fortable
              </span>
              <div className={FOOT}>
                <span>Phát âm</span>
                <b className="text-fg">72</b>
              </div>
            </li>

            <li className={cx(CARD, "lg:mt-24")}>
              <span className={cx(BADGE, "bg-record")}>Sau 3 ngày</span>
              <span className={CARD_TITLE}>Ôn với sơ đồ ý</span>
              <div aria-hidden="true" className="flex flex-col gap-2 py-0.5">
                <span className="block h-2 w-[92%] rounded-full bg-disabled" />
                <span className="block h-2 w-[78%] rounded-full bg-disabled" />
                <span className="block h-2 w-[60%] rounded-full bg-disabled" />
              </div>
              <div className="type-caption grid grid-cols-2 gap-1.5 font-normal">
                <span className={PILL}>✓ <b>Where</b> · Hội An</span>
                <span className={PILL}>✓ <b>Why</b> · quiet</span>
                <span className={PILL}>✓ <b>What</b> · walk</span>
                <span className="rounded-sm border-[1.5px] border-dashed border-line-input px-2 py-1 text-fg-secondary">— <b>Who</b> · chưa nói</span>
              </div>
              <div className={FOOT}>
                <span>Ý nói được</span>
                <b className="text-fg">3/4</b>
              </div>
            </li>

            <li className={cx(CARD, "lg:mt-35")}>
              <span className={cx(BADGE, "bg-record")}>Sau 7 ngày</span>
              <span className={CARD_TITLE}>Thử tự nói mà không có mẫu</span>
              <span className="type-label text-fg">Describe a place you like to visit.</span>
              <div className="flex items-center gap-2.5 rounded-full bg-subtle py-1.5 pr-3 pl-1.5">
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-record text-heading">
                  <MicIcon className="size-4" />
                </span>
                <span aria-hidden="true" className="flex h-6.5 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
                  {WAVEFORM.map((h, i) => (
                    <span key={i} className="w-[3px] shrink-0 rounded-[2px] bg-primary" style={{ height: h }} />
                  ))}
                </span>
                <span className="type-label shrink-0 font-bold">1:24</span>
              </div>
              <div className="type-caption flex flex-wrap gap-1.5">
                <span className="rounded-full bg-selected px-2.5 py-0.5 text-heading">✓ the more…</span>
                <span className="rounded-full bg-selected px-2.5 py-0.5 text-heading">✓ peaceful</span>
                <span className="rounded-full border-[1.5px] border-dashed border-line-input px-2.5 py-px text-fg-secondary">It&apos;s worth…</span>
              </div>
              <div className={FOOT}>
                <span>Pattern đã dùng</span>
                <b className="text-fg">3/6</b>
              </div>
            </li>

            <li className={cx(CARD, "ring-3 ring-celebrate lg:mt-4")}>
              <span className={cx(BADGE, "bg-celebrate")}>Sau 21 ngày</span>
              <Loopi pose="excited" width={96} className="absolute -top-19.5 -right-3.5 hidden h-auto sm:block" />
              <div className="flex items-center justify-between gap-2">
                <span className={CARD_TITLE}>Master</span>
                <span className="rounded-full bg-celebrate-bg px-2.5 py-0.5 text-xs font-bold text-celebrate-fg">Nhớ trọn câu</span>
              </div>
              <p className="text-base leading-7">
                …It feels <span className="rounded-xs border-b-[2.5px] border-primary bg-selected px-1 font-semibold text-heading">comfortable ✓</span>, and{" "}
                <mark className={MARK}>the more</mark> I visit, <mark className={MARK}>the more</mark> relaxed I feel. I usually go there with my colleagues.
              </p>
              <div className="type-label flex flex-col gap-1.5 border-t border-line pt-2.5 font-normal text-fg-secondary">
                <div className="flex justify-between">
                  <span>Phát âm</span>
                  <span>
                    <span className="text-fg-muted">72 →</span> <b className="text-fg">84</b> <b className="text-primary">▲ 12</b>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ý nói được</span>
                  <b className="text-fg">4/4</b>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
