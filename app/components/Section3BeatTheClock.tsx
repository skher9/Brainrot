"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reorder } from "framer-motion";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";
import { Corners, fireBurst } from "@/components/Effects";
import { Check, ArrowRight } from "@/components/Glyphs";
import Confetti from "./Confetti";

const EASY_ARRAY = [1, 3, 2, 4, 6, 5];
const MEDIUM_ARRAY = [4, 1, 6, 2, 5, 3];
const TIME_LIMIT = 60;

const VIS_PALETTE = [
  { top: "#c4b5fd", bot: "#5b21b6", g: "rgba(167,139,250,0.4)" },
  { top: "#a5f3fc", bot: "#0e7490", g: "rgba(103,232,249,0.35)" },
  { top: "#fde68a", bot: "#92400e", g: "rgba(246,196,83,0.4)" },
  { top: "#fda4af", bot: "#9f1239", g: "rgba(251,113,133,0.35)" },
  { top: "#6ee7b7", bot: "#065f46", g: "rgba(110,231,183,0.35)" },
  { top: "#93c5fd", bot: "#1d4ed8", g: "rgba(147,197,253,0.3)" },
];

function isSorted(arr: number[]): boolean {
  return arr.every((v, i) => i === 0 || arr[i - 1] <= v);
}

type GameState = "playing" | "won" | "lost";

