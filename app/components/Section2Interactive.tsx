"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getComparisonQuestions, ComparisonQuestion } from "@/lib/bubbleSort";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";

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
    for (const q of qs) {
      result.push({ ...q, pattern: pool.pattern, difficulty: pool.difficulty });
    }
  }
  return result;
}

const QUESTIONS = buildQuestions(); // 30 total (10 pools × 3)
const TOTAL_QUESTIONS = QUESTIONS.length;

const DIFFICULTY_COLORS = {
  easy:   { badge: "bg-emerald-950/60 text-emerald-400 border-emerald-700/30", dot: "bg-emerald-400" },
  medium: { badge: "bg-amber-950/60 text-amber-400 border-amber-700/30",       dot: "bg-amber-400" },
  hard:   { badge: "bg-red-950/60 text-red-400 border-red-700/30",             dot: "bg-red-400" },
};

const BAR_BASE: [string, string][] = [
  ["#7c3aed", "#c4b5fd"],
  ["#0e7490", "#67e8f9"],
  ["#b45309", "#fde68a"],
  ["#be123c", "#fda4af"],
  ["#065f46", "#6ee7b7"],
  ["#1d4ed8", "#93c5fd"],
  ["#7c2d12", "#fdba74"],
  ["#4f46e5", "#a78bfa"],
];

function getBarBg(i: number, state: string): string {
  if (state === "comparing") return "linear-gradient(to top,#92400e,#fbbf24)";
  if (state === "correct")   return "linear-gradient(to top,#065f46,#34d399)";
  if (state === "wrong")     return "linear-gradient(to top,#9f1239,#f43f5e)";
  const [from, to] = BAR_BASE[i % BAR_BASE.length];
  return `linear-gradient(to top,${from},${to})`;
}

type Feedback = "correct" | "wrong" | null;

export default function Section2Interactive() {
  const { addXP, markComplete, goToSection } = useXP();
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [explanation, setExplanation] = useState("");
  const [done, setDone] = useState(false);
  const [shaking, setShaking] = useState(false);
  const lockRef = useRef(false);

  const q = QUESTIONS[qIdx];
  const maxVal = Math.max(...q.array);
  const dc = DIFFICULTY_COLORS[q.difficulty];

  const answer = (userSaysSwap: boolean) => {
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
      } else {
        setQIdx((i) => i + 1);
      }
    }, 1400);
  };

  if (done) {
    const pct = Math.round((score / TOTAL_QUESTIONS) * 100);
    return (
      <section className="min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center px-6 py-10">
        <div className="max-w-lg w-full text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#12122a] rounded-3xl p-10 border border-[#1c1c3a]"
          >
            <div className="text-6xl mb-4">
              {pct >= 85 ? "🔥" : pct >= 65 ? "⚡" : "💡"}
            </div>
            <h2 className="text-3xl font-black text-white mb-2">
              {pct >= 85 ? "Instinct locked in." : pct >= 65 ? "Logic is clicking." : "Keep the reps going."}
            </h2>
            <p className="text-slate-400 mb-4 text-sm">
              {score}/{TOTAL_QUESTIONS} correct — {pct}%
            </p>
            <div className="flex items-center justify-center gap-1.5 mb-8 flex-wrap">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${i < score ? "bg-emerald-500" : "bg-[#2a2a4a]"}`}
                />
              ))}
            </div>
            <button
              onClick={() => goToSection(2)}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-violet-900/40"
            >
              Next challenge →
            </button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-3xl w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-black tracking-widest text-cyan-400 uppercase bg-cyan-950/60 px-2.5 py-1 rounded">
              02 / 06
            </span>
            <span className="text-xs text-slate-600">15 min</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-2 leading-tight">
            You decide.
          </h2>
          <p className="text-slate-400 text-sm">
            Two bars highlighted. Should they swap? You tell me. Difficulty increases — watch for patterns.
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 h-1.5 bg-[#1c1c3a] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-violet-600"
              animate={{ width: `${(qIdx / TOTAL_QUESTIONS) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-slate-500 text-xs tabular-nums shrink-0 ml-1">
            {qIdx + 1}/{TOTAL_QUESTIONS}
          </span>
        </div>

        {/* Difficulty + pattern badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={qIdx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 mb-4"
          >
            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${dc.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dc.dot}`} />
              {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
            </span>
            {q.pattern && (
              <span className="text-xs text-slate-500 font-semibold px-2.5 py-1 bg-[#1c1c3a] rounded-lg border border-[#2a2a4a]">
                {q.pattern}
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bar chart */}
        <div
          className={`bg-[#12122a] rounded-2xl p-8 mb-5 border border-[#1c1c3a] ${shaking ? "shake" : ""}`}
        >
          <div className="flex items-end justify-center gap-3" style={{ height: 200 }}>
            {q.array.map((val, i) => {
              const isComparing = i === q.j || i === q.j + 1;
              let state = "default";
              if (feedback && isComparing) state = feedback === "correct" ? "correct" : "wrong";
              else if (isComparing) state = "comparing";
              const height = Math.max(12, (val / maxVal) * 178);

              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{
                      height,
                      background: getBarBg(i, state),
                      boxShadow:
                        isComparing && !feedback
                          ? "0 0 18px rgba(251,191,36,0.55)"
                          : feedback && isComparing
                          ? feedback === "correct"
                            ? "0 0 18px rgba(52,211,153,0.55)"
                            : "0 0 18px rgba(244,63,94,0.6)"
                          : "none",
                    }}
                    transition={{ duration: 0.22 }}
                    style={{ width: 40, borderRadius: "6px 6px 3px 3px" }}
                  />
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      isComparing ? "text-yellow-400" : "text-slate-600"
                    }`}
                  >
                    {val}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 text-center">
            <p className="text-white text-xl font-black">
              <span className="text-yellow-400">{q.array[q.j]}</span>
              <span className="text-slate-500 mx-3 text-base font-normal">vs</span>
              <span className="text-yellow-400">{q.array[q.j + 1]}</span>
            </p>
            <p className="text-slate-500 text-sm mt-1">Should these two swap?</p>
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl px-5 py-3 mb-4 text-sm font-medium border ${
                feedback === "correct"
                  ? "bg-emerald-950/50 border-emerald-700/40 text-emerald-400"
                  : "bg-red-950/50 border-red-700/40 text-red-400"
              }`}
            >
              {feedback === "correct" ? "✓ " : "✗ "}
              {explanation}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => answer(true)}
            disabled={feedback !== null}
            className="py-4 bg-[#1c1c3a] hover:bg-[#252550] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white font-black text-lg rounded-2xl transition-all border border-[#2a2a4a] hover:border-violet-700"
          >
            ↕ Swap
          </button>
          <button
            onClick={() => answer(false)}
            disabled={feedback !== null}
            className="py-4 bg-[#1c1c3a] hover:bg-[#252550] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white font-black text-lg rounded-2xl transition-all border border-[#2a2a4a] hover:border-cyan-700"
          >
            → Keep
          </button>
        </div>

        <div className="text-center">
          <span className="text-slate-600 text-xs">
            Score: <span className="text-emerald-400 font-bold">{score}</span> / {qIdx}
          </span>
        </div>
      </div>
    </section>
  );
}
