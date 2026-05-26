"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateBubbleSortSteps, SortStep } from "@/lib/bubbleSort";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";

const INITIAL_ARRAY = [64, 34, 25, 12, 22, 11, 90];
const SPEEDS = { slow: 1400, normal: 650, fast: 180 } as const;
type Speed = keyof typeof SPEEDS;

const BAR_GRADIENT: Record<string, string> = {
  default: "linear-gradient(to top, #4f46e5, #8b5cf6)",
  comparing: "linear-gradient(to top, #b45309, #fbbf24)",
  swapping: "linear-gradient(to top, #be123c, #f43f5e)",
  sorted: "linear-gradient(to top, #065f46, #34d399)",
};

const BAR_GLOW: Record<string, string> = {
  default: "none",
  comparing: "0 0 18px rgba(251,191,36,0.55)",
  swapping: "0 0 18px rgba(244,63,94,0.6)",
  sorted: "0 0 14px rgba(52,211,153,0.45)",
};

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
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-28">
      <div className="max-w-3xl w-full">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-black tracking-widest text-violet-400 uppercase bg-violet-950/60 px-2 py-0.5 rounded">
              01 / 06
            </span>
            <span className="text-[10px] text-slate-600">5 min</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-3 leading-tight">
            Watch it happen.
          </h2>
          <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
            Bubble sort in action. Each comparison, each swap. Watch it enough
            times and the pattern becomes obvious — and so does why it&apos;s slow.
          </p>
        </div>

        {/* Bar chart */}
        <div className="bg-[#12122a] rounded-2xl p-8 mb-5 border border-[#1c1c3a]">
          <div className="flex items-end justify-center gap-3 h-[220px]">
            {step.array.map((val, i) => {
              const state = getBarState(i, step);
              const height = Math.max(12, (val / maxVal) * 200);
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{
                      height,
                      background: BAR_GRADIENT[state],
                      boxShadow: BAR_GLOW[state],
                    }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    style={{ width: 44, borderRadius: "6px 6px 3px 3px" }}
                  />
                  <span className="text-xs font-bold text-slate-500 tabular-nums">
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18 }}
            className="bg-[#12122a] rounded-xl px-5 py-3.5 mb-6 border border-[#1c1c3a] min-h-[52px] flex items-center gap-3"
          >
            <span className="text-violet-500 text-xs font-black tabular-nums shrink-0">
              {idx + 1}/{steps.length}
            </span>
            <p className="text-slate-300 text-sm leading-relaxed">{step.description}</p>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-violet-900/40"
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>

          <button
            onClick={() => { setPlaying(false); advance(); }}
            disabled={idx >= steps.length - 1}
            className="px-4 py-2.5 bg-[#1c1c3a] hover:bg-[#252550] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 text-white font-medium rounded-xl transition-all text-sm border border-[#2a2a4a]"
          >
            ▶▶ Step
          </button>

          <button
            onClick={reset}
            className="px-4 py-2.5 bg-[#1c1c3a] hover:bg-[#252550] active:scale-95 text-slate-300 font-medium rounded-xl transition-all text-sm border border-[#2a2a4a]"
          >
            ↺ Reset
          </button>

          <div className="flex items-center bg-[#1c1c3a] rounded-xl border border-[#2a2a4a] overflow-hidden ml-auto">
            {(["slow", "normal", "fast"] as Speed[]).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-2.5 text-xs font-bold transition-all capitalize ${
                  speed === s
                    ? "bg-violet-700 text-white"
                    : "text-slate-500 hover:text-white"
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
              className="mt-8 p-5 bg-emerald-950/40 border border-emerald-700/40 rounded-2xl flex items-center justify-between"
            >
              <div>
                <p className="text-emerald-400 font-black text-base">
                  Pattern locked in. Now you drive it.
                </p>
                <p className="text-slate-500 text-xs mt-0.5">+50 XP</p>
              </div>
              <button
                onClick={() => goToSection(1)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all active:scale-95 text-sm shadow-lg shadow-emerald-900/40"
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
