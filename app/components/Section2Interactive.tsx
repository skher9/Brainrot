"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getComparisonQuestions, ComparisonQuestion } from "@/lib/bubbleSort";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";
import { Corners, fireBurst } from "@/components/Effects";
import { fireToast } from "@/components/Extras";
import { Check, ArrowRight } from "@/components/Glyphs";
import { useProgress } from "@/lib/useProgress";
import { ProgressBadge } from "@/components/ProgressBadge";

interface TaggedQuestion extends ComparisonQuestion {
  pattern: string | null;
  difficulty: "easy" | "medium" | "hard";
}

const QUESTION_POOLS: Array<{
  array: number[];
  pattern: string | null;
  difficulty: "easy" | "medium" | "hard";
  take: number;
}> = [
  { array: [3, 1, 2],            pattern: null,              difficulty: "easy",   take: 3 },
  { array: [4, 2, 6, 1, 3],      pattern: null,              difficulty: "easy",   take: 3 },
  { array: [5, 3, 8, 1, 6, 4],   pattern: null,              difficulty: "medium", take: 3 },
  { array: [3, 3, 1, 2, 4, 3],   pattern: "Duplicates",      difficulty: "medium", take: 3 },
  { array: [1, 2, 4, 3, 6, 5],   pattern: "Nearly Sorted",   difficulty: "medium", take: 3 },
  { array: [6, 8, 2, 9, 4, 1, 7],pattern: null,              difficulty: "hard",   take: 3 },
  { array: [7, 5, 8, 4, 6, 3, 2],pattern: "Reverse-ish",     difficulty: "hard",   take: 3 },
  { array: [9, 7, 5, 3, 1, 2, 4],pattern: "Reverse Order",   difficulty: "hard",   take: 3 },
  { array: [4, 4, 4, 1, 2, 3],   pattern: "All Duplicates",  difficulty: "hard",   take: 3 },
  { array: [10, 9, 8, 7, 6, 5],  pattern: "Worst Case",      difficulty: "hard",   take: 3 },
];

function buildQuestions(): TaggedQuestion[] {
  const result: TaggedQuestion[] = [];
  for (const pool of QUESTION_POOLS) {
    const qs = getComparisonQuestions(pool.array).slice(0, pool.take);
    for (const q of qs) result.push({ ...q, pattern: pool.pattern, difficulty: pool.difficulty });
  }
  return result;
}

const QUESTIONS = buildQuestions();
const TOTAL_QUESTIONS = QUESTIONS.length;

const VIS_PALETTE = [
  { top: "#c4b5fd", bot: "#5b21b6", g: "rgba(167,139,250,0.4)" },
  { top: "#a5f3fc", bot: "#0e7490", g: "rgba(103,232,249,0.35)" },
  { top: "#fde68a", bot: "#92400e", g: "rgba(246,196,83,0.4)" },
  { top: "#fda4af", bot: "#9f1239", g: "rgba(251,113,133,0.35)" },
  { top: "#6ee7b7", bot: "#065f46", g: "rgba(110,231,183,0.35)" },
  { top: "#93c5fd", bot: "#1d4ed8", g: "rgba(147,197,253,0.3)" },
  { top: "#fed7aa", bot: "#7c2d12", g: "rgba(254,215,170,0.3)" },
  { top: "#c4b5fd", bot: "#5b21b6", g: "rgba(167,139,250,0.4)" },
];

type Feedback = "correct" | "wrong" | null;

const DIFF_STYLE = {
  easy:   { color: "#6ee7b7", bg: "rgba(110,231,183,0.08)", border: "rgba(110,231,183,0.25)" },
  medium: { color: "#f6c453", bg: "rgba(246,196,83,0.08)",  border: "rgba(246,196,83,0.25)"  },
  hard:   { color: "#fb7185", bg: "rgba(251,113,133,0.08)", border: "rgba(251,113,133,0.25)" },
};

