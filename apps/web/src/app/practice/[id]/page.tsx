import type { Metadata } from "next";
import { PlayerScreen } from "@/components/practice/player-screen";

export const metadata: Metadata = { title: "Luyện nói – LoopEdu" };

export default async function PracticeSetPage({ params }: PageProps<"/practice/[id]">) {
  const { id } = await params;
  return <PlayerScreen questionSetId={id} />;
}
