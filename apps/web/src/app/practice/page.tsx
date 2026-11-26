import type { Metadata } from "next";
import { CatalogScreen } from "@/components/practice/catalog-screen";

export const metadata: Metadata = { title: "Chọn đề luyện – LoopEdu" };

export default function PracticePage() {
  return <CatalogScreen />;
}
