"use client";
import { use, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProblemAttempt } from "@/hooks/useProblemAttempt";
import { BS_PROBLEMS } from "@/components/games/tier1/binary-search/problems";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { GameProps } from "@/components/games/tier1/binary-search/types";
import { FloatingReactions } from "@/components/games/tier1/binary-search/FloatingReactions";
import MissionBrief from "@/components/games/tier1/binary-search/MissionBrief";
import Toolbox from "@/components/games/tier1/binary-search/Toolbox";
import DebriefQuestion from "@/components/games/tier1/binary-search/DebriefQuestion";
import MISSIONS, { dominantComplexity, complexityScore } from "@/components/games/tier1/binary-search/missionConfigs";
import AlgoModal from "@/components/games/AlgoModal";

function GameLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#374151", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
      loading...
    </div>
  );
}

const VaultHeist = dynamic(() => import("@/components/games/tier1/binary-search/games/VaultHeist"), { ssr: false, loading: () => <GameLoader /> });
const Outbreak = dynamic(() => import("@/components/games/tier1/binary-search/games/Outbreak"), { ssr: false, loading: () => <GameLoader /> });
const Tournament = dynamic(() => import("@/components/games/tier1/binary-search/games/Tournament"), { ssr: false, loading: () => <GameLoader /> });
const DeadSignal = dynamic(() => import("@/components/games/tier1/binary-search/games/DeadSignal"), { ssr: false, loading: () => <GameLoader /> });
const GridZero = dynamic(() => import("@/components/games/tier1/binary-search/games/GridZero"), { ssr: false, loading: () => <GameLoader /> });
const P6 = dynamic(() => import("@/components/games/tier1/binary-search/P6_DeliveryRace"), { ssr: false, loading: () => <GameLoader /> });
const P7 = dynamic(() => import("@/components/games/tier1/binary-search/P7_CargoShip"), { ssr: false, loading: () => <GameLoader /> });
const P8 = dynamic(() => import("@/components/games/tier1/binary-search/P8_DualConveyor"), { ssr: false, loading: () => <GameLoader /> });

const GAME_MAP: Record<number, React.ComponentType<GameProps>> = {
  1: VaultHeist, 2: Outbreak, 3: Tournament, 4: DeadSignal,
  5: GridZero, 6: P6, 7: P7, 8: P8,
};

const DIFF_COLOR: Record<string, string> = {
  Easy: "#22c55e", Medium: "#eab308", Hard: "#ef4444",
};

const S: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
};

