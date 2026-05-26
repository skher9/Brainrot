"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";

const SECTIONS = [
  "Watch It",
  "Drive It",
  "Beat Clock",
  "Spot Bug",
  "Boss Level",
  "Real World",
];

export default function Header() {
  const { xp, currentSection } = useXP();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08080f]/80 backdrop-blur-xl border-b border-[#1c1c3a]">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-4">
        <span className="text-violet-400 font-black text-base tracking-tight shrink-0">
          brain<span className="text-cyan-400">rot</span>
        </span>

        <div className="flex-1 flex gap-1.5">
          {SECTIONS.map((name, i) => (
            <div key={i} className="flex-1">
              <div className="h-1 rounded-full bg-[#1c1c3a] overflow-hidden mb-1">
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
              <p
                className={`text-[8px] font-semibold text-center leading-none truncate transition-colors duration-300 ${
                  i === currentSection
                    ? "text-violet-400"
                    : i < currentSection
                    ? "text-emerald-500"
                    : "text-slate-700"
                }`}
              >
                {name}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 bg-[#1c1c3a] rounded-full px-3 py-1 shrink-0 border border-[#2a2a4a]">
          <span className="text-yellow-400 text-xs">⚡</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={xp}
              className="text-yellow-300 font-black text-xs tabular-nums"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {xp} XP
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