export default function Section2Interactive() {
  const { addXP, markComplete, goToSection } = useXP();
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [explanation, setExplanation] = useState("");
  const [done, setDone] = useState(false);
  const [shaking, setShaking] = useState(false);
  const lockRef = useRef(false);
  const { progress, upsert } = useProgress("bubble-sort-s2", TOTAL_QUESTIONS);

  const q = QUESTIONS[qIdx];
  const maxVal = Math.max(...q.array);
  const diffStyle = DIFF_STYLE[q.difficulty];

  const answer = (userSaysSwap: boolean, e?: React.MouseEvent) => {
    if (lockRef.current || feedback !== null) return;
    lockRef.current = true;
    const correct = userSaysSwap === q.shouldSwap;
    setExplanation(q.explanation);
    if (correct) {
      setFeedback("correct");
      setScore((s) => s + 1);
      sound.correct();
      addXP(10);
      sound.xp();
      fireBurst(e ?? null, 10, "+10 XP");
    } else {
      setFeedback("wrong");
      sound.wrong();
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    }
    setTimeout(() => {
      setFeedback(null);
      lockRef.current = false;
      if (qIdx + 1 >= TOTAL_QUESTIONS) {
        setDone(true);
        markComplete(1);
        addXP(50);
        sound.win();
        upsert(TOTAL_QUESTIONS);
        fireToast("achievement", "Stage 2 complete", "You Decide — 30 questions done");
      } else {
        upsert(qIdx + 1);
        setQIdx((i) => i + 1);
      }
    }, 1400);
  };

  if (done) {
    const pct = Math.round((score / TOTAL_QUESTIONS) * 100);
    return (
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ maxWidth: 520, margin: "80px auto 0", textAlign: "center" }}>
          <div style={{ position: "relative" }}>
            <Corners color="rgba(167,139,250,0.4)" size={12} thickness={1.2} />
            <div style={{
              background: "rgba(12,12,20,0.8)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 18, padding: "40px 32px",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "rgba(110,231,183,0.7)", marginBottom: 16 }}>
                STAGE CLEARED · +50 XP
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 42, color: "#ebe9e3", marginBottom: 8, lineHeight: 1 }}>
                {pct >= 85 ? "Instinct locked in." : pct >= 65 ? "Logic is clicking." : "Keep the reps going."}
              </h2>
              <p style={{ fontSize: 14, color: "rgba(235,233,227,0.45)", marginBottom: 24 }}>
                {score}/{TOTAL_QUESTIONS} correct — {pct}%
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 4, flexWrap: "wrap", marginBottom: 32 }}>
                {QUESTIONS.map((_, i) => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: i < score ? "#6ee7b7" : "rgba(255,255,255,0.08)",
                  }} />
                ))}
              </div>
              <button
                onClick={() => goToSection(2)}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Next challenge
                <ArrowRight size={14} color="#fff4d6" />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px", position: "relative" }}>
      <ProgressBadge completed={progress.completedSteps} total={TOTAL_QUESTIONS} />
      {/* Section header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10, letterSpacing: "0.22em", color: "#f6c453",
            padding: "4px 10px",
            background: "rgba(246,196,83,0.08)",
            border: "1px solid rgba(246,196,83,0.25)",
            borderRadius: 4,
          }}>STAGE 02 / 06</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>ESTIMATED 15 MIN</span>
          <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>REWARD · +60 XP</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1, letterSpacing: "-0.025em", color: "#ebe9e3", marginBottom: 10 }}>
          You decide.
        </h1>
        <p style={{ fontSize: 15, color: "rgba(235,233,227,0.5)", maxWidth: 580, lineHeight: 1.55 }}>
          Two bars highlighted. Should they swap? You tell me. Difficulty increases — watch for patterns.
        </p>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${(qIdx / TOTAL_QUESTIONS) * 100}%` }}
            transition={{ duration: 0.3 }}
            style={{ height: "100%", background: "linear-gradient(90deg,#a78bfa,#f6c453)" }}
          />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.1em" }}>
          {qIdx + 1}/{TOTAL_QUESTIONS}
        </span>
      </div>

      {/* Difficulty + pattern badge */}
      <AnimatePresence mode="wait">
        <motion.div key={qIdx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.15em",
            padding: "3px 8px", borderRadius: 3,
            color: diffStyle.color, background: diffStyle.bg, border: `1px solid ${diffStyle.border}`,
          }}>
            {q.difficulty.toUpperCase()}
          </span>
          {q.pattern && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em",
              padding: "3px 8px", borderRadius: 3,
              color: "rgba(235,233,227,0.45)",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            }}>{q.pattern}</span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bar chart */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Corners color="rgba(167,139,250,0.4)" size={12} thickness={1.2} />
        <div
          className={shaking ? "shake" : ""}
          style={{
            background: "rgba(12,12,20,0.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14, padding: "28px 24px",
            position: "relative", overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 14, height: 200 }}>
            {q.array.map((val, i) => {
              const isComparing = i === q.j || i === q.j + 1;
              const palette = VIS_PALETTE[i % VIS_PALETTE.length];
              const height = Math.max(16, (val / maxVal) * 178);

              let top = palette.top, bot = palette.bot, g = palette.g, glow = 10;
              if (feedback && isComparing) {
                if (feedback === "correct") { top = "#6ee7b7"; bot = "#065f46"; g = "rgba(110,231,183,0.55)"; glow = 22; }
                else { top = "#fda4af"; bot = "#9f1239"; g = "rgba(251,113,133,0.65)"; glow = 22; }
              } else if (isComparing) { top = "#fde68a"; bot = "#92400e"; g = "rgba(246,196,83,0.7)"; glow = 24; }

              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div
                    className="bar-base"
                    style={{
                      width: 48, height,
                      ["--bc-top" as string]: top,
                      ["--bc-bot" as string]: bot,
                      ["--bar-glow" as string]: glow + "px",
                      ["--bar-glow-c" as string]: g,
                      transition: "height 0.3s cubic-bezier(.16,1,.3,1), background 0.2s, box-shadow 0.2s",
                    }}
                  />
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 10,
                    color: isComparing ? "#f6c453" : "rgba(235,233,227,0.3)",
                    transition: "color 0.2s",
                  }}>{val}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "#ebe9e3" }}>
              <span style={{ color: "#f6c453" }}>{q.array[q.j]}</span>
              <span style={{ color: "rgba(235,233,227,0.25)", margin: "0 16px", fontSize: 16 }}>vs</span>
              <span style={{ color: "#f6c453" }}>{q.array[q.j + 1]}</span>
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em", marginTop: 6 }}>
              SHOULD THESE TWO SWAP?
            </p>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              padding: "12px 18px", borderRadius: 10, marginBottom: 14, fontSize: 13,
              background: feedback === "correct" ? "rgba(110,231,183,0.07)" : "rgba(251,113,133,0.07)",
              border: `1px solid ${feedback === "correct" ? "rgba(110,231,183,0.3)" : "rgba(251,113,133,0.3)"}`,
              color: feedback === "correct" ? "#6ee7b7" : "#fb7185",
            }}
          >
            {feedback === "correct" ? "✓ " : "✗ "}{explanation}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <button
          onClick={(e) => answer(true, e)}
          disabled={feedback !== null}
          className="btn-violet"
          style={{ padding: "16px", fontSize: 15, justifyContent: "center", opacity: feedback !== null ? 0.4 : 1 }}
        >
          ↕ Swap
        </button>
        <button
          onClick={(e) => answer(false, e)}
          disabled={feedback !== null}
          className="btn-ghost"
          style={{ padding: "16px", fontSize: 15, justifyContent: "center", opacity: feedback !== null ? 0.4 : 1 }}
        >
          → Keep
        </button>
      </div>

      <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.25)", letterSpacing: "0.12em" }}>
        SCORE <span style={{ color: "#6ee7b7" }}>{score}</span> / {qIdx}
      </div>
    </section>
  );
}
