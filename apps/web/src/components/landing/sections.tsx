import { CheckIcon, Loopi, MicIcon, buttonClass, cx } from "@/components/shared";
import { Section } from "./chrome";
import { ANCHOR, FAQ, FEATURES, PERSONAS, PRICING_GROUPS, PROBLEMS, STEPS } from "./content";

const EYEBROW = "type-overline text-[13px] tracking-widest";

export function Problems() {
  return (
    <Section labelledBy="vi-sao-title">
      <div className="flex max-w-3xl flex-col gap-3">
        <span className={EYEBROW}>LoopEdu là gì?</span>
        <h2 id="vi-sao-title" className="type-lp-h2">
          Một người bạn hỗ trợ luyện Speaking mỗi ngày, không tốn thời gian tìm đề
        </h2>
        <p className="text-lg text-fg-secondary">
          LoopEdu là web app luyện nói tiếng Anh. Mỗi bài chỉ khoảng 10 phút nói theo cấu trúc, giúp bạn học từ vựng và word patterns tiện lợi hơn từ các sơ đồ trực quan.
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
        {PROBLEMS.map((p) => (
          <article key={p.title} className="flex flex-col gap-3.5 rounded-lp-card border-[1.5px] border-line p-6">
            <span className="type-label font-normal text-fg-muted">{p.quote}</span>
            <h3 className="type-lp-h3">{p.title}</h3>
            <p className="type-body text-fg-secondary">{p.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function HowItWorks() {
  return (
    <Section id={ANCHOR.how} labelledBy="cach-title" className="bg-subtle" innerClassName="gap-11">
      <h2 id="cach-title" className="type-lp-h2 max-w-2xl">
        Loopi hướng dẫn bạn dùng
      </h2>
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 p-0">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-3.5 rounded-lg bg-surface p-5.5">
            <div className="flex h-48 items-center justify-center rounded-md bg-warm">
              <Loopi pose={s.pose} width={s.width} alt={s.alt} className="h-auto" />
            </div>
            <span className="font-display text-base font-black text-primary">Bước {i + 1}</span>
            <h3 className="type-lp-h3">{s.title}</h3>
            <p className="type-body text-fg-secondary">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Features() {
  return (
    <Section id={ANCHOR.features} labelledBy="tinh-nang-title" className="bg-inverse text-on-primary">
      <div className="flex max-w-3xl flex-col gap-3">
        <span className={cx(EYEBROW, "text-lp-lime")}>Tính năng</span>
        <h2 id="tinh-nang-title" className="type-lp-h2 text-on-primary">
          Loopi hỗ trợ bạn tự luyện tập mỗi ngày
        </h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {FEATURES.map((f) => (
          <article key={f.title} className="flex flex-col gap-2.5 rounded-lp-card border border-selected/20 bg-on-primary/6 p-6">
            <span className="text-lp-lime">{f.icon}</span>
            <h3 className="font-display text-xl font-extrabold">{f.title}</h3>
            <p className="type-body text-selected">{f.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function Personas() {
  return (
    <Section labelledBy="danh-cho-ai-title" className="bg-warm" innerClassName="gap-9">
      <div className="flex max-w-3xl flex-col gap-3">
        <span className={EYEBROW}>Dành cho ai</span>
        <h2 id="danh-cho-ai-title" className="type-lp-h2">
          Bạn muốn nói tiếng Anh tự tin hơn nhưng không có thời gian và hay bí ý?
        </h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
        {PERSONAS.map((p) => (
          <figure key={p.title} className="m-0 flex flex-col gap-2 rounded-lg bg-surface p-7">
            <figcaption className="type-lp-h3">{p.title}</figcaption>
            <p className="type-body text-fg-secondary">{p.body}</p>
          </figure>
        ))}
      </div>
    </Section>
  );
}

export function Pricing() {
  return (
    <Section id={ANCHOR.pricing} labelledBy="gia-title">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className={EYEBROW}>Chi phí</span>
        <h2 id="gia-title" className="type-lp-h2">
          Miễn phí trong giai đoạn beta
        </h2>
        <p className="max-w-xl text-lg text-fg-secondary">
          Dùng đầy đủ tính năng trong lúc LoopEdu thử nghiệm. Không cần thẻ thanh toán, không tự gia hạn.
        </p>
      </div>

      <div className="flex flex-wrap overflow-hidden rounded-lp-panel border-[1.5px] border-line bg-surface shadow-3">
        <div className="flex min-w-0 flex-1 basis-85 flex-col gap-5 bg-inverse p-8 text-on-primary sm:px-8 sm:py-9">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl font-extrabold">Gói Beta</h3>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-record px-3 py-1 text-xs font-bold text-heading">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-heading" />
              Đang mở
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-7xl leading-none font-black tracking-tight">0đ</span>
              <span className="text-lp-mist">/ tháng</span>
            </div>
            <span className="type-label font-normal text-selected">
              Gồm <b className="text-on-primary">10 lượt chấm ghi âm</b> mỗi tháng
            </span>
          </div>
          <span aria-hidden="true" className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="h-2 rounded-full bg-record" />
            ))}
          </span>
          <a href={`#${ANCHOR.start}`} className={cx(buttonClass({ variant: "inverse", size: "l", fullWidth: true }), "mt-auto")}>
            <MicIcon />
            Nói bài đầu tiên hôm nay
          </a>
          <span className="type-caption text-center text-lp-mist">
            Quota beta có thời hạn. Gói trả phí sau beta sẽ được thông báo trước.
          </span>
        </div>

        <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-6 p-8 sm:py-9">
          <span className="type-h2">Gói Beta có gì?</span>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-8 gap-y-7">
            {PRICING_GROUPS.map((g) => (
              <div key={g.title} className="flex flex-col gap-3">
                <h3 className={EYEBROW}>{g.title}</h3>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {g.items.map((item) => (
                    <li key={item} className="type-body flex gap-2.5">
                      <CheckIcon className="mt-0.5 size-4.5 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

export function Faq() {
  return (
    <Section id={ANCHOR.faq} labelledBy="faq-title" className="bg-subtle" innerClassName="max-w-4xl gap-7">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className={EYEBROW}>Hỏi đáp</span>
        <h2 id="faq-title" className="type-lp-h2">
          Câu hỏi thường gặp về luyện nói cùng LoopEdu
        </h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {FAQ.map((item, i) => (
          <details key={item.q} open={i === 0} className="group rounded-md bg-surface px-5.5 py-1">
            <summary className="flex min-h-15 cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-heading [&::-webkit-details-marker]:hidden">
              {item.q}
              <span aria-hidden="true" className="text-3xl font-normal text-primary transition-transform duration-150 ease-out group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="type-body pb-4.5 text-fg-secondary">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export function FinalCta() {
  return (
    <section id={ANCHOR.start} aria-labelledby="cta-title" className="scroll-mt-16 bg-inverse py-22 text-on-primary">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-10 px-6">
        <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-4.5">
          <h2 id="cta-title" className="font-display text-[clamp(1.875rem,4vw,2.875rem)] leading-[1.1] font-black">
            Học thử miễn phí ngay hôm nay!
          </h2>
          <p className="text-lg text-selected">Nhập email, LoopEdu gửi link đăng nhập. Không cần mật khẩu, không cần thẻ thanh toán.</p>
          {/* Chưa nối API đăng nhập: form chỉ kiểm tra email hợp lệ rồi tải lại về mục này. */}
          <form action={`#${ANCHOR.start}`} className="flex flex-wrap items-end gap-2.5">
            <label className="type-label flex min-w-65 flex-1 flex-col gap-1.5 text-selected">
              Email của bạn
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="ban@email.com"
                className="h-13 rounded-full border-[1.5px] border-line-input bg-surface px-5.5 text-base font-normal text-fg placeholder:text-fg-muted focus-visible:outline-on-primary"
              />
            </label>
            <button type="submit" className={buttonClass({ variant: "inverse", size: "l" })}>
              Gửi link đăng nhập
            </button>
          </form>
          <span className="type-caption text-selected">
            Dành cho người từ 14 tuổi. Phản hồi luyện tập, không phải điểm IELTS hay TOEIC chính thức.
          </span>
        </div>
        <div className="flex flex-1 basis-60 justify-center">
          <div className="rounded-lp-panel bg-selected p-5.5">
            <Loopi pose="excited" width={220} alt="Loopi hào hứng" className="h-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
