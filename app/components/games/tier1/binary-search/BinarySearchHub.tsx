"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Problem {
  id: string;
  order_index: number;
  brainrot_title: string;
  difficulty: string;
  game_type: string;
}

interface AttemptRow {
  problem_id: string;
  solved: boolean;
  attempts: number;
}

const GAME_TYPE_LABEL: Record<string, string> = {
  pointer_trace: "Pointer Trace",
  resource_constraint: "Budget Search",
  drag_insert: "Insertion Point",
  simulation_guess: "Binary on Answer",
  partition_game: "Median Split",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#22c55e",
  medium: "#eab308",
  hard: "#ef4444",
};

const S: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
};

export default function BinarySearchHub() {
  const supabase = createClient();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [attempts, setAttempts] = useState<Map<string, AttemptRow>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: probs } = await supabase
        .from("problems")
        .select("id, order_index, brainrot_title, difficulty, game_type")
        .eq("pattern_slug", "binary-search")
        .order("order_index");

      if (!probs) { setLoading(false); return; }
      setProblems(probs);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const ids = probs.map(p => p.id);
      const { data: attRows } = await supabase
        .from("user_problem_attempts")
        .select("problem_id, solved, attempts")
        .eq("user_id", user.id)
        .in("problem_id", ids);

      if (attRows) {
        const map = new Map<string, AttemptRow>();
        for (const r of attRows) map.set(r.problem_id, r);
        setAttempts(map);
      }
      setLoading(false);
    }
    load();
  }, []);

  const solved = problems.filter(p => attempts.get(p.id)?.solved).length;

  return (
    <div style={{ ...S, display: "flex", flexDirection: "column", gap: 24, padding: "32px 0" }}>
      {/* Pattern header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>TIER 1 · PATTERN 1</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#e2e8f0" }}>Binary Search</h1>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
          Halve the search space every step. O(log n) guaranteed.
        </p>
        <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "#475569" }}>{problems.length} problems</span>
          <span style={{ fontSize: 11, color: "#22c55e" }}>{solved} solved</span>
        </div>
      </div>

      {/* Progress bar */}
      {problems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", background: "#22c55e", borderRadius: 2,
              width: `${(solved / problems.length) * 100}%`,
              transition: "width 0.3s",
            }} />
          </div>
          <div style={{ fontSize: 9, color: "#374151" }}>{solved} / {problems.length} complete</div>
        </div>
      )}

      {/* Problem cards */}
      {loading ? (
        <div style={{ fontSize: 12, color: "#374151" }}>Loading...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {problems.map(prob => {
            const att = attempts.get(prob.id);
            const isSolved = att?.solved ?? false;
            return (
              <Link
                key={prob.id}
                href={`/learn/tier1/binary-search/${prob.order_index}`}
                style={{ textDecoration: "none" }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px",
                  background: isSolved ? "rgba(34,197,94,0.04)" : "#111",
                  border: `1px solid ${isSolved ? "rgba(34,197,94,0.2)" : "#1e1e1e"}`,
                  borderRadius: 6, cursor: "pointer",
                  transition: "border-color 0.12s, background 0.12s",
                }}>
                  {/* Index */}
                  <div style={{
                    width: 28, height: 28, flexShrink: 0,
                    background: isSolved ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isSolved ? "rgba(34,197,94,0.3)" : "#2a2a2a"}`,
                    borderRadius: 4,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                    color: isSolved ? "#22c55e" : "#475569",
                  }}>
                    {isSolved ? "✓" : prob.order_index}
                  </div>

                  {/* Title + mechanic */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, marginBottom: 2 }}>
                      {prob.brainrot_title}
                    </div>
                    <div style={{ fontSize: 10, color: "#374151" }}>
                      {GAME_TYPE_LABEL[prob.game_type] ?? prob.game_type}
                    </div>
                  </div>

                  {/* Difficulty + attempts */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 9, letterSpacing: "0.08em", fontWeight: 700,
                      color: DIFFICULTY_COLOR[prob.difficulty] ?? "#64748b",
                    }}>
                      {prob.difficulty.toUpperCase()}
                    </span>
                    {att && att.attempts > 0 && (
                      <span style={{ fontSize: 9, color: "#374151" }}>
                        {att.attempts} attempt{att.attempts !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pattern insight (shown after first 3 solved) */}
      {solved >= 3 && (
        <div style={{
          padding: "14px 16px",
          background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.15)",
          borderRadius: 6,
        }}>
          <div style={{ fontSize: 10, color: "#d97706", marginBottom: 6, letterSpacing: "0.08em" }}>PATTERN INSIGHT</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
            Every binary search problem has a <span style={{ color: "#eab308" }}>monotone predicate</span> — a
            yes/no question that flips exactly once. Classic: "is arr[mid] == target?" becomes false→true at the
            answer. Insertion point: "arr[mid] &gt;= target?" flips at the boundary. On-answer: "can we solve
            in X?" flips at the minimum viable X. Find the predicate, binary search the range.
          </div>
        </div>
      )}
    </div>
  );
}
