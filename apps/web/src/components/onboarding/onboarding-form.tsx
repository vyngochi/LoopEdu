"use client";

import {
  DAILY_GOAL_OPTIONS,
  MIN_AGE,
  isOnboarded,
  type ExamTrack,
  type Level,
} from "@loopedu/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeftIcon,
  Banner,
  Button,
  Radio,
  SegmentedControl,
  SelectField,
  Skeleton,
  TextField,
  cx,
  useToast,
} from "@/components/shared";
import { ApiRequestError } from "@/lib/api";
import { getMe, updateProfile } from "@/lib/auth";
import { MicCheck } from "./mic-check";

const TRACKS = [
  { value: "ielts", label: "IELTS" },
  { value: "toeic", label: "TOEIC" },
] as const satisfies readonly { value: ExamTrack; label: string }[];

// "Mức nội dung", không phải band (DESIGN.md · Giọng văn).
const LEVEL_OPTIONS: { value: Level; label: string; description: string }[] = [
  {
    value: "beginner",
    label: "Foundation",
    description: "Mới luyện nói, câu còn ngắn",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Nói được ý chính, đôi khi bí từ",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Nói khá trôi, muốn chính xác hơn",
  },
];

// Chỉ số phút: "20 phút" xuống dòng trong thẻ 480 px; đơn vị nằm ở nhãn nhóm.
const GOALS = DAILY_GOAL_OPTIONS.map((m) => ({
  value: String(m),
  label: String(m),
}));

// 4 bước để mỗi bước vừa một khung nhìn (DESIGN.md · Nguyên tắc 7).
const STEPS = 4;
type Step = 1 | 2 | 3 | 4;
const STEP_TITLES = [
  {
    heading: "Bạn sinh năm nào?",
    lead: "Bản LoopEdu Beta dành cho người từ 14 tuổi.",
  },
  {
    heading: "Bạn luyện thi gì?",
    lead: "Để chọn đúng dạng đề và mức nội dung cho bạn.",
  },
  {
    heading: "Mỗi ngày bao lâu?",
    lead: "Bài ngắn, nhắc ôn đúng ngày theo giờ của bạn.",
  },
  {
    heading: "Thử mic một chút",
    lead: "Bỏ qua cũng được, lần ghi âm đầu sẽ hỏi lại.",
  },
] as const;

type Form = {
  birthYear: string;
  examTrack: ExamTrack;
  level: Level;
  goal: string;
  timezone: string;
};

const thisYear = () => new Date().getFullYear();

/** Lỗi năm sinh theo cách sửa; null khi hợp lệ. Tuổi tính theo năm, như API. */
export function birthYearError(value: string): string | null {
  const year = Number(value);
  if (!/^\d{4}$/.test(value) || year < 1900)
    return "Nhập năm sinh 4 chữ số, ví dụ 2006.";
  if (thisYear() - year < MIN_AGE)
    return `LoopEdu dành cho người từ ${MIN_AGE} tuổi trở lên.`;
  return null;
}

function timeZones(detected: string): string[] {
  const all = Intl.supportedValuesOf("timeZone");
  return all.includes(detected) ? all : [detected, ...all];
}