export default function ProblemPage({ params }: { params: Promise<{ index: string }> }) {
  const { index } = use(params);
  const idx = parseInt(index, 10);
  const problem = BS_PROBLEMS.find(p => p.index === idx) ?? null;
  const mission = MISSIONS[idx] ?? null;
  const isMissionGame = mission !== null;

  const supabase = createClient();
  const [dbId, setDbId] = useState<string | null>(null);
  const [solveVisible, setSolveVisible] = useState(false);
  const [debriefVisible, setDebriefVisible] = useState(false);
  const [algoModalOpen, setAlgoModalOpen] = useState(false);
  const [algoAutoClose, setAlgoAutoClose] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tool + score state (mission games only)
  const [activeTool, setActiveTool] = useState<string>(mission?.defaultTool ?? "");
  const [usedTools, setUsedTools] = useState<{ name: string; complexity: string }[]>([]);
  const [score, setScore] = useState(100);

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

  useEffect(() => {
    const t = setTimeout(() => {
      setAlgoAutoClose(true);
      setAlgoModalOpen(true);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Listen for tool usage events from Phaser scenes
  useEffect(() => {
    if (!isMissionGame) return;
    function onToolUsed(e: Event) {
      const { tool, complexity } = (e as CustomEvent).detail as { tool: string; complexity: string };
      setUsedTools(prev => {
        // dedup: only add unique tool name entries
        if (prev.some(t => t.name === tool)) return prev;
        return [...prev, { name: tool, complexity }];
      });
    }
    window.addEventListener("bs-tool-used", onToolUsed);
    return () => window.removeEventListener("bs-tool-used", onToolUsed);
  }, [isMissionGame]);

  // Emit tool selection to Phaser scene
  function handleSelectTool(name: string) {
    setActiveTool(name);
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("bs-tool-select", { detail: { tool: name } }));
  }

  function calcScore(): number {
    if (!mission) return 100;
    const dominant = dominantComplexity(usedTools.map(t => t.complexity));
    let base = complexityScore(dominant, mission.optimalComplexity);
    // speed bonus: +15 if solved in under 60s
    if (elapsed < 60) base = Math.min(100, base + 15);
    // first attempt bonus: +10
    if (attempts <= 1) base = Math.min(100, base + 10);
    return base;
  }

  const handleSolve = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await submitSolve(0);
    if (isMissionGame) {
      setScore(calcScore());
      setDebriefVisible(true);
    } else {
      setSolveVisible(true);
    }
  };

  const handleAttempt = async () => {
    setAttempts(a => a + 1);
    await incrementAttempts();
  };

  function handleDebriefContinue(bonusPoints: number) {
    setScore(s => Math.min(100, s + bonusPoints));
    setDebriefVisible(false);
    setSolveVisible(true);
  }

  if (!problem) {
    return (
      <div style={{ ...S, minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#ef4444", fontSize: 12 }}>Problem not found.</span>
      </div>
    );
  }

  const GameComponent = GAME_MAP[idx];
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const dominantUsed = dominantComplexity(usedTools.map(t => t.complexity));

  return (
    <div style={{ ...S, height: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* Top nav bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 20px",
        borderBottom: "1px solid #111",
        flexShrink: 0, zIndex: 10,
      }}>
        <Link href="/learn/tier1/binary-search" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 10, color: "#374151", cursor: "pointer", letterSpacing: "0.08em" }}>← BS</span>
        </Link>
        <button
          onClick={() => { setAlgoAutoClose(false); setAlgoModalOpen(true); }}
          style={{
            padding: "3px 10px",
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: 4, cursor: "pointer",
            fontSize: 9, color: "#3b82f6",
            fontFamily: "inherit", letterSpacing: "0.1em",
          }}
        >
          LEARN ALGO
        </button>
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

      {/* Mission brief (games 1-4 only) */}
      {isMissionGame && mission && (
        <MissionBrief
          missionName={mission.missionName}
          situation={mission.situation}
          objective={mission.objective}
          constraint={mission.constraint}
          tools={mission.tools.map(t => t.name)}
          difficulty={mission.difficulty}
          lcRef={mission.lcRef}
          score={score}
        />
      )}

      {/* Toolbox (games 1-4 only) */}
      {isMissionGame && mission && (
        <Toolbox
          tools={mission.tools}
          activeTool={activeTool}
          usedTools={usedTools}
          onSelectTool={handleSelectTool}
        />
      )}

      {/* Game canvas */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {GameComponent ? (
          <GameComponent onSolve={handleSolve} onAttempt={handleAttempt} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#374151", fontSize: 12 }}>
            Game not available.
          </div>
        )}
        <FloatingReactions />

        {/* Debrief question overlay (mission games, slides up after solve) */}
        {isMissionGame && (
          <DebriefQuestion
            visible={debriefVisible}
            toolsUsed={usedTools}
            finalComplexity={dominantUsed === "--" ? mission?.optimalComplexity ?? "O(log n)" : dominantUsed}
            optimalComplexity={mission?.optimalComplexity ?? "O(log n)"}
            score={score}
            onContinue={handleDebriefContinue}
          />
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

      <AlgoModal
        open={algoModalOpen}
        onClose={() => { setAlgoModalOpen(false); setAlgoAutoClose(false); }}
        mechanic={problem.mechanic}
        autoClose={algoAutoClose}
      />

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
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {isMissionGame && (
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: score >= 90 ? "#22c55e" : score >= 70 ? "#3b82f6" : score >= 50 ? "#eab308" : "#ef4444",
                  }}>
                    {score}/100
                  </span>
                )}
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
              <Link href="/learn/tier1/binary-search" style={{ textDecoration: "none" }}>
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
                <Link href={`/learn/tier1/binary-search/${idx + 1}`} style={{ textDecoration: "none" }}>
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
