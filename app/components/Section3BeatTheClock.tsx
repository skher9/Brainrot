"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reorder } from "framer-motion";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";
import Confetti from "./Confetti";

const EASY_ARRAY = [1, 3, 2, 4, 6, 5];
const MEDIUM_ARRAY = [4, 1, 6, 2, 5, 3];
const TIME_LIMIT = 60;

const BAR_COLORS = [
  "linear-gradient(to top, #7c3aed, #a78bfa)",
  "linear-gradient(to top, #0e7490, #22d3ee)",
  "linear-gradient(to top, #b45309, #fbbf24)",
  "linear-gradient(to top, #be123c, #f43f5e)",
  "linear-gradient(to top, #065f46, #34d399)",
  "linear-gradient(to top, #1d4ed8, #60a5fa)",
];

function isSorted(arr: number[]): boolean {
  return arr.every((v, i) => i === 0 || arr[i - 1] <= v);
}

type GameState = "playing" | "won" | "lost";

export default function Section3BeatTheClock() {
  const { addXP, markComplete, goToSection } = useXP();
  const [attempt, setAttempt] = useState(0);
  const [items, setItems] = useState<number[]>([...EASY_ARRAY]);
  const [colorMap] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    [...EASY_ARRAY].forEach((v, i) => { map[v] = BAR_COLORS[i]; });
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
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setGameState("lost");
          sound.wrong();
          return 0;
        }
        if (t <= 10) sound.tick();
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, attempt]);

  const handleReorder = (newOrder: number[]) => {
    setItems(newOrder);
    // Award points for each item now in correct relative position
    let earned = 0;
    newOrder.forEach((v, i) => {
      const wasCorrect = prevItems.current.indexOf(v) === i;
      const nowCorrect = v === i + 1;
      if (nowCorrect && !wasCorrect) { earned += 10; sound.place(); }
    });
    if (earned > 0) {
      setPoints((p) => p + earned);
      addXP(earned);
    }
    prevItems.current = newOrder;

    if (isSorted(newOrder)) {
      setGameState("won");
      markComplete(2);
      addXP(100);
      sound.bigWin();
    }
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

  const timerColor =
    timeLeft > 30 ? "text-emerald-400" : timeLeft > 10 ? "text-yellow-400" : "text-red-400";

  return (
    <section className="min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center px-6 py-10">
      {gameState === "won" && <Confetti />}
      <div className="max-w-3xl w-full">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-black tracking-widest text-yellow-400 uppercase bg-yellow-950/60 px-2.5 py-1 rounded" style={{ fontFamily: "var(--font-mono)", border: "1px solid rgba(250,204,21,0.15)" }}>
              03 / 06
            </span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}>10 min</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-3 leading-tight">
            Beat the clock.
          </h2>
          <p className="text-slate-400 text-sm">
            Drag the bars into sorted order before time runs out.
            {attempt === 0 ? " Starting easy." : " Medium difficulty now."}
          </p>
        </div>

        {/* Timer + Points */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-sm">Points:</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={points}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-yellow-400 font-black text-lg tabular-nums"
              >
                {points}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-sm">Time:</span>
            <motion.span
              className={`font-black text-2xl tabular-nums ${timerColor}`}
              animate={{ scale: timeLeft <= 10 && timeLeft > 0 ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 0.5, repeat: timeLeft <= 10 ? Infinity : 0 }}
            >
              {timeLeft}s
            </motion.span>
          </div>

          {/* Timer bar */}
          <div className="w-32 h-2 bg-[#1c1c3a] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  timeLeft > 30
                    ? "linear-gradient(90deg,#059669,#34d399)"
                    : timeLeft > 10
                    ? "linear-gradient(90deg,#d97706,#fbbf24)"
                    : "linear-gradient(90deg,#be123c,#f43f5e)",
              }}
              animate={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
              transition={{ duration: 0.9 }}
            />
          </div>
        </div>

        {/* Bar chart with reorder */}
        <AnimatePresence mode="wait">
          {gameState === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#12122a] rounded-2xl p-8 border border-[#1c1c3a] mb-4"
            >
              <Reorder.Group
                axis="x"
                values={items}
                onReorder={handleReorder}
                className="flex items-end justify-center gap-3"
                style={{ height: 220 }}
              >
                {items.map((val) => (
                  <Reorder.Item
                    key={val}
                    value={val}
                    className="flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing select-none"
                    style={{ touchAction: "none" }}
                    whileDrag={{
                      scale: 1.08,
                      zIndex: 10,
                      boxShadow: "0 0 24px rgba(124,58,237,0.5)",
                    }}
                  >
                    <motion.div
                      style={{
                        width: 48,
                        height: Math.max(16, (val / maxVal) * 190),
                        background: colorMap[val] ?? BAR_COLORS[0],
                        borderRadius: "6px 6px 3px 3px",
                      }}
                      animate={{
                        borderColor: val === items.indexOf(val) + 1 ? "#34d399" : "transparent",
                      }}
                    />
                    <span className="text-xs font-bold text-slate-500 tabular-nums">
                      {val}
                    </span>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
              <p className="text-center text-slate-600 text-xs mt-4">
                Drag bars left/right to sort them
              </p>
            </motion.div>
          )}

          {gameState === "won" && (
            <motion.div
              key="won"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-950/40 rounded-3xl p-10 border border-emerald-700/40 text-center"
            >
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-3xl font-black text-white mb-2">
                Clean sort. Let&apos;s go harder.
              </h3>
              <p className="text-emerald-400 mb-6 text-sm">
                {TIME_LIMIT - timeLeft}s — {points} points
              </p>
              <div className="flex gap-3 justify-center">
                {attempt === 0 && (
                  <button
                    onClick={() => restart(1)}
                    className="px-6 py-2.5 bg-[#1c1c3a] hover:bg-[#252550] text-white font-bold rounded-xl transition-all border border-[#2a2a4a] text-sm"
                  >
                    Try Medium
                  </button>
                )}
                <button
                  onClick={() => goToSection(3)}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-violet-900/40 text-sm"
                >
                  Next challenge →
                </button>
              </div>
            </motion.div>
          )}

          {gameState === "lost" && (
            <motion.div
              key="lost"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-950/30 rounded-3xl p-10 border border-red-900/40 text-center"
            >
              <div className="text-6xl mb-4">⏰</div>
              <h3 className="text-3xl font-black text-white mb-2">Time&apos;s up.</h3>
              <p className="text-slate-400 mb-6 text-sm">
                Almost. You had {points} points.
              </p>
              <button
                onClick={() => restart(attempt)}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition-all active:scale-95 text-sm"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
