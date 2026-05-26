"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateBubbleSortSteps, SortStep } from "@/lib/bubbleSort";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";

const INITIAL_ARRAY = [64, 34, 25, 12, 22, 11, 90];
const SPEEDS = { slow: 1400, normal: 650, fast: 180 } as const;
type Speed = keyof typeof SPEEDS;

// Each bar position gets its own color identity
const BAR_BASE: [string, string][] = [
  ["#7c3aed", "#c4b5fd"], // violet
  ["#0e7490", "#67e8f9"], // cyan
  ["#b45309", "#fde68a"], // amber
  ["#be123c", "#fda4af"], // rose
  ["#065f46", "#6ee7b7"], // emerald
  ["#1d4ed8", "#93c5fd"], // blue
  ["#7c2d12", "#fdba74"], // orange
];

function getBarBg(i: number, state: string): string {
  if (state === "comparing") return "linear-gradient(to top,#92400e,#fbbf24)";
  if (state === "swapping") return "linear-gradient(to top,#9f1239,#f43f5e)";
  if (state === "sorted") return "linear-gradient(to top,#065f46,#34d399)";
  const [from, to] = BAR_BASE[i % BAR_BASE.length];
  return `linear-gradient(to top,${from},${to})`;
}

function getBarGlow(i: number, state: string): string {
  if (state === "comparing") return "0 0 22px rgba(251,191,36,0.65)";
  if (state === "swapping") return "0 0 22px rgba(244,63,94,0.7)";
  if (state === "sorted") return "0 0 16px rgba(52,211,153,0.5)";
  const glows = [
    "0 0 12px rgba(124,58,237,0.35)",
    "0 0 12px rgba(6,182,212,0.35)",
    "0 0 12px rgba(217,119,6,0.35)",
    "0 0 12px rgba(190,18,60,0.35)",
    "0 0 12px rgba(6,95,70,0.35)",
    "0 0 12px rgba(29,78,216,0.35)",
    "0 0 12px rgba(124,45,18,0.35)",
  ];
  return glows[i % glows.length];
}

function getBarState(i: number, step: SortStep): string {
  if (step.sortedIndices.includes(i)) return "sorted";
  if (step.comparing) {
    const [a, b] = step.comparing;
    if (i === a || i === b) return step.swapped ? "swapping" : "comparing";
  }
  return "default";
}

export default function Section1Visualizer() {
  const { addXP, markComplete, goToSection } = useXP();
  const [steps] = useState(() => generateBubbleSortSteps(INITIAL_ARRAY));
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxVal = Math.max(...INITIAL_ARRAY);
  const step = steps[idx];

  const advance = useCallback(() => {
    setIdx((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        setPlaying(false);
        setDone(true);
        markComplete(0);
        addXP(50);
        sound.win();
        return prev;
      }
      const s = steps[next];
      if (s.type === "swap") sound.swap();
      else if (s.type === "compare") sound.compare();
      return next;
    });
  }, [steps, addXP, markComplete]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(advance, SPEEDS[speed]);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speed, advance]);

  const reset = () => {
    setPlaying(false);
    setIdx(0);
    setDone(false);
  };

  return (
    <section className="min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-3xl w-full">
        {/* Section header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-black tracking-widest text-violet-400 uppercase bg-violet-950/60 px-2 py-0.5 rounded-md">
              01 / 06
            </span>
            <span className="text-[10px] text-white/25 font-medium">5 min</span>
          </div>
          <h2 className="text-3xl font-black text-white mb-2 leading-tight">
            Watch it happen.
          </h2>
          <p className="text-white/40 text-sm max-w-lg leading-relaxed">
            Bubble sort live. Each comparison, each swap. Watch the pattern form.
          </p>
        </div>

        {/* Bar chart */}
        <div className="bg-white/[0.03] rounded-2xl p-6 mb-4 border border-white/[0.06] relative overflow-hidden">
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "60px 40px" }}
          />
          <div className="flex items-end justify-center gap-4 h-[240px] relative z-10">
            {step.array.map((val, i) => {
              const state = getBarState(i, step);
              const height = Math.max(14, (val / maxVal) * 220);
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{
                      height,
                      background: getBarBg(i, state),
                      boxShadow: getBarGlow(i, state),
                    }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: 46, borderRadius: "6px 6px 3px 3px" }}
                  />
                  <span className="text-[11px] font-bold text-white/30 tabular-nums">
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step description — unified box with counter */}
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-3 bg-white/[0.03] rounded-xl px-4 py-3.5 mb-5 border border-white/[0.06] min-h-[54px]"
          >
            {/* Step counter as progress bar */}
            <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
              <span className="text-[10px] font-black text-violet-400 tabular-nums leading-none">
                {idx + 1}
              </span>
              <div className="w-px flex-1 bg-white/[0.08] min-h-[16px]" />
              <span className="text-[9px] text-white/20 tabular-nums leading-none">
                {steps.length}
              </span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">{step.description}</p>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 active:scale-[0.97] text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-violet-900/40"
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>

          <button
            onClick={() => { setPlaying(false); advance(); }}
            disabled={idx >= steps.length - 1}
            className="px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.97] text-white/70 font-medium rounded-xl transition-all text-sm border border-white/[0.08]"
          >
            Step →
          </button>

          <button
            onClick={reset}
            className="px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] active:scale-[0.97] text-white/50 font-medium rounded-xl transition-all text-sm border border-white/[0.08]"
          >
            ↺
          </button>

          <div className="flex items-center bg-white/[0.04] rounded-xl border border-white/[0.07] overflow-hidden ml-auto">
            {(["slow", "normal", "fast"] as Speed[]).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-2.5 text-xs font-bold transition-all capitalize ${
                  speed === s
                    ? "bg-violet-700 text-white"
                    : "text-white/30 hover:text-white/70"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Complete CTA */}
        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 p-5 bg-emerald-950/30 border border-emerald-700/30 rounded-2xl flex items-center justify-between"
            >
              <div>
                <p className="text-emerald-400 font-black text-sm">
                  Pattern locked in. Now you drive it.
                </p>
                <p className="text-white/25 text-xs mt-0.5">+50 XP earned</p>
              </div>
              <button
                onClick={() => goToSection(1)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all active:scale-[0.97] text-sm shadow-lg shadow-emerald-900/40"
              >
                Next →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
