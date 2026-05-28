"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { BT_PROBLEMS } from "./problems";

interface AttemptRow {
  problem_id: string;
  solved: boolean;
  attempts: number;
}

interface DBProblem {
  id: string;
  order_index: number;
}

export default function BacktrackingHub() {
  const supabase = createClient();
  const [dbProblems, setDbProblems] = useState<DBProblem[]>([]);
  const [attempts, setAttempts] = useState<Map<string, AttemptRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: probs } = await supabase
        .from("problems")
        .select("id, order_index")
        .eq("pattern_slug", "backtracking")
        .order("order_index");

      if (!probs) { setLoading(false); return; }
      setDbProblems(probs);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const ids = probs.map((p: DBProblem) => p.id);
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

  const idByIndex = new Map(dbProblems.map(p => [p.order_index, p.id]));
  const solved = BT_PROBLEMS.filter(p => {
    const id = idByIndex.get(p.index);
    return id ? attempts.get(id)?.solved : false;
  }).length;

  const S: React.CSSProperties = {
    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
  };

  return (
    <div style={{ ...S, display: "flex", flexDirection: "column", gap: 28, padding: "32px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>TIER 1 · PATTERN 2</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.01em" }}>
          Backtracking
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
          8 games. Place, trace, and undo.
        </p>
        {!loading && (
          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: "#475569" }}>8 problems</span>
            <span style={{ fontSize: 11, color: "#22c55e" }}>{solved} solved</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ height: 2, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", background: "#22c55e", borderRadius: 2,
              width: `${(solved / 8) * 100}%`,
              transition: "width 0.4s",
            }} />
          </div>
          <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.06em" }}>
            {solved} / 8 complete
          </div>
        </div>
      )}

      {/* Free tier label */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.1em" }}>FREE · P1–P4</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {BT_PROBLEMS.filter(p => p.index <= 4).map(prob => {
            const dbId = idByIndex.get(prob.index);
            const att = dbId ? attempts.get(dbId) : undefined;
            const isSolved = att?.solved ?? false;
            return (
              <ProblemCard
                key={prob.index}
                prob={prob}
                isSolved={isSolved}
                attempts={att?.attempts ?? 0}
                locked={false}
              />
            );
          })}
        </div>
      </div>

      {/* Paid tier label */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.1em" }}>ADVANCED · P5–P8</div>
          {!isPaid && (
            <div style={{
              fontSize: 8, color: "#eab308", letterSpacing: "0.08em",
              border: "1px solid rgba(234,179,8,0.3)",
              padding: "2px 6px", borderRadius: 3,
            }}>
              LOCKED
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {BT_PROBLEMS.filter(p => p.index > 4).map(prob => {
            const dbId = idByIndex.get(prob.index);
            const att = dbId ? attempts.get(dbId) : undefined;
            const isSolved = att?.solved ?? false;
            return (
              <ProblemCard
                key={prob.index}
                prob={prob}
                isSolved={isSolved}
                attempts={att?.attempts ?? 0}
                locked={!isPaid}
              />
            );
          })}
        </div>

        {!isPaid && (
          <div style={{
            marginTop: 8,
            padding: "14px 16px",
            background: "rgba(234,179,8,0.04)",
            border: "1px solid rgba(234,179,8,0.12)",
            borderRadius: 6,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ fontSize: 11, color: "#d97706", letterSpacing: "0.08em" }}>UNLOCK ADVANCED PROBLEMS</div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
              P5–P8 cover 6-queens, blocked placement, Sudoku, and the full 8-queens search — the hard interview tier.
            </div>
            <button
              onClick={() => setIsPaid(true)}
              style={{
                alignSelf: "flex-start",
                padding: "6px 14px",
                background: "rgba(234,179,8,0.1)",
                border: "1px solid rgba(234,179,8,0.3)",
                borderRadius: 4, cursor: "pointer",
                fontSize: 11, color: "#eab308",
                fontFamily: "inherit", letterSpacing: "0.06em",
              }}
            >
              UPGRADE →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProblemCard({
  prob,
  isSolved,
  attempts,
  locked,
}: {
  prob: (typeof BT_PROBLEMS)[0];
  isSolved: boolean;
  attempts: number;
  locked: boolean;
}) {
  const DIFF_COLOR_MAP: Record<string, string> = {
    Easy: "#22c55e",
    Medium: "#eab308",
    Hard: "#ef4444",
  };

  const card = (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px",
      background: isSolved ? "rgba(34,197,94,0.04)" : locked ? "rgba(255,255,255,0.01)" : "#111",
      border: `1px solid ${isSolved ? "rgba(34,197,94,0.2)" : locked ? "#161616" : "#1e1e1e"}`,
      borderRadius: 6,
      opacity: locked ? 0.5 : 1,
      cursor: locked ? "default" : "pointer",
      transition: "border-color 0.12s, background 0.12s",
    }}>
      <div style={{
        width: 28, height: 28, flexShrink: 0,
        background: isSolved ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${isSolved ? "rgba(34,197,94,0.3)" : "#2a2a2a"}`,
        borderRadius: 4,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700,
        color: isSolved ? "#22c55e" : "#475569",
      }}>
        {isSolved ? "✓" : locked ? "⚿" : prob.index}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, marginBottom: 2 }}>
          {prob.title}
        </div>
        {prob.leetcodeRef && (
          <div style={{ fontSize: 10, color: "#374151" }}>LC #{prob.leetcodeRef}</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
        <span style={{
          fontSize: 9, letterSpacing: "0.08em", fontWeight: 700,
          color: DIFF_COLOR_MAP[prob.difficulty] ?? "#64748b",
        }}>
          {prob.difficulty.toUpperCase()}
        </span>
        {attempts > 0 && !locked && (
          <span style={{ fontSize: 9, color: "#374151" }}>
            {attempts} attempt{attempts !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );

  if (locked) return card;
  return (
    <Link href={`/learn/tier1/backtracking/${prob.index}`} style={{ textDecoration: "none" }}>
      {card}
    </Link>
  );
}
