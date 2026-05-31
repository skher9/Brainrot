"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { StarCount } from "@/components/games/tier1/sliding-window/scan/types";

const SignalScanner = dynamic(
  () => import("@/components/games/tier1/sliding-window/scan/signal-scanner/SignalScanner"),
  { ssr: false, loading: () => (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060a08", fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(0,220,120,0.4)" }}>
      loading...
    </div>
  )}
);

const SLUG = "signal-scanner";

function saveProgress(levelNum: number, stars: StarCount) {
  const key = `sw_${SLUG}_stars`;
  let arr: number[] = [];
  try { arr = JSON.parse(localStorage.getItem(key) ?? "[]") as number[]; } catch {}
  while (arr.length < 8) arr.push(0);
  if (stars > (arr[levelNum - 1] ?? 0)) arr[levelNum - 1] = stars;
  localStorage.setItem(key, JSON.stringify(arr));
  localStorage.setItem(`sw_${SLUG}_levels`, String(arr.filter(s => s > 0).length));
}

export default function SignalScannerLevel({ params }: { params: Promise<{ level: string }> }) {
  const { level } = use(params);
  const router = useRouter();
  const n = parseInt(level, 10);

  if (isNaN(n) || n < 1 || n > 8) {
    router.push("/learn/tier1/sliding-window/signal-scanner");
    return null;
  }

  return (
    <SignalScanner
      levelNum={n}
      onComplete={({ stars }) => saveProgress(n, stars)}
      onBack={() => router.push("/learn/tier1/sliding-window/signal-scanner")}
    />
  );
}
