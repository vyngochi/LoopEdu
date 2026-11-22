import { MicIcon, buttonClass, cx } from "@/components/shared";
import { Section } from "./chrome";
import { ANCHOR, LEADERBOARD, YOU } from "./content";

const BAR_PX_PER_MINUTE = 3.38; // chiều cao cột tỉ lệ với thời gian nói
const WEEK = 7;

function Dots({ days }: { days: number }) {
  return (
    <span aria-hidden="true" className="flex justify-center gap-[3px]">
      {Array.from({ length: WEEK }, (_, i) => (
        <span key={i} className={cx("block size-2 rounded-full", i < days ? "bg-primary" : "bg-line")} />
      ))}
    </span>
  );
}

const label = (who: string, rank: number, minutes: number, days: number) =>
  `Hạng ${rank}: ${who}, ${minutes} phút nói, ${days} trên ${WEEK} ngày luyện`;

export function Leaderboard() {
  return (
    <Section id={ANCHOR.leaderboard} labelledBy="bxh-title" className="bg-subtle" innerClassName="gap-9">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <h2 id="bxh-title" className="type-lp-h2 max-w-3xl">
          Tích lũy thời gian nói để ghi danh bảng xếp hạng
        </h2>
        <p className="max-w-xl text-lg text-fg-secondary">Bảng tuần xếp theo số ngày có luyện và thời gian nói tích lũy.</p>
      </div>

      <div className="flex flex-col gap-4.5 rounded-lp-panel bg-surface p-6 pb-5 shadow-2">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <span className="type-h2 inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5.5 fill-none stroke-warning stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6" />
            </svg>
            Tuần này
          </span>
          <span className="type-caption text-fg-muted">Dữ liệu minh họa</span>
        </div>

        <div className="overflow-x-auto pt-2">
          <ol className="m-0 flex min-w-180 list-none items-end justify-center gap-3.5 px-1">
            {LEADERBOARD.map((p) => {
              const first = p.rank === 1;
              const podium = p.rank <= 3;
              return (
                <li key={p.rank} aria-label={label(p.name, p.rank, p.minutes, p.days)} className="flex max-w-28 min-w-18.5 flex-1 flex-col items-center gap-2">
                  {first && (
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6.5 fill-celebrate">
                      <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
                    </svg>
                  )}
                  <span className={cx("font-display leading-none font-black text-heading", first ? "text-[22px]" : "text-base")}>
                    {p.minutes}
                    <span className="font-sans text-xs font-semibold text-fg-secondary"> phút</span>
                  </span>
                  <span
                    className={cx(
                      "flex shrink-0 items-center justify-center rounded-full border-[3px] bg-surface text-[13px] font-bold text-heading",
                      first ? "size-13 border-celebrate" : podium ? "size-11 border-record" : "size-11 border-line",
                    )}
                  >
                    {p.initials}
                  </span>
                  <span
                    className={cx(
                      "flex shrink-0 items-end justify-center rounded-full pb-2.5 font-display font-black text-on-primary",
                      first ? "w-16 bg-linear-to-b from-celebrate via-record via-45% to-primary text-xl" : "w-13 text-base",
                      podium && !first && "bg-linear-to-b from-lp-lime to-primary",
                      !podium && "bg-linear-to-b from-lp-lime-soft to-record",
                    )}
                    style={{ height: Math.round(p.minutes * BAR_PX_PER_MINUTE) }}
                  >
                    {p.rank}
                  </span>
                  <span className="flex h-13 flex-col items-center gap-1.5 pt-1 text-center">
                    <b className="type-label whitespace-nowrap text-fg">{p.name}</b>
                    <Dots days={p.days} />
                  </span>
                </li>
              );
            })}

            <li aria-hidden="true" className="flex h-27.5 w-7 shrink-0 flex-col items-center justify-end pb-16 text-xl font-bold tracking-widest text-line-input">
              ⋯
            </li>

            <li aria-label={label("Bạn", YOU.rank, YOU.minutes, YOU.days)} className="flex max-w-28 min-w-18.5 flex-1 flex-col items-center gap-2">
              <span className="font-display text-base leading-none font-black text-primary">
                {YOU.minutes}
                <span className="font-sans text-xs font-semibold"> phút</span>
              </span>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-on-primary">Bạn</span>
              <span
                className="flex w-13 shrink-0 items-end justify-center rounded-full border-2 border-dashed border-primary bg-selected pb-2 font-display text-sm font-black text-heading"
                style={{ height: Math.round(YOU.minutes * BAR_PX_PER_MINUTE) }}
              >
                {YOU.rank}
              </span>
              <span className="flex h-13 flex-col items-center gap-1.5 pt-1 text-center">
                <b className="type-label text-primary">Bạn</b>
                <Dots days={YOU.days} />
              </span>
            </li>
          </ol>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-md bg-selected px-4.5 py-3.5">
          <div className="flex min-w-0 flex-1 basis-80 flex-col gap-2">
            <span className="type-body text-heading">
              <b>Bạn đang hạng {YOU.rank}.</b> Luyện thêm 2 ngày trong tuần này để vào top 10.
            </span>
            <span role="img" aria-label="Tiến độ vào top 10: 3 trên 5 ngày" className="block h-2.5 rounded-full bg-surface">
              <span className="block h-2.5 w-3/5 rounded-full bg-primary" />
            </span>
          </div>
          <a href={`#${ANCHOR.start}`} className={buttonClass({ variant: "primary" })}>
            <MicIcon className="size-4.5" />
            Nói 10 phút hôm nay
          </a>
        </div>
      </div>
    </Section>
  );
}
