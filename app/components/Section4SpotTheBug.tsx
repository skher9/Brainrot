"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";

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
    steps.push({
      array: [...a],
      j,
      didSwap: shouldSwap,
      isWrong: false,
      label: shouldSwap
        ? `${x} > ${y} → Swap`
        : `${x} ≤ ${y} → No swap`,
    });
    if (shouldSwap) [a[j], a[j + 1]] = [a[j + 1], a[j]];
  }

  const bugIdx = Math.floor(Math.random() * steps.length);
  const bugStep = steps[bugIdx];
  const x = bugStep.array[bugStep.j], y = bugStep.array[bugStep.j + 1];
  const wrongSwap = !bugStep.didSwap;

  steps[bugIdx] = {
    ...bugStep,
    didSwap: wrongSwap,
    isWrong: true,
    label: wrongSwap
      ? `${x} ≤ ${y} → Swap ???`
      : `${x} > ${y} → No swap ???`,
  };

  return { steps, bugIndex: bugIdx };
}

interface RoundConfig {
  array: number[];
  pattern: string | null;
  difficulty: "easy" | "medium" | "hard";
  hint: string;
}

const ROUND_CONFIGS: RoundConfig[] = [
  // Easy — 3-4 elements, obvious swaps
  { array: [3, 1, 2],         pattern: null,              difficulty: "easy",   hint: "3 steps — easy to scan" },
  { array: [4, 2, 1, 3],      pattern: null,              difficulty: "easy",   hint: "4 elements, one wrong" },
  { array: [2, 4, 1, 3],      pattern: null,              difficulty: "easy",   hint: "Mixed order" },

  // Medium — 5 elements, standard random
  { array: [3, 1, 4, 2, 5],   pattern: null,              difficulty: "medium", hint: "5 elements, more steps to check" },
  { array: [6, 2, 5, 1, 4],   pattern: null,              difficulty: "medium", hint: "Watch for adjacent equal traps" },
  { array: [2, 5, 1, 3, 4],   pattern: null,              difficulty: "medium", hint: "Partially sorted" },

  // Medium-hard — 5 elements with patterns
  { array: [4, 4, 2, 1, 3],   pattern: "Duplicates",      difficulty: "medium", hint: "Equal elements never swap" },
  { array: [2, 2, 3, 1, 2],   pattern: "Duplicates",      difficulty: "medium", hint: "Many duplicates — ≤ not <" },
  { array: [1, 3, 2, 4, 5],   pattern: "Nearly Sorted",   difficulty: "medium", hint: "Mostly in order already" },

  // Hard — 6 elements, larger arrays
  { array: [4, 2, 7, 1, 5, 3],pattern: null,              difficulty: "hard",   hint: "6 steps per pass" },
  { array: [6, 5, 4, 3, 2, 1],pattern: "Reverse Order",   difficulty: "hard",   hint: "Every compare should swap" },
  { array: [1, 2, 3, 5, 4, 6],pattern: "Nearly Sorted",   difficulty: "hard",   hint: "Only one real swap needed" },
  { array: [5, 5, 3, 1, 4, 2],pattern: "Duplicates",      difficulty: "hard",   hint: "Duplicates + big range" },
  { array: [7, 3, 9, 2, 8, 4],pattern: null,              difficulty: "hard",   hint: "Large values, random order" },
  { array: [8, 6, 4, 2, 9, 1],pattern: "Reverse-ish",     difficulty: "hard",   hint: "Almost reverse sorted" },
];

const TOTAL_ROUNDS = ROUND_CONFIGS.length;

const DIFFICULTY_COLORS = {
  easy:   { badge: "bg-emerald-950/60 text-emerald-400 border-emerald-700/30" },
  medium: { badge: "bg-amber-950/60 text-amber-400 border-amber-700/30" },
  hard:   { badge: "bg-red-950/60 text-red-400 border-red-700/30" },
};

