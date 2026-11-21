import Image, { type StaticImageData } from "next/image";
import logoHorizontal from "@/assets/brand/logo/loopedu-logo-horizontal.svg";
import logoHorizontalReverse from "@/assets/brand/logo/loopedu-logo-horizontal-reverse.svg";
import logoPrimary from "@/assets/brand/logo/loopedu-logo-primary.svg";
import logoMark from "@/assets/brand/logo/loopedu-mark.svg";
import logoMarkReverse from "@/assets/brand/logo/loopedu-mark-reverse.svg";
import loopiCurious from "@/assets/brand/loopi/loopi-curious.png";
import loopiExcited from "@/assets/brand/loopi/loopi-excited.png";
import loopiHappy from "@/assets/brand/loopi/loopi-happy.png";
import loopiMain from "@/assets/brand/loopi/loopi-main.png";
import loopiNotes from "@/assets/brand/loopi/loopi-notes.png";
import loopiSceneFeedback from "@/assets/brand/loopi/loopi-scene-feedback.png";
import loopiSceneReview from "@/assets/brand/loopi/loopi-scene-review.png";
import loopiSceneSpeak from "@/assets/brand/loopi/loopi-scene-speak.png";
import loopiSpeaking from "@/assets/brand/loopi/loopi-speaking.png";

const LOGO = {
  /** Thanh trên, header: mặc định */
  horizontal: { src: logoHorizontal, width: 140 },
  /** Trên nền tối (bg-inverse) */
  "horizontal-reverse": { src: logoHorizontalReverse, width: 140 },
  /** Có tagline: màn đăng nhập, onboarding, chỗ logo đứng một mình và rộng */
  primary: { src: logoPrimary, width: 220 },
  /** Chỉ biểu tượng: chỗ hẹp, thanh trên điện thoại */
  mark: { src: logoMark, width: 40 },
  "mark-reverse": { src: logoMarkReverse, width: 40 },
} satisfies Record<string, { src: StaticImageData; width: number }>;

export type LogoName = keyof typeof LOGO;

type LogoProps = {
  name?: LogoName;
  /** Chiều rộng px; chiều cao tự theo tỉ lệ. */
  width?: number;
  priority?: boolean;
  className?: string;
};

/** Logo LoopEdu (SVG, không tối ưu qua server). Không đổi màu, kéo méo, thêm bóng hay viền. */
export function Logo({ name = "horizontal", width, priority, className }: LogoProps) {
  const { src, width: defaultWidth } = LOGO[name];
  const w = width ?? defaultWidth;
  return (
    <Image
      src={src}
      alt="LoopEdu"
      width={w}
      height={Math.round((w * src.height) / src.width)}
      priority={priority}
      className={className}
    />
  );
}

const LOOPI = {
  happy: loopiHappy,
  curious: loopiCurious,
  excited: loopiExcited,
  speaking: loopiSpeaking,
  notes: loopiNotes,
  main: loopiMain,
  "scene-speak": loopiSceneSpeak,
  "scene-review": loopiSceneReview,
  "scene-feedback": loopiSceneFeedback,
} satisfies Record<string, StaticImageData>;

export type LoopiPose = keyof typeof LOOPI;

type LoopiProps = {
  pose: LoopiPose;
  /** Chiều rộng px. Trạng thái trống 110–120, trong thẻ 72. 5 biểu cảm (happy, curious, excited, speaking, notes) vẽ gốc ~80 px nên giữ ≤ 160. */
  width?: number;
  /** Mặc định "" vì Loopi minh họa cho chữ bên cạnh. Chỉ điền khi hình mang nghĩa riêng. */
  alt?: string;
  className?: string;
};

/** Mascot Loopi (PNG nền trong suốt, Next tự thu nhỏ và đổi WebP/AVIF). Xem DESIGN.md mục "Logo & Loopi" trước khi dùng. */
export function Loopi({ pose, width = 120, alt = "", className }: LoopiProps) {
  const src = LOOPI[pose];
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={Math.round((width * src.height) / src.width)}
      className={className}
    />
  );
}
