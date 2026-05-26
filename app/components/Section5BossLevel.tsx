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

interface RoundConfig {
  label: string;
  pattern: string;
  patternDesc: string;
  buildArray: () => number[];
}

const ROUND_CONFIGS: RoundConfig[] = [
  {
    label: "Round 1",
    pattern: "Random",
    patternDesc: "Random 4-element array. Get your bearings.",
    buildArray: () => shuffle([10, 25, 40, 55]),
  },
  {
    label: "Round 2",
    pattern: "Nearly Sorted",
    patternDesc: "Almost in order — just 1-2 elements out of place. Watch your ≤ edge cases.",
    buildArray: () => {
      // [10, 25, 40, 55, 70] nearly sorted — swap positions 1 and 2
      return [10, 40, 25, 55, 70];
    },
  },
  {
    label: "Round 3",
    pattern: "Worst Case",
    patternDesc: "Fully reversed. Every single comparison needs a swap. This is O(n²) in action.",
    buildArray: () => [70, 55, 40, 30, 20, 10],
  },
  {
    label: "Round 4",
    pattern: "Duplicates",
    patternDesc: "Equal elements never swap — ≤ not <. Watch which pairs you call.",
    buildArray: () => shuffle([20, 20, 10, 40, 20, 30]),
  },
  {
    label: "Round 5",
    pattern: "Random (Hard)",
    patternDesc: "Larger 7-element random array. Full boss difficulty.",
    buildArray: () => shuffle([5, 15, 25, 35, 45, 55, 65]),
  },
];

const TOTAL_ROUNDS = ROUND_CONFIGS.length;

const BAR_BASE: [string, string][] = [
  ["#7c3aed", "#c4b5fd"],
  ["#0e7490", "#67e8f9"],
  ["#b45309", "#fde68a"],
  ["#be123c", "#fda4af"],
  ["#065f46", "#6ee7b7"],
  ["#1d4ed8", "#93c5fd"],
  ["#7c2d12", "#fdba74"],
];

function getBarBg(i: number, state: string): string {
  if (state === "comparing") return "linear-gradient(to top,#92400e,#fbbf24)";
  if (state === "swapping")  return "linear-gradient(to top,#9f1239,#f43f5e)";
  if (state === "sorted")    return "linear-gradient(to top,#065f46,#34d399)";
  const [from, to] = BAR_BASE[i % BAR_BASE.length];
  return `linear-gradient(to top,${from},${to})`;
}

type Feedback = "correct" | "wrong" | null;

function useRound(config: RoundConfig) {
  const initArray = useState(() => config.buildArray())[0];
  const [array, setArray] = useState<number[]>([...initArray]);
  const [comparisons] = useState<Comparison[]>(() => buildComparisons([...initArray]));
  const [cIdx, setCIdx] = useState(0);
  return { initArray, array, setArray, comparisons, cIdx, setCIdx };
}

