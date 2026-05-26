"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";
import { Corners, fireBurst } from "@/components/Effects";
import { fireToast } from "@/components/Extras";
import { ArrowRight, Check } from "@/components/Glyphs";
import { useProgress } from "@/lib/useProgress";
import { ProgressBadge } from "@/components/ProgressBadge";

interface Step {
  array: number[];
  j: number;
  didSwap: boolean;
  isWrong: boolean;
  label: string;
}

interface Round {
  steps: Step[];
  bugIndex: number;
}

function generateRound(arr: number[]): Round {
  const steps: Step[] = [];
  const a = [...arr];
  const n = a.length;
  for (let j = 0; j < n - 1; j++) {
    const x = a[j], y = a[j + 1];
    const shouldSwap = x > y;
    steps.push({ array: [...a], j, didSwap: shouldSwap, isWrong: false, label: shouldSwap ? `${x} > ${y} → Swap` : `${x} ≤ ${y} → No swap` });
    if (shouldSwap) [a[j], a[j + 1]] = [a[j + 1], a[j]];
  }
  const bugIdx = Math.floor(Math.random() * steps.length);
  const bugStep = steps[bugIdx];
  const x = bugStep.array[bugStep.j], y = bugStep.array[bugStep.j + 1];
  const wrongSwap = !bugStep.didSwap;
  steps[bugIdx] = { ...bugStep, didSwap: wrongSwap, isWrong: true, label: wrongSwap ? `${x} ≤ ${y} → Swap ???` : `${x} > ${y} → No swap ???` };
  return { steps, bugIndex: bugIdx };
}

interface RoundConfig { array: number[]; pattern: string | null; difficulty: "easy" | "medium" | "hard"; hint: string; }

const ROUND_CONFIGS: RoundConfig[] = [
  { array: [3, 1, 2],         pattern: null,              difficulty: "easy",   hint: "3 steps — easy to scan" },
  { array: [4, 2, 1, 3],      pattern: null,              difficulty: "easy",   hint: "4 elements, one wrong" },
  { array: [2, 4, 1, 3],      pattern: null,              difficulty: "easy",   hint: "Mixed order" },
  { array: [3, 1, 4, 2, 5],   pattern: null,              difficulty: "medium", hint: "5 elements, more steps to check" },
  { array: [6, 2, 5, 1, 4],   pattern: null,              difficulty: "medium", hint: "Watch for adjacent equal traps" },
  { array: [2, 5, 1, 3, 4],   pattern: null,              difficulty: "medium", hint: "Partially sorted" },
  { array: [4, 4, 2, 1, 3],   pattern: "Duplicates",      difficulty: "medium", hint: "Equal elements never swap" },
  { array: [2, 2, 3, 1, 2],   pattern: "Duplicates",      difficulty: "medium", hint: "Many duplicates — ≤ not <" },
  { array: [1, 3, 2, 4, 5],   pattern: "Nearly Sorted",   difficulty: "medium", hint: "Mostly in order already" },
  { array: [4, 2, 7, 1, 5, 3],pattern: null,              difficulty: "hard",   hint: "6 steps per pass" },
  { array: [6, 5, 4, 3, 2, 1],pattern: "Reverse Order",   difficulty: "hard",   hint: "Every compare should swap" },
  { array: [1, 2, 3, 5, 4, 6],pattern: "Nearly Sorted",   difficulty: "hard",   hint: "Only one real swap needed" },
  { array: [5, 5, 3, 1, 4, 2],pattern: "Duplicates",      difficulty: "hard",   hint: "Duplicates + big range" },
  { array: [7, 3, 9, 2, 8, 4],pattern: null,              difficulty: "hard",   hint: "Large values, random order" },
  { array: [8, 6, 4, 2, 9, 1],pattern: "Reverse-ish",     difficulty: "hard",   hint: "Almost reverse sorted" },
];

const TOTAL_ROUNDS = ROUND_CONFIGS.length;

