import type { Metadata } from "next";
import { ReviewsScreen } from "@/components/practice/reviews-screen";

export const metadata: Metadata = { title: "Ôn tập – LoopEdu" };

export default function ReviewsPage() {
  return <ReviewsScreen />;
}