export default function Section4SpotTheBug() {
  const { addXP, markComplete, goToSection } = useXP();
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<Round>(() =>
    generateRound(ROUND_CONFIGS[0].array)
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [roundDone, setRoundDone] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);

  const config = ROUND_CONFIGS[roundIdx];
  const maxVal = Math.max(...config.array);

  const pick = useCallback(
    (idx: number) => {
      if (selected !== null) return;
      setSelected(idx);
      const isRight = round.steps[idx].isWrong;
      setCorrect(isRight);
      if (isRight) {
        setScore((s) => s + 1);
        sound.correct();
        addXP(30);
      } else {
        sound.wrong();
      }
      setRoundDone(true);
    },
    [selected, round, addXP]
  );

  const nextRound = () => {
    const next = roundIdx + 1;
    if (next >= TOTAL_ROUNDS) {
      setAllDone(true);
      markComplete(3);
      addXP(60);
      sound.win();
      return;
    }
    setRoundIdx(next);
    setRound(generateRound(ROUND_CONFIGS[next].array));
    setSelected(null);
    setCorrect(null);
    setRoundDone(false);
  };

  if (allDone) {
    const pct = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <section className="min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center px-6 py-10">
        <div className="max-w-lg w-full text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#12122a] rounded-3xl p-10 border border-[#1c1c3a]"
          >
            <div className="text-6xl mb-4">
              {pct >= 80 ? "🎯" : pct >= 60 ? "👀" : "🔍"}
            </div>
            <h2 className="text-3xl font-black text-white mb-2">
              {pct >= 80 ? "Sharp eye." : pct >= 60 ? "Pretty good." : "Missed a few."}
            </h2>
            <p className="text-slate-400 mb-6 text-sm">
              {score}/{TOTAL_ROUNDS} bugs found — {pct}%.{" "}
              {pct >= 80
                ? "You know what correct swap logic looks like."
                : "Worth a second pass if you want it clean."}
            </p>
            {/* Mini score grid */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap mb-8">
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${i < score ? "bg-emerald-500" : "bg-[#2a2a4a]"}`}
                />
              ))}
            </div>
            <button
              onClick={() => goToSection(4)}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-violet-900/40"
            >
              Final boss →
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
            <span className="text-xs font-black tracking-widest text-pink-400 uppercase bg-pink-950/60 px-2.5 py-1 rounded">
              04 / 06
            </span>
            <span className="text-xs text-slate-600">15 min</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-2 leading-tight">
            Spot the bug.
          </h2>
          <p className="text-slate-400 text-sm">
            One step is wrong. One swap decision is off. Find it. Difficulty increases — patterns get sneakier.
          </p>
        </div>

        {/* Round progress */}
        <div className="flex items-center gap-1.5 mb-5">
          {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i < roundIdx
                  ? "bg-emerald-500"
                  : i === roundIdx
                  ? "bg-pink-500"
                  : "bg-[#1c1c3a]"
              }`}
            />
          ))}
          <span className="text-slate-500 text-xs ml-2 shrink-0">
            {roundIdx + 1}/{TOTAL_ROUNDS}
          </span>
        </div>

        {/* Difficulty + pattern badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={roundIdx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 mb-5"
          >
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${DIFFICULTY_COLORS[config.difficulty].badge}`}>
              {config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1)}
            </span>
            {config.pattern && (
              <span className="text-xs text-slate-500 font-semibold px-2.5 py-1 bg-[#1c1c3a] rounded-lg border border-[#2a2a4a]">
                {config.pattern}
              </span>
            )}
            <span className="text-xs text-slate-600 ml-1">{config.hint}</span>
          </motion.div>
        </AnimatePresence>

        {/* Steps grid */}
        <div className="grid gap-2.5 mb-5">
          {round.steps.map((step, i) => {
            const revealed = selected !== null;
            const isSelected = selected === i;
            const isBug = step.isWrong;
            const x = step.array[step.j], y = step.array[step.j + 1];
            const barH1 = Math.max(8, (x / maxVal) * 56);
            const barH2 = Math.max(8, (y / maxVal) * 56);

            let borderColor = "border-[#2a2a4a]";
            let bg = "bg-[#12122a]";
            if (revealed) {
              if (isBug)                { bg = "bg-red-950/40";  borderColor = "border-red-600/60"; }
              else if (isSelected)      { bg = "bg-red-950/20";  borderColor = "border-red-900/40"; }
            }

            return (
              <motion.button
                key={i}
                onClick={() => !revealed && pick(i)}
                disabled={revealed}
                whileHover={!revealed ? { scale: 1.01 } : {}}
                whileTap={!revealed ? { scale: 0.99 } : {}}
                className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all ${bg} ${borderColor} ${
                  !revealed ? "cursor-pointer hover:border-pink-500/60" : "cursor-default"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-slate-600 text-xs font-mono w-6 shrink-0">
                    S{i + 1}
                  </span>

                  <div className="flex items-end gap-1 shrink-0">
                    <div style={{ width: 14, height: barH1, background: "linear-gradient(to top,#4f46e5,#8b5cf6)", borderRadius: "3px 3px 1px 1px" }} />
                    <div style={{ width: 14, height: barH2, background: "linear-gradient(to top,#b45309,#fbbf24)", borderRadius: "3px 3px 1px 1px" }} />
                  </div>

                  <span className="text-white text-sm font-medium flex-1">
                    {step.label}
                  </span>

                  {revealed && isBug && (
                    <motion.span
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-red-400 text-xs font-black shrink-0"
                    >
                      ← BUG
                    </motion.span>
                  )}
                  {revealed && !isBug && isSelected && (
                    <span className="text-slate-500 text-xs shrink-0">wrong pick</span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {roundDone && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl px-5 py-4 mb-4 border flex items-center justify-between ${
                correct
                  ? "bg-emerald-950/50 border-emerald-700/40"
                  : "bg-red-950/50 border-red-700/40"
              }`}
            >
              <div>
                <p className={`font-black text-sm ${correct ? "text-emerald-400" : "text-red-400"}`}>
                  {correct ? "Found it. " : "Nope. "}
                  <span className="font-normal text-slate-400">
                    {correct
                      ? `Step S${round.bugIndex + 1} had a wrong swap decision.`
                      : `Bug was at Step S${round.bugIndex + 1}.`}
                  </span>
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Score: {score}/{roundIdx + 1}</p>
              </div>
              <button
                onClick={nextRound}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-lg transition-all active:scale-95 text-sm ml-4 shrink-0"
              >
                {roundIdx + 1 < TOTAL_ROUNDS ? "Next →" : "Results →"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!roundDone && (
          <p className="text-slate-600 text-xs text-center">
            Click the step with the wrong swap decision
          </p>
        )}
      </div>
    </section>
  );
}
