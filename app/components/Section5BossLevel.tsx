"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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

const BAR_BASE: [string, string][] = [
  ["#7c3aed", "#c4b5fd"],
  ["#0e7490", "#67e8f9"],
  ["#b45309", "#fde68a"],
  ["#be123c", "#fda4af"],
  ["#065f46", "#6ee7b7"],
  ["#1d4ed8", "#93c5fd"],
];

function getBarBg(i: number, state: string): string {
  if (state === "comparing") return "linear-gradient(to top,#92400e,#fbbf24)";
  if (state === "swapping") return "linear-gradient(to top,#9f1239,#f43f5e)";
  if (state === "sorted") return "linear-gradient(to top,#065f46,#34d399)";
  const [from, to] = BAR_BASE[i % BAR_BASE.length];
  return `linear-gradient(to top,${from},${to})`;
}

type Feedback = "correct" | "wrong" | null;

export default function Section5BossLevel() {
  const { addXP, markComplete, goToSection, streak, totalSessionXP, setSessionAccuracy } = useXP();

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
  const [showCard, setShowCard] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const lockRef = useRef(false);
  const doneTimeRef = useRef<number>(0);

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
        doneTimeRef.current = Date.now();
        // 3s silence then dramatic chord
        setTimeout(() => {
          sound.chord();
          setTimeout(() => setShowCard(true), 400);
        }, 3000);
      } else {
        setCIdx(next);
      }
    }, 1500);
  };

  const totalComparisons = comparisons.length;
  const progress = cIdx / totalComparisons;

  // Store accuracy when done
  useEffect(() => {
    if (done) {
      const acc = Math.round((score / totalComparisons) * 100);
      setSessionAccuracy(acc);
    }
  }, [done, score, totalComparisons, setSessionAccuracy]);

  if (done) {
    const accuracy = Math.round((score / totalComparisons) * 100);
    const shareText = `I just beat Bubble Sort on Brainrot\n\n⚡ ${totalSessionXP} XP earned\n🎯 ${accuracy}% accuracy\n🔥 ${streak} day streak\n\nRot smarter → brainrot.dev`;

    const handleShare = async () => {
      try {
        if (navigator.share) {
          await navigator.share({ text: shareText });
        } else {
          await navigator.clipboard.writeText(shareText);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch {}
    };

    return (
      <section className="min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center px-6 py-10">
        <Confetti />
        <div className="max-w-lg w-full">
          {/* Win message — shows immediately */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <div className="text-6xl mb-3">
              {accuracy >= 90 ? "💎" : accuracy >= 75 ? "🔥" : accuracy >= 60 ? "⚡" : "💡"}
            </div>
            <h2 className="text-3xl font-black text-white">
              {accuracy >= 90
                ? "Flawless. You own this."
                : accuracy >= 75
                ? "Solid. The logic is yours."
                : accuracy >= 60
                ? "Getting there. Watch the edge cases."
                : "Keep going. The reps build the reflex."}
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              {score}/{totalComparisons} correct — {accuracy}% accuracy
            </p>
          </motion.div>

          {/* Shareable result card — appears after chord */}
          <AnimatePresence>
            {showCard && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6"
              >
                {/* Card */}
                <div className="bg-gradient-to-br from-[#0d0d1a] to-[#12122a] rounded-2xl p-6 border border-violet-700/30 shadow-2xl shadow-violet-900/30">
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-black text-lg">
                      <span className="text-violet-400">brain</span>
                      <span className="text-cyan-400">rot</span>
                    </span>
                    <span className="text-slate-600 text-xs font-medium tracking-widest uppercase">
                      Bubble Sort
                    </span>
                  </div>

                  <p className="text-white font-black text-base mb-5 leading-snug">
                    I just beat Bubble Sort on Brainrot
                  </p>

                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { icon: "⚡", val: `${totalSessionXP} XP`, label: "earned" },
                      { icon: "🎯", val: `${accuracy}%`, label: "accuracy" },
                      { icon: "🔥", val: `${streak}`, label: "day streak" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="bg-[#1c1c3a]/60 rounded-xl p-3 text-center"
                      >
                        <p className="text-sm mb-0.5">{s.icon}</p>
                        <p className="text-white font-black text-base tabular-nums">
                          {s.val}
                        </p>
                        <p className="text-slate-600 text-[10px]">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-slate-600 text-xs text-center">
                    Rot smarter.
                  </p>
                </div>

                {/* Share + Next */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleShare}
                    className="flex-1 py-3 bg-[#1c1c3a] hover:bg-[#252550] border border-[#2a2a4a] hover:border-violet-700/60 text-white font-bold rounded-xl transition-all text-sm"
                  >
                    {copied ? "✓ Copied" : "Share result →"}
                  </button>
                  <button
                    onClick={() => goToSection(5)}
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-violet-900/40 text-sm"
                  >
                    Finish →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showCard && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="text-center text-slate-600 text-sm"
            >
              ...
            </motion.p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center px-6 py-10">
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
                      background: getBarBg(i, state),
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
