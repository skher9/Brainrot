"use client";
import { use, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProblemAttempt } from "@/hooks/useProblemAttempt";
import { BS_PROBLEMS } from "@/components/games/tier1/binary-search/problems";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { GameProps } from "@/components/games/tier1/binary-search/types";

const P1 = dynamic(() => import("@/components/games/tier1/binary-search/P1_RecordStore"), { ssr: false, loading: () => <GameLoader /> });
const P2 = dynamic(() => import("@/components/games/tier1/binary-search/P2_ConveyorFactory"), { ssr: false, loading: () => <GameLoader /> });
const P3 = dynamic(() => import("@/components/games/tier1/binary-search/P3_NightclubQueue"), { ssr: false, loading: () => <GameLoader /> });
const P4 = dynamic(() => import("@/components/games/tier1/binary-search/P4_DroneMission"), { ssr: false, loading: () => <GameLoader /> });
const P5 = dynamic(() => import("@/components/games/tier1/binary-search/P5_RotatingSafe"), { ssr: false, loading: () => <GameLoader /> });
const P6 = dynamic(() => import("@/components/games/tier1/binary-search/P6_DeliveryRace"), { ssr: false, loading: () => <GameLoader /> });
const P7 = dynamic(() => import("@/components/games/tier1/binary-search/P7_CargoShip"), { ssr: false, loading: () => <GameLoader /> });
const P8 = dynamic(() => import("@/components/games/tier1/binary-search/P8_DualConveyor"), { ssr: false, loading: () => <GameLoader /> });

function GameLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#374151", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
      loading...
    </div>
  );
}

const GAME_MAP: Record<number, React.ComponentType<GameProps>> = {
  1: P1, 2: P2, 3: P3, 4: P4, 5: P5, 6: P6, 7: P7, 8: P8,
};

const DIFF_COLOR: Record<string, string> = {
  Easy: "#22c55e",
  Medium: "#eab308",
  Hard: "#ef4444",
};

const S: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
};

export default function ProblemPage({ params }: { params: Promise<{ index: string }> }) {
  const { index } = use(params);
  const idx = parseInt(index, 10);
  const problem = BS_PROBLEMS.find(p => p.index === idx) ?? null;

  const supabase = createClient();
  const [dbId, setDbId] = useState<string | null>(null);
  const [solveVisible, setSolveVisible] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { submitSolve, incrementAttempts, attemptData, startAttempt } =
    useProblemAttempt(dbId, "binary-search");

  useEffect(() => {
    if (!problem) return;
    async function loadId() {
      const { data } = await supabase
        .from("problems")
        .select("id")
        .eq("pattern_slug", "binary-search")
        .eq("order_index", problem!.index)
        .maybeSingle();
      if (data) setDbId(data.id);
    }
    loadId();
  }, [problem]);

  useEffect(() => {
    if (dbId) startAttempt();
  }, [dbId]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleSolve = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await submitSolve(0);
    setSolveVisible(true);
  };

  const handleAttempt = async () => {
    setAttempts(a => a + 1);
    await incrementAttempts();
  };

  if (!problem) {
    return (
      <div style={{ ...S, minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#ef4444", fontSize: 12 }}>Problem not found.</span>
      </div>
    );
  }

  const GameComponent = GAME_MAP[idx];
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ ...S, height: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 20px",
        borderBottom: "1px solid #111",
        flexShrink: 0, zIndex: 10,
      }}>
        <Link href="/learn/tier1/binary-search" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 10, color: "#374151", cursor: "pointer", letterSpacing: "0.08em" }}>← BS</span>
        </Link>
        <span style={{ fontSize: 10, color: "#1e1e1e" }}>/</span>
        <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>
          P{problem.index} — {problem.title}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
          {(attemptData.solved || solveVisible) && (
            <span style={{ fontSize: 10, color: "#22c55e", letterSpacing: "0.08em" }}>✓ SOLVED</span>
          )}
          <span style={{ fontSize: 10, color: "#374151" }}>{formatTime(elapsed)}</span>
          <span style={{
            fontSize: 9, letterSpacing: "0.1em", fontWeight: 700,
            color: DIFF_COLOR[problem.difficulty] ?? "#64748b",
          }}>
            {problem.difficulty.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Game canvas — fills remaining height */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {GameComponent ? (
          <GameComponent onSolve={handleSolve} onAttempt={handleAttempt} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#374151", fontSize: 12 }}>
            Game not available.
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "8px 20px",
        borderTop: "1px solid #111",
        flexShrink: 0, zIndex: 10,
      }}>
        <span style={{ fontSize: 10, color: "#1e1e1e" }}>
          {attempts > 0 ? `${attempts} attempt${attempts !== 1 ? "s" : ""}` : "no attempts yet"}
        </span>
        {problem.leetcodeRef && (
          <span style={{ fontSize: 10, color: "#1e2a2a", marginLeft: "auto" }}>
            LC #{problem.leetcodeRef}
          </span>
        )}
      </div>

      {/* After-solve slide-up panel */}
      {solveVisible && (
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "#0d0d0d",
            border: "1px solid #1a1a1a",
            borderBottom: "none",
            borderTopLeftRadius: 10, borderTopRightRadius: 10,
            padding: "24px 28px 32px",
            zIndex: 50,
            animation: "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: "0.1em", marginBottom: 4 }}>✓ SOLVED</div>
                <div style={{ fontSize: 16, color: "#e2e8f0", fontWeight: 700 }}>{problem.insightTitle}</div>
              </div>
              <button
                onClick={() => setSolveVisible(false)}
                style={{
                  background: "none", border: "1px solid #1e1e1e", color: "#374151",
                  padding: "4px 10px", borderRadius: 4, cursor: "pointer",
                  fontSize: 10, fontFamily: "inherit",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              fontSize: 13, color: "#94a3b8", lineHeight: 1.8,
              padding: "14px 16px",
              background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a1a",
              borderRadius: 6,
            }}>
              {problem.insight}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/learn/tier1/binary-search" style={{ textDecoration: "none" }}>
                <button style={{
                  padding: "8px 16px",
                  background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: 4, cursor: "pointer", fontSize: 11, color: "#22c55e",
                  fontFamily: "inherit", letterSpacing: "0.06em",
                }}>
                  ← BACK TO MODULE
                </button>
              </Link>
              {idx < 8 && (
                <Link href={`/learn/tier1/binary-search/${idx + 1}`} style={{ textDecoration: "none" }}>
                  <button style={{
                    padding: "8px 16px",
                    background: "#111", border: "1px solid #1e1e1e",
                    borderRadius: 4, cursor: "pointer", fontSize: 11, color: "#475569",
                    fontFamily: "inherit", letterSpacing: "0.06em",
                  }}>
                    NEXT PROBLEM →
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
