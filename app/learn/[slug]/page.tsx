"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AmbientStage, BurstHost } from "@/components/Effects";
import { CursorAurora, ToastHost } from "@/components/Extras";
import SortVisualizer from "@/components/SortVisualizer";
import { SORT_CONFIGS } from "@/lib/sortConfigs";

function LearnHeader({ algoLabel, slug }: { algoLabel: string; slug: string }) {
  const siblings = Object.keys(SORT_CONFIGS);
  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: "var(--hud-h)", display: "flex", alignItems: "center",
      padding: "0 24px", gap: 16,
      background: "rgba(7,7,13,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em",
          color: "rgba(235,233,227,0.5)", textDecoration: "none", display: "flex",
          alignItems: "center", gap: 6, transition: "color 0.15s",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M7 1L3 5l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
        HOME
      </Link>

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />

      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em",
        color: "#f6c453",
      }}>BRAINROT</span>

      <div style={{
        width: 1, height: 16, background: "rgba(255,255,255,0.1)",
        transform: "skewX(-18deg)",
      }} />

      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em",
        color: "rgba(235,233,227,0.7)",
      }}>{algoLabel}</span>

      <div style={{ flex: 1 }} />

      {/* Algo switcher */}
      <div style={{
        display: "flex", gap: 4,
        background: "rgba(12,12,20,0.6)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8, padding: "3px 4px", overflow: "hidden",
      }}>
        {siblings.map((s) => {
          const c = SORT_CONFIGS[s];
          const isActive = s === slug;
          return (
            <Link
              key={s}
              href={`/learn/${s}`}
              style={{
                fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em",
                padding: "5px 10px", borderRadius: 5, textDecoration: "none",
                background: isActive ? "rgba(167,139,250,0.18)" : "transparent",
                color: isActive ? "#cdb9ff" : "rgba(235,233,227,0.4)",
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              {c.algoLabel.replace(" SORT", "")}
            </Link>
          );
        })}
      </div>
    </header>
  );
}

export default function LearnPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const config = SORT_CONFIGS[slug];

  if (!config) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        background: "var(--bg-0)", color: "var(--ink)",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(235,233,227,0.4)", letterSpacing: "0.15em" }}>
          404 · ALGORITHM NOT FOUND
        </span>
        <Link href="/" style={{ color: "#a78bfa", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <>
      <AmbientStage />
      <BurstHost />
      <CursorAurora />
      <ToastHost />

      <div style={{ background: "var(--bg-0)", position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <LearnHeader algoLabel={config.algoLabel} slug={slug} />
        <div style={{ paddingTop: "var(--hud-h)" }}>
          <SortVisualizer config={config} />
        </div>
      </div>
    </>
  );
}