export default function Section3BeatTheClock() {
  const { addXP, markComplete, goToSection } = useXP();
  const [attempt, setAttempt] = useState(0);
  const [items, setItems] = useState<number[]>([...EASY_ARRAY]);
  const [paletteMap] = useState<Record<number, { top: string; bot: string; g: string }>>(() => {
    const map: Record<number, { top: string; bot: string; g: string }> = {};
    [...EASY_ARRAY].forEach((v, i) => { map[v] = VIS_PALETTE[i % VIS_PALETTE.length]; });
    return map;
  });
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [points, setPoints] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevItems = useRef<number[]>([...EASY_ARRAY]);
  const maxVal = 6;

  useEffect(() => {
    if (gameState !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); setGameState("lost"); sound.wrong(); return 0; }
        if (t <= 10) sound.tick();
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, attempt]);

  const handleReorder = (newOrder: number[]) => {
    setItems(newOrder);
    let earned = 0;
    newOrder.forEach((v, i) => {
      const wasCorrect = prevItems.current.indexOf(v) === i;
      const nowCorrect = v === i + 1;
      if (nowCorrect && !wasCorrect) { earned += 10; sound.place(); }
    });
    if (earned > 0) { setPoints((p) => p + earned); addXP(earned); }
    prevItems.current = newOrder;
    if (isSorted(newOrder)) { setGameState("won"); markComplete(2); addXP(100); sound.bigWin(); fireBurst(null, 50, "WIN"); }
  };

  const restart = (nextAttempt: number) => {
    const arr = nextAttempt === 0 ? [...EASY_ARRAY] : [...MEDIUM_ARRAY].sort(() => Math.random() - 0.5);
    setItems(arr);
    prevItems.current = arr;
    setTimeLeft(TIME_LIMIT);
    setPoints(0);
    setGameState("playing");
    setAttempt(nextAttempt);
  };

  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 30 ? "#6ee7b7" : timeLeft > 10 ? "#f6c453" : "#fb7185";

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
      {gameState === "won" && <Confetti />}

      {/* Section header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", color: "#f6c453",
            padding: "4px 10px", background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4,
          }}>STAGE 03 / 06</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>ESTIMATED 10 MIN</span>
          <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>REWARD · +100 XP</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1, letterSpacing: "-0.025em", color: "#ebe9e3", marginBottom: 10 }}>
          Beat the clock.
        </h1>
        <p style={{ fontSize: 15, color: "rgba(235,233,227,0.5)", maxWidth: 580, lineHeight: 1.55 }}>
          Drag the bars into sorted order before time runs out.
          {attempt === 0 ? " Starting easy." : " Medium difficulty now."}
        </p>
      </div>

      {/* Timer + Points row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 14px",
          background: "rgba(246,196,83,0.05)",
          border: "1px solid rgba(246,196,83,0.18)",
          borderRadius: 8,
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(235,233,227,0.4)" }}>POINTS</span>
          <AnimatePresence mode="wait">
            <motion.span key={points} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#f6c453" }}>
              {points}
            </motion.span>
          </AnimatePresence>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 14px",
          background: timeLeft <= 10 ? "rgba(251,113,133,0.06)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${timeLeft <= 10 ? "rgba(251,113,133,0.22)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 8,
          transition: "all 0.3s",
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(235,233,227,0.4)" }}>TIME</span>
          <motion.span
            animate={{ scale: timeLeft <= 10 && timeLeft > 0 ? [1, 1.15, 1] : 1 }}
            transition={{ duration: 0.5, repeat: timeLeft <= 10 ? Infinity : 0 }}
            style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: timerColor, transition: "color 0.3s" }}
          >
            {timeLeft}s
          </motion.span>
        </div>

        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.9 }}
            style={{ height: "100%", background: `linear-gradient(90deg, ${timerColor}, ${timerColor}80)`, borderRadius: 2 }}
          />
        </div>
      </div>

      {/* Main game area */}
      <AnimatePresence mode="wait">
        {gameState === "playing" && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ position: "relative" }}>
              <Corners color="rgba(167,139,250,0.4)" size={12} thickness={1.2} />
              <div style={{
                background: "rgba(12,12,20,0.6)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14, padding: "28px 24px",
                position: "relative", overflow: "hidden",
              }}>
                <Reorder.Group
                  axis="x"
                  values={items}
                  onReorder={handleReorder}
                  style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 16, height: 240, listStyle: "none", padding: 0, margin: 0 }}
                >
                  {items.map((val, idx) => {
                    const pal = paletteMap[val] ?? VIS_PALETTE[0];
                    const h = Math.max(20, (val / maxVal) * 210);
                    const correct = val === idx + 1;
                    return (
                      <Reorder.Item
                        key={val}
                        value={val}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "grab", touchAction: "none" }}
                        whileDrag={{ scale: 1.08, zIndex: 10 }}
                      >
                        <div
                          className="bar-base"
                          style={{
                            width: 52, height: h,
                            ["--bc-top" as string]: correct ? "#6ee7b7" : pal.top,
                            ["--bc-bot" as string]: correct ? "#065f46" : pal.bot,
                            ["--bar-glow" as string]: correct ? "18px" : "10px",
                            ["--bar-glow-c" as string]: correct ? "rgba(110,231,183,0.55)" : pal.g,
                            transition: "box-shadow 0.3s",
                          }}
                        />
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: correct ? "#6ee7b7" : "rgba(235,233,227,0.4)" }}>
                          {val}
                        </span>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
                <p style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(235,233,227,0.25)", letterSpacing: "0.2em", marginTop: 16 }}>
                  DRAG BARS LEFT / RIGHT TO SORT
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === "won" && (
          <motion.div key="won" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{ position: "relative" }}>
              <Corners color="rgba(110,231,183,0.4)" size={12} thickness={1.2} />
              <div style={{
                background: "linear-gradient(135deg, rgba(110,231,183,0.08), rgba(167,139,250,0.05))",
                border: "1px solid rgba(110,231,183,0.3)",
                borderRadius: 14, padding: "40px 32px", textAlign: "center",
              }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "#6ee7b7", marginBottom: 12 }}>
                  STAGE CLEARED · +100 XP
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 42, color: "#ebe9e3", marginBottom: 8 }}>
                  Clean sort.
                </h3>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(235,233,227,0.45)", marginBottom: 24 }}>
                  {TIME_LIMIT - timeLeft}s · {points} points
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  {attempt === 0 && (
                    <button onClick={() => restart(1)} className="btn-ghost" style={{ padding: "10px 20px" }}>
                      Try Medium
                    </button>
                  )}
                  <button onClick={() => goToSection(3)} className="btn-primary" style={{ padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 8 }}>
                    Next stage <ArrowRight size={14} color="#fff4d6" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === "lost" && (
          <motion.div key="lost" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{ position: "relative" }}>
              <Corners color="rgba(251,113,133,0.4)" size={12} thickness={1.2} />
              <div style={{
                background: "rgba(251,113,133,0.05)",
                border: "1px solid rgba(251,113,133,0.25)",
                borderRadius: 14, padding: "40px 32px", textAlign: "center",
              }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "#fb7185", marginBottom: 12 }}>
                  TIME EXPIRED
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 42, color: "#ebe9e3", marginBottom: 8 }}>
                  Time&apos;s up.
                </h3>
                <p style={{ fontSize: 13, color: "rgba(235,233,227,0.4)", marginBottom: 24 }}>
                  You had {points} points. Close.
                </p>
                <button onClick={() => restart(attempt)} className="btn-violet" style={{ padding: "10px 24px" }}>
                  Try Again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
