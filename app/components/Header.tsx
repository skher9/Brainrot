"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import { TickNumber, Corners } from "@/components/Effects";
import { Speaker, SpeakerOff } from "@/components/Glyphs";

const SECTION_LABELS = ["Watch", "Drive", "Race", "Debug", "Boss", "Context"];
const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";

function Wordmark({ golden }: { glitch?: boolean; golden: boolean }) {
  const [g, setG] = useState(false);
  const [gText, setGText] = useState("brainrot");

  useEffect(() => {
    const t = setInterval(() => {
      setG(true);
      // scramble for 3 frames then restore
      let frame = 0;
      const scramble = setInterval(() => {
        if (frame >= 3) {
          setG(false);
          setGText("brainrot");
          clearInterval(scramble);
          return;
        }
        setGText(
          "brainrot"
            .split("")
            .map((c, i) =>
              Math.random() < 0.3
                ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)].toLowerCase()
                : c
            )
            .join("")
        );
        frame++;
      }, 60);
    }, 4200);
    return () => clearInterval(t);
  }, []);

  const text = gText;
  const brain = text.slice(0, 5);
  const rot = text.slice(5);

  return (
    <span
      className="font-black text-sm tracking-tight shrink-0 cursor-default select-none"
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 15,
        filter: g
          ? "drop-shadow(2px 0 0 rgba(239,68,68,0.9)) drop-shadow(-2px 0 0 rgba(6,182,212,0.9))"
          : golden
          ? "drop-shadow(0 0 10px rgba(246,196,83,0.6))"
          : "none",
        transition: g ? "none" : "filter 0.2s",
      }}
    >
      <span style={{ color: golden ? "var(--gold)" : "var(--violet)" }}>{brain}</span>
      <span style={{ color: golden ? "#fde68a" : "var(--cyan)" }}>{rot}</span>
      <span
        style={{
          fontSize: 8,
          color: "rgba(255,255,255,0.2)",
          fontFamily: "var(--font-mono)",
          fontStyle: "normal",
          marginLeft: 3,
          verticalAlign: "super",
        }}
      >
        v.7
      </span>
    </span>
  );
}

export default function Header() {
  const { xp, streak, level, currentSection, soundEnabled, toggleSound, sectionComplete } =
    useXP();

  const goldenStreak = streak >= 7;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-[60px]"
      style={{
        background: "rgba(7,7,13,0.94)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="h-full max-w-5xl mx-auto px-4 flex items-center gap-4">
        {/* Wordmark */}
        <Wordmark golden={goldenStreak} />

        {/* Section rail */}
        <div className="flex-1 flex items-center gap-1 min-w-0">
          {SECTION_LABELS.map((label, i) => {
            const isActive = i === currentSection;
            const isDone = sectionComplete[i];
            return (
              <div
                key={i}
                className="flex-1 min-w-0 flex flex-col items-center gap-0.5"
              >
                <div className="w-full h-[3px] rounded-full overflow-hidden bg-white/[0.05]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: isDone
                        ? "linear-gradient(90deg,#065f46,var(--emerald))"
                        : isActive
                        ? "linear-gradient(90deg,var(--violet-dim),var(--cyan))"
                        : "transparent",
                    }}
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: isDone || isActive ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  {isDone && (
                    <span style={{ color: "var(--emerald)", fontSize: 6 }}>✓</span>
                  )}
                  {isActive && !isDone && (
                    <span
                      className="relative w-1 h-1 rounded-full"
                      style={{ background: "var(--violet)", flexShrink: 0 }}
                    >
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: "var(--violet)", opacity: 0.5 }}
                      />
                    </span>
                  )}
                  <span
                    className="text-[9px] font-semibold leading-none hidden sm:block truncate"
                    style={{
                      color: isActive
                        ? "var(--violet)"
                        : isDone
                        ? "var(--emerald)"
                        : "rgba(255,255,255,0.15)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* XP meter */}
        <div
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0"
          style={{
            background: "rgba(246,196,83,0.07)",
            border: "1px solid rgba(246,196,83,0.2)",
          }}
        >
          <span style={{ color: "var(--gold)", fontSize: 11 }}>⚡</span>
          <div className="flex flex-col items-end">
            <span
              className="font-black tabular-nums leading-none"
              style={{ color: "var(--gold)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            >
              <TickNumber value={xp} />
            </span>
            <span
              className="leading-none hidden sm:block"
              style={{ color: "rgba(255,255,255,0.2)", fontSize: 8, fontFamily: "var(--font-mono)" }}
            >
              {level.split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Streak */}
        <div
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg shrink-0"
          style={{
            background: goldenStreak ? "rgba(251,113,28,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${goldenStreak ? "rgba(251,113,28,0.35)" : "var(--border)"}`,
          }}
        >
          <motion.span
            className="text-sm leading-none"
            animate={streak > 0 ? { scale: [1, 1.35, 1] } : {}}
            transition={{ duration: 0.3, delay: 0.05 }}
            key={streak}
          >
            🔥
          </motion.span>
          <span
            className="font-black tabular-nums"
            style={{
              color: goldenStreak ? "#fb923c" : "rgba(255,255,255,0.5)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          >
            {streak}
          </span>
        </div>

        {/* Sound */}
        <button
          onClick={toggleSound}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            color: soundEnabled ? "var(--cyan)" : "rgba(255,255,255,0.25)",
          }}
          title={soundEnabled ? "Sound on" : "Sound off"}
        >
          {soundEnabled ? <Speaker size={12} /> : <SpeakerOff size={12} />}
        </button>
      </div>
    </header>
  );
}
