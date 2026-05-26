"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";
import Confetti from "./Confetti";

interface Comparison {
  j: number;
  shouldSwap: boolean;
  explanation: string;
}

function buildComparisons(arr: number[]): Comparison[] {
  const a = [...arr];
  const n = a.length;
  const result: Comparison[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      const x = a[j], y = a[j + 1];
      result.push({
        j,
        shouldSwap: x > y,
        explanation:
          x > y
            ? `${x} > ${y} — bigger number goes right. Swap.`
            : `${x} ≤ ${y} — already in order. Keep.`,
      });
      if (x > y) [a[j], a[j + 1]] = [a[j + 1], a[j]];
    }
  }
  return result;
}

function shuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isSorted(arr: number[]): boolean {
  return arr.every((v, i) => i === 0 || arr[i - 1] <= v);
}

const BAR_GRADIENT: Record<string, string> = {
  default: "linear-gradient(to top, #4f46e5, #8b5cf6)",
  comparing: "linear-gradient(to top, #b45309, #fbbf24)",
  swapping: "linear-gradient(to top, #be123c, #f43f5e)",
  sorted: "linear-gradient(to top, #065f46, #34d399)",
};

type Feedback = "correct" | "wrong" | null;

export default function Section5BossLevel() {
  const { addXP, markComplete, goToSection } = useXP();

  const [initArray] = useState(() => shuffle([10, 25, 40, 55, 70, 85]));
  const [array, setArray] = useState<number[]>([...initArray]);
  const [comparisons] = useState<Comparison[]>(() =>
    buildComparisons([...initArray])
  );
  const [cIdx, setCIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [explanation, setExplanation] = useState("");
  const [done, setDone] = useState(false);
  const [shaking, setShaking] = useState(false);
  const lockRef = useRef(false);

  const maxVal = Math.max(...initArray);
  const current = comparisons[cIdx];

  const getBarState = useCallback(
    (i: number): string => {
      if (!current) return isSorted(array) ? "sorted" : "default";
      if (feedback && (i === current.j || i === current.j + 1))
        return feedback === "correct" ? "swapping" : "default";
      if (i === current.j || i === current.j + 1) return "comparing";
      return "default";
    },
    [current, feedback, array]
  );

  const answer = (userSaysSwap: boolean) => {
    if (lockRef.current || feedback !== null || !current) return;
    lockRef.current = true;

    const isCorrect = userSaysSwap === current.shouldSwap;
    setExplanation(current.explanation);

    if (isCorrect) {
      setFeedback("correct");
      setScore((s) => s + 1);
      addXP(25);
      sound.correct();
      sound.xp();
      if (current.shouldSwap) {
        setArray((prev) => {
          const a = [...prev];
          [a[current.j], a[current.j + 1]] = [a[current.j + 1], a[current.j]];
          return a;
        });
      }
    } else {
      setFeedback("wrong");
      setWrong((w) => w + 1);
      sound.wrong();
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      // Still advance the array correctly regardless
      if (current.shouldSwap) {
        setArray((prev) => {
          const a = [...prev];
          [a[current.j], a[current.j + 1]] = [a[current.j + 1], a[current.j]];
          return a;
        });
      }
    }

    setTimeout(() => {
      setFeedback(null);
      lockRef.current = false;
      const next = cIdx + 1;
      if (next >= comparisons.length) {
        setDone(true);
        markComplete(4);
        addXP(100);
        sound.bigWin();
      } else {
        setCIdx(next);
      }
    }, 1500);
  };

  const totalComparisons = comparisons.length;
  const progress = cIdx / totalComparisons;

  if (done) {
    const accuracy = Math.round((score / totalComparisons) * 100);
    return (
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-28">
        <Confetti />
        <div className="max-w-lg w-full text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#12122a] rounded-3xl p-10 border border-[#1c1c3a]"
          >
            <div className="text-6xl mb-4">
              {accuracy >= 90 ? "💎" : accuracy >= 75 ? "🔥" : accuracy >= 60 ? "⚡" : "💡"}
            </div>
            <h2 className="text-3xl font-black text-white mb-2">
              {accuracy >= 90
                ? "Flawless. You own this."
                : accuracy >= 75
                ? "Solid. The logic is yours."
                : accuracy >= 60
                ? "Getting there. Watch the edge cases."
                : "Keep going. The reps build the reflex."}
            </h2>
            <p className="text-slate-400 text-sm mt-2 mb-6">
              {score}/{totalComparisons} correct — {accuracy}% accuracy
            </p>

            {/* Score card */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { label: "Correct", value: score, color: "text-emerald-400" },
                { label: "Wrong", value: wrong, color: "text-red-400" },
                { label: "Accuracy", value: `${accuracy}%`, color: "text-violet-400" },
              ].map((item) => (
                <div key={item.label} className="bg-[#1c1c3a] rounded-xl p-3">
                  <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                  <p className="text-slate-600 text-xs mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => goToSection(5)}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-violet-900/40"
            >
              See where this is used →
            </button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-28">
      <div className="max-w-3xl w-full">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-black tracking-widest text-red-400 uppercase bg-red-950/60 px-2 py-0.5 rounded">
              05 / 06
            </span>
            <span className="text-[10px] text-slate-600">10 min</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-3 leading-tight">
            Boss level.
          </h2>
          <p className="text-slate-400 text-sm">
            Drive this sort from start to finish. Every comparison. Every swap decision.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-1.5 bg-[#1c1c3a] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-red-500"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-slate-500 text-xs tabular-nums shrink-0">
            {cIdx}/{totalComparisons}
          </span>
        </div>

        {/* Bar chart */}
        <div
          className={`bg-[#12122a] rounded-2xl p-8 mb-5 border border-[#1c1c3a] ${shaking ? "shake" : ""}`}
        >
          <div className="flex items-end justify-center gap-3 h-[200px]">
            {array.map((val, i) => {
              const state = getBarState(i);
              const height = Math.max(12, (val / maxVal) * 180);
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{
                      height,
                      background: BAR_GRADIENT[state],
                      boxShadow:
                        state === "comparing"
                          ? "0 0 18px rgba(251,191,36,0.55)"
                          : state === "sorted"
                          ? "0 0 14px rgba(52,211,153,0.4)"
                          : "none",
                    }}
                    transition={{ duration: 0.28 }}
                    style={{ width: 52, borderRadius: "6px 6px 3px 3px" }}
                  />
                  <span className="text-xs font-bold text-slate-500 tabular-nums">
                    {val}
                  </span>
                </div>
              );
            })}
          </div>

          {current && (
            <div className="mt-5 text-center">
              <p className="text-white text-xl font-black">
                <span className="text-yellow-400">{array[current.j]}</span>
                <span className="text-slate-600 mx-2">vs</span>
                <span className="text-yellow-400">{array[current.j + 1]}</span>
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Position {current.j} and {current.j + 1}
              </p>
            </div>
          )}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
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
        <div className="grid grid-cols-2 gap-4">
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

        {/* Live score */}
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-600">
          <span>
            ✓ <span className="text-emerald-500 font-bold">{score}</span>
          </span>
          <span>
            ✗ <span className="text-red-500 font-bold">{wrong}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
