"use client";
import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProblemAttempt } from "@/hooks/useProblemAttempt";
import PointerTraceGame from "@/components/games/tier1/binary-search/games/PointerTraceGame";
import ResourceConstraintGame from "@/components/games/tier1/binary-search/games/ResourceConstraintGame";
import DragInsertGame from "@/components/games/tier1/binary-search/games/DragInsertGame";
import SimulationGuessGame from "@/components/games/tier1/binary-search/games/SimulationGuessGame";
import PartitionGame from "@/components/games/tier1/binary-search/games/PartitionGame";
import Link from "next/link";

interface Problem {
  id: string;
  order_index: number;
  brainrot_title: string;
  difficulty: string;
  game_type: string;
  scenario: string;
  description: string;
  constraints_text: string | null;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: "#22c55e",
  Medium: "#eab308",
  Hard: "#ef4444",
};

const S: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
};

function GameComponent({
  problem,
  onSolve,
  onAttempt,
}: {
  problem: Problem;
  onSolve: (attempts: number) => void;
  onAttempt: () => void;
}) {
  const { game_type, order_index } = problem;

  if (game_type === "pointer_trace") {
    const mechanic =
      order_index === 5 ? "modified_binary_search" : "classic_binary_search";
    return <PointerTraceGame mechanic={mechanic} onSolve={onSolve} onAttempt={onAttempt} />;
  }
  if (game_type === "resource_constraint") {
    const mechanic =
      order_index === 4 ? "binary_search_on_condition" : "find_first_true";
    return <ResourceConstraintGame mechanic={mechanic} onSolve={onSolve} onAttempt={onAttempt} />;
  }
  if (game_type === "drag_insert") {
    return <DragInsertGame onSolve={onSolve} onAttempt={onAttempt} />;
  }
  if (game_type === "simulation_guess") {
    const mechanic =
      order_index === 7 ? "binary_search_on_answer_hard" : "binary_search_on_answer";
    return <SimulationGuessGame mechanic={mechanic} onSolve={onSolve} onAttempt={onAttempt} />;
  }
  if (game_type === "partition_game") {
    return <PartitionGame onSolve={onSolve} onAttempt={onAttempt} />;
  }
  return <div style={{ color: "#ef4444", fontSize: 12 }}>Unknown game type: {game_type}</div>;
}

export default function ProblemPage({
  params,
}: {
  params: Promise<{ problemIndex: string }>;
}) {
  const { problemIndex } = use(params);
  const supabase = createClient();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const idx = parseInt(problemIndex);
      const { data } = await supabase
        .from("problems")
        .select("id, order_index, brainrot_title, difficulty, game_type, scenario, description, constraints_text")
        .eq("pattern_slug", "binary-search")
        .eq("order_index", idx)
        .maybeSingle();
      setProblem(data ?? null);
      setLoading(false);
    }
    load();
  }, [problemIndex]);

  const { submitSolve, incrementAttempts, attemptData, startAttempt } =
    useProblemAttempt(problem?.id ?? null, "binary-search");

  useEffect(() => {
    if (problem) startAttempt();
  }, [problem]);

  const handleSolve = async (gameAttempts: number) => {
    await submitSolve(0);
  };

  const handleAttempt = async () => {
    await incrementAttempts();
  };

  if (loading) {
    return (
      <div style={{ ...S, minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: "#374151" }}>Loading...</span>
      </div>
    );
  }

  if (!problem) {
    return (
      <div style={{ ...S, minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: "#ef4444" }}>Problem not found.</span>
      </div>
    );
  }

  return (
    <div style={{ ...S, minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 24px",
        borderBottom: "1px solid #111",
        flexShrink: 0,
      }}>
        <Link href="/learn/tier1/binary-search" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 11, color: "#374151", cursor: "pointer", letterSpacing: "0.08em" }}>
            ← BINARY SEARCH
          </span>
        </Link>
        <span style={{ fontSize: 11, color: "#1e1e1e" }}>/</span>
        <span style={{ fontSize: 11, color: "#475569" }}>
          P{problem.order_index} — {problem.brainrot_title}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {attemptData.solved && (
            <span style={{ fontSize: 10, color: "#22c55e", letterSpacing: "0.08em" }}>✓ SOLVED</span>
          )}
          <span style={{
            fontSize: 9, letterSpacing: "0.1em", fontWeight: 700,
            color: DIFFICULTY_COLOR[problem.difficulty] ?? "#64748b",
          }}>
            {problem.difficulty.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Split layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: statement (40%) */}
        <div style={{
          width: "40%", minWidth: 280,
          borderRight: "1px solid #111",
          padding: "28px 24px",
          overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 20,
        }}>
          {/* Scenario */}
          <div style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a1a",
            borderRadius: 4, fontSize: 12, color: "#64748b", lineHeight: 1.6,
            fontStyle: "italic",
          }}>
            {problem.scenario}
          </div>

          {/* Description */}
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {problem.description}
          </div>

          {/* Constraints */}
          {problem.constraints_text && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.1em" }}>CONSTRAINTS</div>
              <div style={{
                padding: "10px 14px",
                background: "#0d0d0d", border: "1px solid #1a1a1a",
                borderRadius: 4, fontSize: 11, color: "#475569", lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}>
                {problem.constraints_text}
              </div>
            </div>
          )}

          {/* Attempt info */}
          {(attemptData.attempts > 0 || attemptData.solved) && (
            <div style={{
              padding: "10px 14px",
              background: attemptData.solved ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${attemptData.solved ? "rgba(34,197,94,0.15)" : "#1a1a1a"}`,
              borderRadius: 4, fontSize: 11, color: "#475569", display: "flex", gap: 16,
            }}>
              <span>Attempts: {attemptData.attempts}</span>
              {attemptData.timeTakenSeconds !== null && (
                <span>Time: {attemptData.timeTakenSeconds}s</span>
              )}
              {attemptData.solved && <span style={{ color: "#22c55e" }}>✓ Solved</span>}
            </div>
          )}
        </div>

        {/* Right: game (60%) */}
        <div style={{
          flex: 1,
          padding: "28px 28px",
          overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}>
          <GameComponent
            problem={problem}
            onSolve={handleSolve}
            onAttempt={handleAttempt}
          />
        </div>
      </div>
    </div>
  );
}
