"use client";
import { use, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProblemAttempt } from "@/hooks/useProblemAttempt";
import { GRAPH_PROBLEMS } from "@/components/games/tier1/graphs/problems";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { GameProps } from "@/components/games/tier1/graphs/types";

function GameLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#374151", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
      loading...
    </div>
  );
}

const Minefield = dynamic(() => import("@/components/games/tier1/graphs/games/Minefield"), { ssr: false, loading: () => <GameLoader /> });
const IslandCount = dynamic(() => import("@/components/games/tier1/graphs/games/IslandCount"), { ssr: false, loading: () => <GameLoader /> });
const TheEscape = dynamic(() => import("@/components/games/tier1/graphs/games/TheEscape"), { ssr: false, loading: () => <GameLoader /> });
const RottenOranges = dynamic(() => import("@/components/games/tier1/graphs/games/RottenOranges"), { ssr: false, loading: () => <GameLoader /> });
const WallsAndGates = dynamic(() => import("@/components/games/tier1/graphs/games/WallsAndGates"), { ssr: false, loading: () => <GameLoader /> });
const PacificAtlantic = dynamic(() => import("@/components/games/tier1/graphs/games/PacificAtlantic"), { ssr: false, loading: () => <GameLoader /> });
const WordLadder = dynamic(() => import("@/components/games/tier1/graphs/games/WordLadder"), { ssr: false, loading: () => <GameLoader /> });
const CriticalLines = dynamic(() => import("@/components/games/tier1/graphs/games/CriticalLines"), { ssr: false, loading: () => <GameLoader /> });

const GAME_MAP: Record<number, React.ComponentType<GameProps>> = {
  1: Minefield,
  2: IslandCount,
  3: TheEscape,
  4: RottenOranges,
  5: WallsAndGates,
  6: PacificAtlantic,
  7: WordLadder,
  8: CriticalLines,
};

const DIFF_COLOR: Record<string, string> = {
  Easy: "#22c55e", Medium: "#eab308", Hard: "#ef4444",
};

const S: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
};

export default function GraphProblemPage({ params }: { params: Promise<{ index: string }> }) {
  const { index } = use(params);
  const idx = parseInt(index, 10);
  const problem = GRAPH_PROBLEMS.find(p => p.index === idx) ?? null;

  const supabase = createClient();
  const [dbId, setDbId] = useState<string | null>(null);
  const [solveVisible, setSolveVisible] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { submitSolve, incrementAttempts, attemptData, startAttempt } =
    useProblemAttempt(dbId, "graphs");

  useEffect(() => {
    if (!problem) return;
    async function loadId() {
      const { data } = await supabase
        .from("problems")
        .select("id")
        .eq("pattern_slug", "graphs")
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
      {/* Top nav bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 20px",
        borderBottom: "1px solid #111",
        flexShrink: 0, zIndex: 10,
      }}>
        <Link href="/learn/tier1/graphs" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 10, color: "#374151", cursor: "pointer", letterSpacing: "0.08em" }}>← GR</span>
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

      {/* Game canvas */}
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

      {/* After-solve insight panel */}
      {solveVisible && (
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "#080c10",
            border: "1px solid #0d2040",
            borderBottom: "none",
            borderTopLeftRadius: 10, borderTopRightRadius: 10,
            padding: "22px 24px 28px",
            zIndex: 50,
            fontFamily: "inherit",
            animation: "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 580, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 9, color: "#22c55e", letterSpacing: "0.12em", marginBottom: 4 }}>✓ SOLVED</div>
                <div style={{ fontSize: 15, color: "#e2e8f0", fontWeight: 600 }}>{problem.insightTitle}</div>
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
              fontSize: 12, color: "#6b8fa0", lineHeight: 1.85,
              padding: "12px 14px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid #0d1e30",
              borderRadius: 6,
              borderLeft: "3px solid #1d4ed8",
            }}>
              {problem.insight}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/learn/tier1/graphs" style={{ textDecoration: "none" }}>
                <button style={{
                  padding: "8px 16px",
                  background: "transparent", border: "1px solid #1a2a3a",
                  borderRadius: 4, cursor: "pointer", fontSize: 10, color: "#374151",
                  fontFamily: "inherit", letterSpacing: "0.06em",
                }}>
                  ← MODULE
                </button>
              </Link>
              {idx < 8 && (
                <Link href={`/learn/tier1/graphs/${idx + 1}`} style={{ textDecoration: "none" }}>
                  <button style={{
                    padding: "8px 16px",
                    background: "rgba(59,130,246,0.1)", border: "1px solid #1d4ed8",
                    borderRadius: 4, cursor: "pointer", fontSize: 10, color: "#3b82f6",
                    fontFamily: "inherit", letterSpacing: "0.06em",
                  }}>
                    NEXT →
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
