"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateBubbleSortSteps } from "@/lib/bubbleSort";
import { Corners, Magnetic } from "@/components/Effects";

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

const STATS = [
  { label: "Stages",    value: "6" },
  { label: "Avg time",  value: "12 min" },
  { label: "Online",    value: "1,247" },
  { label: "Complete",  value: "94%" },
];

export default function ColdOpen({ onStart }: { onStart: () => void }) {
  const [steps] = useState(() => generateBubbleSortSteps(COLD_ARRAY));
  const [stepIdx, setStepIdx] = useState(4);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx((p) => (p + 1 >= steps.length ? 0 : p + 1));
    }, 700);
    return () => clearInterval(t);
  }, [steps.length]);

  useEffect(() => {
    const t = setTimeout(() => setShowPrompt(true), 2200);
    return () => clearTimeout(t);
  }, []);

  const step = steps[stepIdx];

  return (
    <div
      className="min-h-screen flex flex-col items-center relative overflow-hidden select-none"
      style={{ background: "var(--bg-0)" }}
    >
      {/* Constellation bg */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(124,58,237,0.07) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Corner tags */}
      <div className="fixed top-4 left-4 z-10" style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.1)", letterSpacing: "0.2em" }}>
        SYS:ONLINE
      </div>
      <div className="fixed top-4 right-4 z-10" style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.1)", letterSpacing: "0.2em" }}>
        ALGO/SORT/BUBBLE
      </div>

      {/* Logo */}
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="pt-10 pb-0 z-10"
      >
        <div className="flex items-baseline gap-1">
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--violet)",
            }}
          >
            brain
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--cyan)",
            }}
          >
            rot
          </span>
        </div>
      </motion.div>

      {/* Center zone */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="w-full max-w-xl"
        >
          {/* Display heading */}
          <h1
            className="text-center mb-6 leading-[0.92]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(52px, 9vw, 110px)",
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            Rot{" "}
            <em style={{ color: "var(--gold)", fontStyle: "italic" }}>smarter.</em>
          </h1>

          {/* Bar console card */}
          <div
            className="relative rounded-2xl px-8 pt-6 pb-5 mb-5 overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <Corners opacity={0.35} />
            {/* Subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.025] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                backgroundSize: "56px 36px",
              }}
            />

            {/* Bars */}
            <div
              className="relative z-10 flex items-end justify-center gap-3"
              style={{ height: 180 }}
            >
              {step.array.map((val, i) => {
                const isComparing =
                  step.comparing &&
                  (i === step.comparing[0] || i === step.comparing[1]);
                const isSorted = step.sortedIndices.includes(i);
                const height = Math.max(12, (val / MAX_VAL) * 164);

                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <motion.div
                      className="bar-base"
                      animate={{ height }}
                      transition={{ duration: 0.42, ease: "easeInOut" }}
                      style={{
                        width: 44,
                        background: isSorted
                          ? "linear-gradient(to top, #065f46, #34d399)"
                          : isComparing
                          ? "linear-gradient(to top, #92400e, #fbbf24)"
                          : BAR_COLORS[i % BAR_COLORS.length],
                        boxShadow: isComparing
                          ? "0 0 20px rgba(251,191,36,0.55)"
                          : isSorted
                          ? "0 0 12px rgba(52,211,153,0.4)"
                          : "none",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        color: "rgba(255,255,255,0.2)",
                      }}
                    >
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Step caption */}
            <p
              className="text-center mt-4 relative z-10"
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
              }}
            >
              {step.description}
            </p>
          </div>
        </motion.div>

        {/* Prompt + CTA */}
        <AnimatePresence>
          {showPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-5 pb-10"
            >
              <p
                className="text-center max-w-sm"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.85)",
                  lineHeight: 1.4,
                }}
              >
                Want to understand what just happened?
              </p>

              <Magnetic strength={0.35}>
                <button
                  onClick={onStart}
                  className="btn-primary"
                  style={{ fontSize: 15, padding: "13px 36px" }}
                >
                  Let&apos;s go
                  <span style={{ fontSize: 12 }}>→</span>
                </button>
              </Magnetic>

              {/* Trust strip */}
              <div className="flex items-center gap-5 mt-1">
                {STATS.map((s) => (
                  <div key={s.label} className="flex flex-col items-center">
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--gold)",
                      }}
                    >
                      {s.value}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.2)",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