/** Màn onboarding (F02, US-02): năm sinh, lộ trình, mức nội dung, mục tiêu phút/ngày, múi giờ, thử mic. */
export function OnboardingForm() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [yearLocked, setYearLocked] = useState(false);
  const [zones, setZones] = useState<string[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [yearError, setYearError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<"next" | "back">("next");
  const go = (to: Step) => {
    setDirection(to > step ? "next" : "back");
    setStep(to);
  };
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Đổi bước thì đưa focus về tiêu đề để trình đọc màn hình đọc bước mới; preventScroll để trang không nhảy.
  useEffect(() => {
    if (firstRender.current) return void (firstRender.current = false);
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Chạy ở trình duyệt: múi giờ đoán từ máy người học, danh sách múi giờ khác nhau giữa Node và trình duyệt.
  useEffect(() => {
    getMe().then(
      ({ profile: p }) => {
        if (isOnboarded(p)) return router.replace("/");
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezone = p.timezone ?? detected;
        setZones(timeZones(timezone));
        setYearLocked(p.birthYear !== null);
        setForm({
          birthYear: p.birthYear === null ? "" : String(p.birthYear),
          examTrack: p.examTrack ?? "ielts",
          level: (p.level as Level | null) ?? "beginner",
          goal: String(p.dailyGoalMinutes ?? 10),
          timezone,
        });
      },
      (err) => {
        if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED")
          router.replace("/login");
        else setLoadFailed(true);
      },
    );
  }, [router]);

  if (loadFailed)
    return (
      <Banner tone="error" title="Chưa tải được hồ sơ của bạn">
        Kiểm tra mạng rồi tải lại trang.
      </Banner>
    );

  if (!form)
    return (
      <div aria-busy="true" className="flex flex-col gap-4 py-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-13 w-full" />
        <Skeleton className="h-11 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm({ ...form, [key]: value });
  const age = thisYear() - Number(form.birthYear);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (step === 1) {
      const error = birthYearError(form.birthYear);
      setYearError(error);
      if (error) return;
    }
    if (step < STEPS) return go((step + 1) as Step);
    setBusy(true);
    try {
      await updateProfile({
        birthYear: Number(form.birthYear),
        examTrack: form.examTrack,
        level: form.level,
        dailyGoalMinutes: Number(form.goal),
        timezone: form.timezone,
      });
      router.replace("/");
    } catch (err) {
      const code = err instanceof ApiRequestError ? err.code : "NETWORK";
      if (code === "AGE_NOT_ELIGIBLE") {
        setYearError(`LoopEdu dành cho người từ ${MIN_AGE} tuổi trở lên.`);
        go(1);
      } else if (code === "CONFLICT")
        toast(
          "Năm sinh đã lưu trước đó, không đổi được. Tải lại trang nhé.",
          "error",
        );
      else if (code === "NETWORK")
        toast("Không kết nối được. Kiểm tra mạng rồi thử lại.", "error");
      else toast("Chưa lưu được. Thử lại sau ít phút.", "error");
      setBusy(false);
    }
  }

  const title = STEP_TITLES[step - 1];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="type-overline text-fg-secondary">
          Bước {step}/{STEPS}
        </p>
        <div aria-hidden="true" className="grid grid-cols-4 gap-1">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={cx(
                "h-1 rounded-full transition-colors duration-250 ease-out",
                i < step ? "bg-primary" : "bg-subtle",
              )}
            />
          ))}
        </div>
      </div>

      {/* key theo bước: mỗi lần đổi bước nội dung mount lại nên chạy lại hiệu ứng trượt; nút ở dưới đứng yên. */}
      <div
        key={step}
        className={cx(
          "flex flex-col gap-6",
          direction === "next" ? "animate-step-next" : "animate-step-back",
        )}
      >
      <div className="flex flex-col gap-2">
        {/* tabIndex -1 chỉ để nhận focus khi đổi bước; tiêu đề không bấm được nên bỏ viền focus. */}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="type-h1 text-heading outline-none"
        >
          {title.heading}
        </h1>
        <p className="type-body text-fg-secondary">{title.lead}</p>
      </div>

      {step === 1 && (
        <TextField
          label="Năm sinh"
          name="birthYear"
          inputMode="numeric"
          autoComplete="bday-year"
          maxLength={4}
          value={form.birthYear}
          readOnly={yearLocked}
          onChange={(e) => set("birthYear", e.target.value.replace(/\D/g, ""))}
          error={yearError}
          hint={
            yearLocked
              ? "Năm sinh đã lưu, không đổi được."
              : age === 14 || age === 15
                ? "Bạn dưới 16 tuổi: cần cha mẹ đồng ý trước khi ghi âm. Vẫn luyện tự nói được."
                : "Chỉ dùng để xác nhận độ tuổi, không hiển thị cho ai."
          }
        />
      )}

      {step === 2 && (
        <>
          <div className="flex flex-col gap-1.5">
            {/* Nhãn nhìn thấy; trình đọc màn hình dùng legend của SegmentedControl. */}
            <p aria-hidden="true" className="type-label text-fg">
              Lộ trình
            </p>
            <SegmentedControl
              legend="Lộ trình"
              name="examTrack"
              options={TRACKS}
              value={form.examTrack}
              onChange={(v) => set("examTrack", v)}
            />
            <p className="type-caption text-fg-secondary">
              Đổi được trong Cài đặt.
            </p>
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="type-label mb-1 text-fg">
              Mức nội dung bạn muốn bắt đầu
            </legend>
            {LEVEL_OPTIONS.map((o) => (
              <Radio
                key={o.value}
                name="level"
                value={o.value}
                label={o.label}
                description={o.description}
                checked={form.level === o.value}
                onChange={() => set("level", o.value)}
              />
            ))}
          </fieldset>
        </>
      )}

      {step === 3 && (
        <>
          <div className="flex flex-col gap-1.5">
            <p aria-hidden="true" className="type-label text-fg">
              Mục tiêu mỗi ngày (phút)
            </p>
            <SegmentedControl
              legend="Mục tiêu mỗi ngày (phút)"
              name="goal"
              options={GOALS}
              value={form.goal}
              onChange={(v) => set("goal", v)}
              fullWidth
            />
          </div>

          <SelectField
            label="Múi giờ"
            name="timezone"
            value={form.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            hint="Lịch ôn D+3, D+7, D+21 tính theo ngày ở múi giờ này."
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replaceAll("_", " ")}
              </option>
            ))}
          </SelectField>
        </>
      )}

      {step === 4 && <MicCheck />}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {step > 1 && (
          <Button
            variant="ghost"
            size="l"
            icon={<ArrowLeftIcon className="size-5" />}
            onClick={() => go((step - 1) as Step)}
            disabled={busy}
          >
            Quay lại
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="l"
          fullWidth
          loading={busy}
          className="sm:flex-1"
        >
          {step < STEPS ? "Sang bước tiếp" : busy ? "Đang lưu…" : "Bắt đầu học"}
        </Button>
      </div>
    </form>
  );
}
