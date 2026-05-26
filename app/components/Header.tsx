"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";

const SECTION_LABELS = ["Watch", "Drive", "Race", "Debug", "Boss", "Context"];

export default function Header() {
  const { xp, streak, level, currentSection, soundEnabled, toggleSound } =
    useXP();

  const goldenStreak = streak >= 7;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="h-full max-w-5xl mx-auto px-5 flex items-center gap-5">
        {/* Logo */}
        <motion.span
          className="font-black text-sm tracking-tight shrink-0 cursor-default select-none"
          animate={
            goldenStreak
              ? {
                  filter: [
                    "drop-shadow(0 0 6px rgba(251,191,36,0.5))",
                    "drop-shadow(0 0 16px rgba(251,191,36,0.9))",
                    "drop-shadow(0 0 6px rgba(251,191,36,0.5))",
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

        {/* Section progress pills */}
        <div className="flex-1 flex items-center gap-1 min-w-0">
          {SECTION_LABELS.map((label, i) => {
            const isActive = i === currentSection;
            const isDone = i < currentSection;
            return (
              <div
                key={i}
                className="flex-1 min-w-0 flex flex-col items-center gap-0.5"
              >
                <div className="w-full h-[3px] rounded-full overflow-hidden bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: isDone
                        ? "linear-gradient(90deg,#059669,#34d399)"
                        : isActive
                        ? "linear-gradient(90deg,#7c3aed,#22d3ee)"
                        : "transparent",
                    }}
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: isDone || isActive ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span
                  className={`text-[9px] font-semibold leading-none hidden sm:block truncate ${
                    isActive
                      ? "text-violet-400"
                      : isDone
                      ? "text-emerald-600"
                      : "text-white/20"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* XP */}
        <div className="flex flex-col items-center shrink-0">
          <div className="flex items-center gap-1 bg-white/[0.06] rounded-full px-2.5 py-1 border border-white/[0.08]">
            <span className="text-amber-400 text-[11px]">⚡</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={xp}
                className="text-amber-300 font-black text-[11px] tabular-nums"
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 6, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {xp}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="text-[8px] text-white/25 mt-0.5 font-medium leading-none hidden sm:block">
            {level}
          </span>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1 bg-white/[0.06] rounded-full px-2.5 py-1 border border-white/[0.08] shrink-0">
          <motion.span
            className="text-[13px] leading-none"
            animate={streak > 0 ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.35, delay: 0.05 }}
            key={streak}
          >
            🔥
          </motion.span>
          <span className="text-orange-400 font-black text-[11px] tabular-nums">
            {streak}
          </span>
        </div>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] hover:border-violet-600/60 hover:bg-violet-950/40 transition-all text-[13px] shrink-0"
          title={soundEnabled ? "Sound on" : "Sound off"}
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
      </div>
    </header>
  );
}
