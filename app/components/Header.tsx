"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";

const SECTION_NAMES = [
  "Watch It",
  "Drive It",
  "Beat Clock",
  "Spot Bug",
  "Boss Level",
  "Real World",
];

export default function Header() {
  const { xp, streak, level, currentSection, soundEnabled, toggleSound } =
    useXP();

  const goldenStreak = streak >= 7;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08080f]/90 backdrop-blur-xl border-b border-[#1c1c3a]">
      <div className="max-w-5xl mx-auto px-4 pt-2.5 pb-1.5 flex items-center gap-4">
        {/* Logo */}
        <motion.span
          className="font-black text-base tracking-tight shrink-0 cursor-default select-none"
          animate={
            goldenStreak
              ? {
                  filter: [
                    "drop-shadow(0 0 6px rgba(251,191,36,0.4))",
                    "drop-shadow(0 0 14px rgba(251,191,36,0.8))",
                    "drop-shadow(0 0 6px rgba(251,191,36,0.4))",
                  ],
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className={goldenStreak ? "text-amber-400" : "text-violet-400"}>
            brain
          </span>
          <span className={goldenStreak ? "text-yellow-300" : "text-cyan-400"}>
            rot
          </span>
        </motion.span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* XP + level */}
        <div className="flex flex-col items-center shrink-0">
          <div className="flex items-center gap-1.5 bg-[#1c1c3a] rounded-full px-3 py-1 border border-[#2a2a4a]">
            <span className="text-amber-400 text-xs">⚡</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={xp}
                className="text-amber-300 font-black text-xs tabular-nums"
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {xp} XP
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="text-[9px] text-slate-600 mt-0.5 font-medium leading-none">
            {level}
          </span>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1.5 bg-[#1c1c3a] rounded-full px-3 py-1 border border-[#2a2a4a] shrink-0">
          <motion.span
            className="text-sm leading-none"
            animate={streak > 0 ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.4, delay: 0.1 }}
            key={streak}
          >
            🔥
          </motion.span>
          <span className="text-orange-400 font-black text-xs tabular-nums">
            {streak}
          </span>
        </div>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-[#1c1c3a] border border-[#2a2a4a] hover:border-violet-600 transition-colors text-sm shrink-0"
          title={soundEnabled ? "Sound on — click to mute" : "Sound off — click to enable"}
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
      </div>

      {/* Section progress bar */}
      <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-1">
        {SECTION_NAMES.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-[#1c1c3a] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  i < currentSection
                    ? "linear-gradient(90deg,#059669,#34d399)"
                    : "linear-gradient(90deg,#6d28d9,#22d3ee)",
              }}
              initial={{ width: 0 }}
              animate={{ width: i <= currentSection ? "100%" : "0%" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        ))}
      </div>
    </header>
  );
}
