"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { getModuleConfig } from "@/lib/sorting/gameConfigs";

// Dynamic imports — each game uses canvas/WebGL, must be client-only
const GAME_MAP: Record<string, ReturnType<typeof dynamic>> = {
  "bubble-sort":    dynamic(() => import("@/components/games/sorting/BubbleSortGame"),    { ssr: false }),
  "selection-sort": dynamic(() => import("@/components/games/sorting/SelectionSortGame"), { ssr: false }),
  "insertion-sort": dynamic(() => import("@/components/games/sorting/InsertionSortGame"), { ssr: false }),
  "merge-sort":     dynamic(() => import("@/components/games/sorting/MergeSortGame"),     { ssr: false }),
  "quick-sort":     dynamic(() => import("@/components/games/sorting/QuickSortGame"),     { ssr: false }),
  "heap-sort":      dynamic(() => import("@/components/games/sorting/HeapSortGame"),      { ssr: false }),
  "counting-sort":  dynamic(() => import("@/components/games/sorting/CountingSortGame"),  { ssr: false }),
  "radix-sort":     dynamic(() => import("@/components/games/sorting/RadixSortGame"),     { ssr: false }),
  "shell-sort":     dynamic(() => import("@/components/games/sorting/ShellSortGame"),     { ssr: false }),
  "tim-sort":       dynamic(() => import("@/components/games/sorting/TimSortGame"),       { ssr: false }),
  "cycle-sort":     dynamic(() => import("@/components/games/sorting/CycleSortGame"),     { ssr: false }),
  "bucket-sort":    dynamic(() => import("@/components/games/sorting/BucketSortGame"),    { ssr: false }),
};

export default function SortingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const config = getModuleConfig(slug);
  if (!config) notFound();

  const GameComponent = GAME_MAP[slug];
  if (!GameComponent) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)" }}>
      <GameComponent />
    </div>
  );
}
