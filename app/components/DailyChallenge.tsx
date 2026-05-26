"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import { Corners } from "@/components/Effects";

function msToMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function timeParts(ms: number) {
  const s = Math.floor(ms / 1000);
  return {
    h: String(Math.floor(s / 3600)).padStart(2, "0"),
    m: String(Math.floor((s % 3600) / 60)).padStart(2, "0"),
    s: String(s % 60).padStart(2, "0"),
  };
}

const TELEMETRY = [
  { label: "Attempts",  value: "2,341" },
  { label: "Avg Time",  value: "11m" },
  { label: "Best",      value: "4m12s" },
  { label: "Drop Rate", value: "6%" },
  { label: "Running",   value: "312" },
];

export default function DailyChallenge() {
  const { streak } = useXP();
  const [countdown, setCountdown] = useState(() => msToMidnight());

  useEffect(() => {
    const t = setInterval(() => setCountdown(msToMidnight()), 1000);
    return () => clearInterval(t);
  }, []);

  const { h, m, s } = timeParts(countdown);
  const goldenStreak = streak >= 7;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="max-w-5xl mx-auto px-4 pt-3 pb-2"
    >
      <div
        className="relative overflow-hidden rounded-xl diag-stripe"
        style={{
          background: "rgba(13,13,20,0.9)",
          border: `1px solid ${goldenStreak ? "rgba(246,196,83,0.3)" : "rgba(246,196,83,0.12)"}`,
        }}
      >
        <Corners color="var(--gold)" size={10} thickness={1.2} opacity={0.4} />

        <div className="px-5 py-3 flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {/* Streak */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative">
              <motion.span
                className="text-xl leading-none block"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                🔥
              </motion.span>
              {goldenStreak && (
                <span
                  className="absolute inset-0 rounded-full pulse-ring"
                  style={{ background: "rgba(251,113,28,0.4)", borderRadius: "50%" }}
                />
              )}
            </div>
            <div>
              <p
                className="font-black text-sm leading-none"
                style={{ color: goldenStreak ? "var(--gold)" : "#fb923c" }}
              >
                {streak} day streak
              </p>
              <p
                className="text-[10px] mt-0.5"
                style={{
                  color: "rgba(255,255,255,0.2)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {streak === 0
                  ? "Start today"
                  : streak >= 30
                  ? "Legend 🏆"
                  : streak >= 7
                  ? "On fire"
                  : "Keep going"}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-8 w-px bg-white/[0.06]" />

          {/* Challenge name */}
          <div className="hidden sm:block flex-1">
            <p
              className="text-[9px] uppercase tracking-[0.2em] font-bold mb-0.5"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              Today&apos;s rot
            </p>
            <p className="text-white font-black text-sm">Bubble Sort Speed Run</p>
          </div>

          {/* Countdown */}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {[h, m, s].map((val, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className="px-2 py-1 rounded-md text-center"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    minWidth: 32,
                  }}
                >
                  <span
                    className="font-black tabular-nums text-sm leading-none"
                    style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)" }}
                  >
                    {val}
                  </span>
                </div>
                {i < 2 && (
                  <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 900 }}>:</span>
                )}
              </div>
            ))}
            <p
              className="text-[9px] ml-1 uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-mono)" }}
            >
              next
            </p>
          </div>
        </div>

        {/* Telemetry strip */}
        <div
          className="px-5 py-1.5 flex items-center gap-4 border-t overflow-x-auto"
          style={{ borderColor: "rgba(255,255,255,0.04)" }}
        >
          {TELEMETRY.map((t) => (
            <div key={t.label} className="flex items-center gap-1.5 shrink-0">
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.18)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                {t.label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {t.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