export default function Section5BossLevel() {
  const { addXP, markComplete, goToSection, streak, totalSessionXP, setSessionAccuracy } = useXP();

  const [roundNum, setRoundNum] = useState(0);
  const [roundArrays] = useState<number[][]>(() => ROUND_CONFIGS.map((c) => c.buildArray()));

  const [array, setArray] = useState<number[]>(() => [...roundArrays[0]]);
  const [comparisons, setComparisons] = useState<Comparison[]>(() => buildComparisons([...roundArrays[0]]));
  const [cIdx, setCIdx] = useState(0);

  const [totalScore, setTotalScore] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [roundWrong, setRoundWrong] = useState(0);

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [explanation, setExplanation] = useState("");
  const [roundDone, setRoundDone] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const lockRef = useRef(false);

  const maxVal = Math.max(...array);
  const current = comparisons[cIdx];
  const totalComparisons = comparisons.length;
  const progress = cIdx / totalComparisons;

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
      setRoundScore((s) => s + 1);
      setTotalScore((s) => s + 1);
      addXP(20);
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
      setRoundWrong((w) => w + 1);
      setTotalWrong((w) => w + 1);
      sound.wrong();
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
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
        setRoundDone(true);
        sound.win();
      } else {
        setCIdx(next);
      }
    }, 1400);
  };

  const startNextRound = () => {
    const next = roundNum + 1;
    if (next >= TOTAL_ROUNDS) {
      markComplete(4);
      addXP(150);
      setAllDone(true);
      setTimeout(() => {
        sound.chord();
        setTimeout(() => setShowCard(true), 400);
      }, 2000);
      return;
    }
    const nextArr = roundArrays[next];
    setRoundNum(next);
    setArray([...nextArr]);
    setComparisons(buildComparisons([...nextArr]));
    setCIdx(0);
    setRoundScore(0);
    setRoundWrong(0);
    setRoundDone(false);
  };

  const allComparisons = ROUND_CONFIGS.reduce(
    (sum, _, i) => sum + buildComparisons([...roundArrays[i]]).length,
    0
  );

  useEffect(() => {
    if (allDone) {
      const acc = Math.round((totalScore / allComparisons) * 100);
      setSessionAccuracy(acc);
    }
  }, [allDone, totalScore, allComparisons, setSessionAccuracy]);

  if (allDone) {
    const accuracy = Math.round((totalScore / allComparisons) * 100);
    const shareText = `I just beat Bubble Sort (Boss Mode) on Brainrot\n\n⚡ ${totalSessionXP} XP earned\n🎯 ${accuracy}% accuracy\n🔥 ${streak} day streak\n\nRot smarter → brainrot.dev`;

    const handleShare = async () => {
      try {
        if (navigator.share) await navigator.share({ text: shareText });
        else {
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
              {totalScore}/{allComparisons} correct across all {TOTAL_ROUNDS} rounds — {accuracy}%
            </p>
          </motion.div>

          <AnimatePresence>
            {showCard && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6"
              >
                <div className="bg-gradient-to-br from-[#0d0d1a] to-[#12122a] rounded-2xl p-6 border border-violet-700/30 shadow-2xl shadow-violet-900/30">
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-black text-lg">
                      <span className="text-violet-400">brain</span>
                      <span className="text-cyan-400">rot</span>
                    </span>
                    <span className="text-slate-600 text-xs font-medium tracking-widest uppercase">
                      Boss Mode Complete
                    </span>
                  </div>
                  <p className="text-white font-black text-base mb-5 leading-snug">
                    I just beat Bubble Sort (Boss Mode) on Brainrot
                  </p>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { icon: "⚡", val: `${totalSessionXP} XP`, label: "earned" },
                      { icon: "🎯", val: `${accuracy}%`,          label: "accuracy" },
                      { icon: "🔥", val: `${streak}`,             label: "day streak" },
                    ].map((s) => (
                      <div key={s.label} className="bg-[#1c1c3a]/60 rounded-xl p-3 text-center">
                        <p className="text-sm mb-0.5">{s.icon}</p>
                        <p className="text-white font-black text-base tabular-nums">{s.val}</p>
                        <p className="text-slate-600 text-[10px]">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-slate-600 text-xs text-center">Rot smarter.</p>
                </div>
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

  const config = ROUND_CONFIGS[roundNum];

  return (
    <section className="min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-3xl w-full">

        <div className="mb-7">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-black tracking-widest text-red-400 uppercase bg-red-950/60 px-2.5 py-1 rounded">
              05 / 06
            </span>
            <span className="text-xs text-slate-600">15 min</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-2 leading-tight">
            Boss level.
          </h2>
          <p className="text-slate-400 text-sm">
            Drive every sort from start to finish. {TOTAL_ROUNDS} rounds, increasing difficulty.
          </p>
        </div>

        {/* Round tabs */}
        <div className="flex items-center gap-1.5 mb-5">
          {ROUND_CONFIGS.map((r, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i < roundNum
                  ? "bg-emerald-500"
                  : i === roundNum
                  ? "bg-red-500"
                  : "bg-[#1c1c3a]"
              }`}
            />
          ))}
          <span className="text-slate-500 text-xs ml-2 shrink-0">
            Round {roundNum + 1}/{TOTAL_ROUNDS}
          </span>
        </div>

        {/* Pattern badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={roundNum}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-5 p-3.5 bg-[#12122a] rounded-xl border border-[#1c1c3a]"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-red-400">{config.label}</span>
              <span className="text-xs text-slate-500 px-2 py-0.5 bg-[#1c1c3a] rounded border border-[#2a2a4a]">
                {config.pattern}
              </span>
            </div>
            <p className="text-slate-500 text-xs">{config.patternDesc}</p>
          </motion.div>
        </AnimatePresence>

        {/* Round-done interstitial */}
        <AnimatePresence>
          {roundDone && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 p-5 bg-emerald-950/30 border border-emerald-700/30 rounded-2xl flex items-center justify-between"
            >
              <div>
                <p className="text-emerald-400 font-black text-sm">
                  {config.label} done.{" "}
                  <span className="text-white/60 font-normal">
                    {roundScore}/{totalComparisons} correct
                  </span>
                </p>
                <p className="text-slate-600 text-xs mt-0.5">
                  {roundNum + 1 < TOTAL_ROUNDS
                    ? `Next: ${ROUND_CONFIGS[roundNum + 1].pattern}`
                    : "Final round complete!"}
                </p>
              </div>
              <button
                onClick={startNextRound}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all active:scale-95 text-sm shadow-lg shadow-emerald-900/40 shrink-0 ml-4"
              >
                {roundNum + 1 < TOTAL_ROUNDS ? "Next round →" : "Finish →"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress within round */}
        {!roundDone && (
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-1 bg-[#1c1c3a] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-red-500"
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-slate-600 text-xs tabular-nums shrink-0">
              {cIdx}/{totalComparisons}
            </span>
          </div>
        )}

        {/* Bar chart */}
        <div className={`bg-[#12122a] rounded-2xl p-6 mb-5 border border-[#1c1c3a] ${shaking ? "shake" : ""}`}>
          <div className="flex items-end justify-center gap-3" style={{ height: 180 }}>
            {array.map((val, i) => {
              const state = getBarState(i);
              const height = Math.max(12, (val / maxVal) * 158);
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{
                      height,
                      background: getBarBg(i, state),
                      boxShadow:
                        state === "comparing" ? "0 0 18px rgba(251,191,36,0.55)"
                        : state === "sorted"   ? "0 0 14px rgba(52,211,153,0.4)"
                        : "none",
                    }}
                    transition={{ duration: 0.28 }}
                    style={{ width: 46, borderRadius: "6px 6px 3px 3px" }}
                  />
                  <span className="text-xs font-bold text-slate-500 tabular-nums">{val}</span>
                </div>
              );
            })}
          </div>

          {current && !roundDone && (
            <div className="mt-4 text-center">
              <p className="text-white text-xl font-black">
                <span className="text-yellow-400">{array[current.j]}</span>
                <span className="text-slate-600 mx-2 text-base font-normal">vs</span>
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
              {feedback === "correct" ? "✓ " : "✗ "}{explanation}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        {!roundDone && (
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
        )}

        {/* Live score */}
        <div className="mt-4 flex items-center justify-center gap-8 text-xs text-slate-600">
          <span>✓ <span className="text-emerald-500 font-bold">{roundScore}</span> this round</span>
          <span>Total: <span className="text-violet-400 font-bold">{totalScore}</span></span>
          <span>✗ <span className="text-red-500 font-bold">{roundWrong}</span></span>
        </div>
      </div>
    </section>
  );
}
