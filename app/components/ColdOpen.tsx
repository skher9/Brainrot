"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateBubbleSortSteps } from "@/lib/bubbleSort";

const COLD_ARRAY = [64, 34, 25, 12, 22, 11, 90];

const BAR_COLORS = [
  "linear-gradient(to top, #7c3aed, #a78bfa)",
  "linear-gradient(to top, #0e7490, #22d3ee)",
  "linear-gradient(to top, #b45309, #fbbf24)",
  "linear-gradient(to top, #be123c, #f43f5e)",
  "linear-gradient(to top, #065f46, #34d399)",
  "linear-gradient(to top, #1d4ed8, #60a5fa)",
  "linear-gradient(to top, #7c2d12, #fb923c)",
];

const MAX_VAL = Math.max(...COLD_ARRAY);

export default function ColdOpen({ onStart }: { onStart: () => void }) {
  const [steps] = useState(() => generateBubbleSortSteps(COLD_ARRAY));
  const [stepIdx, setStepIdx] = useState(4);
  const [showPrompt, setShowPrompt] = useState(false);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx((p) => (p + 1 >= steps.length ? 0 : p + 1));
    }, 700);
    return () => clearInterval(t);
  }, [steps.length]);

  useEffect(() => {
    const t = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 180);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowPrompt(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const step = steps[stepIdx];

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center relative overflow-hidden select-none">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_40%,rgba(124,58,237,0.08)_0%,transparent_70%)]" />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="pt-10 pb-0 z-10"
      >
        <span
          className="font-black text-2xl tracking-tight"
          style={{
            filter: glitch
              ? "drop-shadow(2px 0 0 rgba(239,68,68,0.9)) drop-shadow(-2px 0 0 rgba(6,182,212,0.9))"
              : "none",
            transform: glitch ? "translateX(1.5px)" : "none",
            transition: glitch ? "none" : "filter 0.12s, transform 0.12s",
            display: "inline-block",
          }}
        >
          <span className="text-violet-400">brain</span>
          <span className="text-cyan-400">rot</span>
        </span>
      </motion.div>

      {/* Center zone — bars + tagline */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl"
        >
          {/* Bar card */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-8 pt-6 pb-4 mb-5 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.025]"
              style={{ backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "56px 36px" }}
            />
            <div className="flex items-end justify-center gap-3 relative z-10" style={{ height: 200 }}>
              {step.array.map((val, i) => {
                const isComparing =
                  step.comparing &&
                  (i === step.comparing[0] || i === step.comparing[1]);
                const isSorted = step.sortedIndices.includes(i);
                const height = Math.max(14, (val / MAX_VAL) * 180);

                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <motion.div
                      animate={{ height }}
                      transition={{ duration: 0.42, ease: "easeInOut" }}
                      style={{
                        width: 48,
                        background: isSorted
                          ? "linear-gradient(to top, #065f46, #34d399)"
                          : isComparing
                          ? "linear-gradient(to top, #92400e, #fbbf24)"
                          : BAR_COLORS[i % BAR_COLORS.length],
                        borderRadius: "6px 6px 3px 3px",
                        boxShadow: isComparing
                          ? "0 0 22px rgba(251,191,36,0.6)"
                          : isSorted
                          ? "0 0 14px rgba(52,211,153,0.5)"
                          : `0 0 10px rgba(124,58,237,0.2)`,
                      }}
                    />
                    <span className="text-[11px] font-bold text-white/25 tabular-nums">
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="text-center text-white/25 text-xs font-semibold tracking-[0.2em] uppercase mb-8"
          >
            Rot smarter.
          </motion.p>
        </motion.div>

        {/* Prompt + CTA */}
        <AnimatePresence>
          {showPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-6 pb-16"
            >
              <p className="text-white text-xl font-bold text-center leading-snug max-w-sm">
                Want to understand what just happened?
              </p>
              <motion.button
                onClick={onStart}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="px-10 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-base rounded-2xl transition-colors shadow-2xl shadow-violet-900/60"
              >
                Let&apos;s go
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
