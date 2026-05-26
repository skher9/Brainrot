"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useXP } from "@/lib/xpContext";

function msToMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec.toString().padStart(2, "0")}s`;
}

export default function DailyChallenge() {
  const { streak } = useXP();
  const [countdown, setCountdown] = useState(() => msToMidnight());

  useEffect(() => {
    const t = setInterval(() => setCountdown(msToMidnight()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="max-w-5xl mx-auto px-4 pt-2 pb-1"
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-950/40 via-[#12121a] to-cyan-950/30 border border-violet-800/40 rounded-xl px-4 py-3 shadow-lg shadow-violet-950/20">
        {/* Left: streak */}
        <div className="flex items-center gap-2">
          <motion.span
            className="text-lg"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            🔥
          </motion.span>
          <div>
            <p className="text-orange-400 font-black text-sm leading-none">
              {streak} day streak
            </p>
            <p className="text-slate-600 text-[10px] mt-0.5">
              {streak === 0
                ? "Start your streak today"
                : streak >= 30
                ? "30-day legend 🏆"
                : streak >= 7
                ? "On fire. Keep it going."
                : "Keep coming back"}
            </p>
          </div>
        </div>

        {/* Center: today's challenge */}
        <div className="text-center hidden sm:block">
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">
            Today&apos;s rot
          </p>
          <p className="text-white font-black text-xs mt-0.5">
            Bubble Sort Speed Run
          </p>
        </div>

        {/* Right: countdown */}
        <div className="text-right">
          <p className="text-slate-600 text-[10px] uppercase tracking-widest">
            Next challenge
          </p>
          <p className="text-cyan-400 font-black text-xs tabular-nums mt-0.5">
            {formatCountdown(countdown)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