const DIFF_STYLE = {
  easy:   { color: "#6ee7b7", bg: "rgba(110,231,183,0.08)", border: "rgba(110,231,183,0.25)" },
  medium: { color: "#f6c453", bg: "rgba(246,196,83,0.08)",  border: "rgba(246,196,83,0.25)"  },
  hard:   { color: "#fb7185", bg: "rgba(251,113,133,0.08)", border: "rgba(251,113,133,0.25)" },
};

export default function Section4SpotTheBug() {
  const { addXP, markComplete, goToSection } = useXP();
  const { progress, upsert } = useProgress("bubble-sort-s4", TOTAL_ROUNDS);
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<Round>(() => generateRound(ROUND_CONFIGS[0].array));
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [roundDone, setRoundDone] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const config = ROUND_CONFIGS[roundIdx];
  const maxVal = Math.max(...config.array);
  const diffStyle = DIFF_STYLE[config.difficulty];

  const pick = useCallback((idx: number, e?: React.MouseEvent) => {
    if (selected !== null) return;
    setSelected(idx);
    const isRight = round.steps[idx].isWrong;
    setCorrect(isRight);
    if (isRight) { setScore((s) => s + 1); sound.correct(); addXP(30); fireBurst(e ?? null, 30, "+30 XP"); }
    else { sound.wrong(); }
    setRoundDone(true);
  }, [selected, round, addXP]);

  const nextRound = () => {
    const next = roundIdx + 1;
    if (next >= TOTAL_ROUNDS) {
      setAllDone(true); markComplete(3); addXP(60); sound.win();
      upsert(TOTAL_ROUNDS);
      fireToast("achievement", "Stage 4 complete", "Spot the Bug — all rounds done");
      return;
    }
    upsert(next);
    setRoundIdx(next);
    setRound(generateRound(ROUND_CONFIGS[next].array));
    setSelected(null); setCorrect(null); setRoundDone(false);
  };

  if (allDone) {
    const pct = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ maxWidth: 520, margin: "80px auto 0", textAlign: "center" }}>
          <div style={{ position: "relative" }}>
            <Corners color="rgba(167,139,250,0.4)" size={12} thickness={1.2} />
            <div style={{ background: "rgba(12,12,20,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "40px 32px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "rgba(110,231,183,0.7)", marginBottom: 16 }}>STAGE CLEARED · +60 XP</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 42, color: "#ebe9e3", marginBottom: 8, lineHeight: 1 }}>
                {pct >= 80 ? "Sharp eye." : pct >= 60 ? "Pretty good." : "Missed a few."}
              </h2>
              <p style={{ fontSize: 14, color: "rgba(235,233,227,0.45)", marginBottom: 24 }}>
                {score}/{TOTAL_ROUNDS} bugs found — {pct}%
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 4, flexWrap: "wrap", marginBottom: 32 }}>
                {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < score ? "#6ee7b7" : "rgba(255,255,255,0.08)" }} />
                ))}
              </div>
              <button onClick={() => goToSection(4)} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                Final boss <ArrowRight size={14} color="#fff4d6" />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px", position: "relative" }}>
      <ProgressBadge completed={progress.completedSteps} total={TOTAL_ROUNDS} />
      {/* Section header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", color: "#f6c453", padding: "4px 10px", background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4 }}>STAGE 04 / 06</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>ESTIMATED 15 MIN</span>
          <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>REWARD · +90 XP</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1, letterSpacing: "-0.025em", color: "#ebe9e3", marginBottom: 10 }}>
          Spot the bug.
        </h1>
        <p style={{ fontSize: 15, color: "rgba(235,233,227,0.5)", maxWidth: 580, lineHeight: 1.55 }}>
          One step is wrong. One swap decision is off. Find it. Difficulty increases — patterns get sneakier.
        </p>
      </div>

      {/* Round progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 20 }}>
        {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2, transition: "all 0.3s",
            background: i < roundIdx ? "#6ee7b7" : i === roundIdx ? "#fb7185" : "rgba(255,255,255,0.06)",
          }} />
        ))}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", marginLeft: 8 }}>
          {roundIdx + 1}/{TOTAL_ROUNDS}
        </span>
      </div>

      {/* Difficulty + pattern */}
      <AnimatePresence mode="wait">
        <motion.div key={roundIdx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.15em", padding: "3px 8px", borderRadius: 3, color: diffStyle.color, background: diffStyle.bg, border: `1px solid ${diffStyle.border}` }}>
            {config.difficulty.toUpperCase()}
          </span>
          {config.pattern && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, padding: "3px 8px", borderRadius: 3, color: "rgba(235,233,227,0.45)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {config.pattern}
            </span>
          )}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(235,233,227,0.25)", letterSpacing: "0.1em" }}>{config.hint}</span>
        </motion.div>
      </AnimatePresence>

      {/* Steps grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {round.steps.map((step, i) => {
          const revealed = selected !== null;
          const isSelected = selected === i;
          const isBug = step.isWrong;
          const x = step.array[step.j], y = step.array[step.j + 1];
          const barH1 = Math.max(8, (x / maxVal) * 56);
          const barH2 = Math.max(8, (y / maxVal) * 56);

          let bg = "rgba(12,12,20,0.5)";
          let border = "rgba(255,255,255,0.07)";
          if (revealed) {
            if (isBug)           { bg = "rgba(251,113,133,0.08)"; border = "rgba(251,113,133,0.35)"; }
            else if (isSelected) { bg = "rgba(251,113,133,0.04)"; border = "rgba(251,113,133,0.15)"; }
          }

          return (
            <motion.button
              key={i}
              onClick={(e) => !revealed && pick(i, e)}
              disabled={revealed}
              whileHover={!revealed ? { scale: 1.005 } : {}}
              whileTap={!revealed ? { scale: 0.995 } : {}}
              style={{
                width: "100%", textAlign: "left",
                padding: "14px 18px", borderRadius: 10,
                background: bg, border: `1px solid ${border}`,
                cursor: !revealed ? "pointer" : "default",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!revealed) e.currentTarget.style.borderColor = "rgba(251,113,133,0.4)"; }}
              onMouseLeave={(e) => { if (!revealed) e.currentTarget.style.borderColor = border; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(235,233,227,0.3)", width: 24 }}>S{i + 1}</span>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                  <div style={{
                    width: 14, height: barH1,
                    background: "linear-gradient(to top,#5b21b6,#c4b5fd)",
                    borderRadius: "3px 3px 1px 1px",
                  }} />
                  <div style={{
                    width: 14, height: barH2,
                    background: "linear-gradient(to top,#92400e,#fde68a)",
                    borderRadius: "3px 3px 1px 1px",
                  }} />
                </div>
                <span style={{ fontSize: 13, color: revealed && isBug ? "#fb7185" : "#ebe9e3", flex: 1, fontWeight: 500 }}>
                  {step.label}
                </span>
                {revealed && isBug && (
                  <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                    style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#fb7185", letterSpacing: "0.15em", fontWeight: 700 }}>
                    ← BUG
                  </motion.span>
                )}
                {revealed && !isBug && isSelected && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(235,233,227,0.3)" }}>wrong pick</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {roundDone && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "16px 18px", borderRadius: 10, marginBottom: 14,
              background: correct ? "rgba(110,231,183,0.07)" : "rgba(251,113,133,0.07)",
              border: `1px solid ${correct ? "rgba(110,231,183,0.3)" : "rgba(251,113,133,0.3)"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: correct ? "#6ee7b7" : "#fb7185", marginBottom: 2 }}>
                {correct ? "Found it. " : "Nope. "}
                <span style={{ fontWeight: 400, color: "rgba(235,233,227,0.5)" }}>
                  {correct ? `Step S${round.bugIndex + 1} had a wrong swap decision.` : `Bug was at Step S${round.bugIndex + 1}.`}
                </span>
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)" }}>
                Score: {score}/{roundIdx + 1}
              </p>
            </div>
            <button onClick={nextRound} className="btn-violet" style={{ padding: "8px 18px", marginLeft: 16, flexShrink: 0 }}>
              {roundIdx + 1 < TOTAL_ROUNDS ? "Next →" : "Results →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!roundDone && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textAlign: "center", color: "rgba(235,233,227,0.25)", letterSpacing: "0.2em" }}>
          CLICK THE STEP WITH THE WRONG SWAP DECISION
        </p>
      )}
    </section>
  );
}
