"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getComparisonQuestions } from "@/lib/bubbleSort";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";

const SOURCE_ARRAY = [5, 3, 8, 1, 6, 4, 7, 2];
const TOTAL_QUESTIONS = 10;

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
  if (state === "correct") return "linear-gradient(to top,#065f46,#34d399)";
  if (state === "wrong") return "linear-gradient(to top,#9f1239,#f43f5e)";
  const [from, to] = BAR_BASE[i % BAR_BASE.length];
  return `linear-gradient(to top,${from},${to})`;
}

type Feedback = "correct" | "wrong" | null;

export default function Section2Interactive() {
  const { addXP, markComplete, goToSection } = useXP();
  const [questions] = useState(() =>
    getComparisonQuestions(SOURCE_ARRAY).slice(0, TOTAL_QUESTIONS)
  );
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [explanation, setExplanation] = useState("");
  const [done, setDone] = useState(false);
  const [shaking, setShaking] = useState(false);
  const lockRef = useRef(false);

  const q = questions[qIdx];
  const maxVal = Math.max(...SOURCE_ARRAY);

  const answer = (userSaysSwap: boolean) => {
    if (lockRef.current || feedback !== null) return;
    lockRef.current = true;

    const correct = userSaysSwap === q.shouldSwap;
    setExplanation(q.explanation);

    if (correct) {
      setFeedback("correct");
      setScore((s) => s + 1);
      sound.correct();
      addXP(20);
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
        addXP(30);
        sound.win();
      } else {
        setQIdx((i) => i + 1);
      }
    }, 1400);
  };

  if (done) {
    return (
      <section className="min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center px-6 py-10">
        <div className="max-w-lg w-full text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#12122a] rounded-3xl p-10 border border-[#1c1c3a]"
          >
            <div className="text-6xl mb-4">
              {score >= 8 ? "🔥" : score >= 6 ? "⚡" : "💡"}
            </div>
            <h2 className="text-3xl font-black text-white mb-2">
              {score >= 8
                ? "Sharp eye."
                : score >= 6
                ? "Decent."
                : "You saw some of it."}
            </h2>
            <p className="text-slate-400 mb-6 text-sm">
              {score}/{TOTAL_QUESTIONS} correct — {score >= 8 ? "You've got the logic down. Now let's see if you can sort under pressure." : "The logic is clicking. Time to use it for real."}
            </p>
            <div className="flex items-center justify-center gap-3 mb-8">
              {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < score ? "bg-emerald-500" : "bg-[#2a2a4a]"
                  }`}
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
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase bg-cyan-950/60 px-2 py-0.5 rounded">
              02 / 06
            </span>
            <span className="text-[10px] text-slate-600">15 min</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-3 leading-tight">
            You decide.
          </h2>
          <p className="text-slate-400 text-sm">
            Two bars are highlighted. Should they swap? You tell me.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < qIdx
                  ? "bg-emerald-500"
                  : i === qIdx
                  ? "bg-violet-500"
                  : "bg-[#1c1c3a]"
              }`}
            />
          ))}
          <span className="text-slate-500 text-xs tabular-nums shrink-0 ml-1">
            {qIdx + 1}/{TOTAL_QUESTIONS}
          </span>
        </div>

        {/* Bar chart */}
        <div
          className={`bg-[#12122a] rounded-2xl p-8 mb-6 border border-[#1c1c3a] ${shaking ? "shake" : ""}`}
        >
          <div className="flex items-end justify-center gap-3 h-[200px]">
            {q.array.map((val, i) => {
              const isComparing = i === q.j || i === q.j + 1;
              let state = "default";
              if (feedback && isComparing) state = feedback === "correct" ? "correct" : "wrong";
              else if (isComparing) state = "comparing";
              const height = Math.max(12, (val / maxVal) * 180);

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
                    style={{ width: 44, borderRadius: "6px 6px 3px 3px" }}
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

          <div className="mt-4 text-center">
            <p className="text-white text-lg font-black">
              {q.array[q.j]}{" "}
              <span className="text-slate-500">and</span>{" "}
              {q.array[q.j + 1]}
            </p>
            <p className="text-slate-400 text-sm mt-1">Should these two swap?</p>
          </div>
        </div>

        {/* Feedback overlay */}
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

        {/* Score */}
        <div className="mt-4 text-center">
          <span className="text-slate-600 text-xs">
            Score:{" "}
            <span className="text-emerald-400 font-bold">{score}</span> /{" "}
            {qIdx}
          </span>
        </div>
      </div>
    </section>
  );
}
