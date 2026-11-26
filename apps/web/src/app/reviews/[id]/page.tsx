import type { Metadata } from "next";
import { PlayerScreen } from "@/components/practice/player-screen";

export const metadata: Metadata = { title: "Ôn tập – LoopEdu" };

export default async function ReviewTaskPage({ params }: PageProps<"/reviews/[id]">) {
  const { id } = await params;
  return <PlayerScreen mode="review" id={id} />;
}
