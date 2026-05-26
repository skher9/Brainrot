"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateBubbleSortSteps, SortStep } from "@/lib/bubbleSort";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";
import { Corners } from "@/components/Effects";
import { Play, Pause, StepForward, Reset } from "@/components/Glyphs";

const INITIAL_ARRAY = [64, 34, 25, 12, 22, 11, 90];
const SPEEDS = { slow: 1400, normal: 650, fast: 180 } as const;
type Speed = keyof typeof SPEEDS;

const BAR_BASE: [string, string][] = [
  ["#7c3aed", "#c4b5fd"],
  ["#0e7490", "#67e8f9"],
  ["#b45309", "#fde68a"],
  ["#be123c", "#fda4af"],
  ["#065f46", "#6ee7b7"],
  ["#1d4ed8", "#93c5fd"],
  ["#7c2d12", "#fdba74"],
];

function getBarBg(i: number, state: string): string {
  if (state === "comparing") return "linear-gradient(to top,#92400e,#fbbf24)";
  if (state === "swapping") return "linear-gradient(to top,#9f1239,#f43f5e)";
  if (state === "sorted") return "linear-gradient(to top,#065f46,#34d399)";
  const [from, to] = BAR_BASE[i % BAR_BASE.length];
  return `linear-gradient(to top,${from},${to})`;
}

function getBarGlow(state: string): string {
  if (state === "comparing") return "0 0 20px rgba(251,191,36,0.6)";
  if (state === "swapping") return "0 0 20px rgba(244,63,94,0.65)";
  if (state === "sorted") return "0 0 14px rgba(52,211,153,0.45)";
  return "none";
}

function getBarState(i: number, step: SortStep): string {
  if (step.sortedIndices.includes(i)) return "sorted";
  if (step.comparing) {
    const [a, b] = step.comparing;
    if (i === a || i === b) return step.swapped ? "swapping" : "comparing";
  }
  return "default";
}

/* ── Combo tier ──────────────────────────────────────────── */
type Tier = "COLD" | "WARMING" | "HEATED" | "BLAZE";
function getTier(combo: number): { tier: Tier; color: string; glow: string } {
  if (combo >= 8)  return { tier: "BLAZE",   color: "#fb711c", glow: "0 0 28px rgba(251,113,28,0.7)" };
  if (combo >= 5)  return { tier: "HEATED",  color: "#f6c453", glow: "0 0 20px rgba(246,196,83,0.5)" };
  if (combo >= 3)  return { tier: "WARMING", color: "#a78bfa", glow: "0 0 14px rgba(167,139,250,0.4)" };
  return             { tier: "COLD",    color: "rgba(255,255,255,0.3)", glow: "none" };
}

/* ── Pseudocode lines ────────────────────────────────────── */
const PSEUDO_LINES = [
  { code: "for i in range(n):",         indent: 0 },
  { code: "  for j in range(n-i-1):",   indent: 1 },
  { code: "    if arr[j] > arr[j+1]:",  indent: 2 },
  { code: "      swap(arr[j], arr[j+1])",indent: 3 },
];

function getActiveLine(step: SortStep): number {
  if (!step.comparing) return 0;
  if (step.swapped) return 3;
  return 2;
}

/* ── Coach whispers ──────────────────────────────────────── */
const WHISPERS = [
  "Bubble sort is stable — equal elements keep their relative order.",
  "Worst case: O(n²). Best case (already sorted): O(n).",
  "After each full pass, the largest unsorted element sinks to the end.",
  "The inner loop shrinks each pass — that's the 'sorted suffix' optimization.",
  "In practice, insertion sort beats bubble sort on nearly-sorted data.",
];

export default function Section1Visualizer() {
  const { addXP, markComplete, goToSection } = useXP();
  const [steps] = useState(() => generateBubbleSortSteps(INITIAL_ARRAY));
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [done, setDone] = useState(false);
  const [combo, setCombo] = useState(0);
  const [lastSwap, setLastSwap] = useState(false);
  const [whisperIdx] = useState(() => Math.floor(Math.random() * WHISPERS.length));
  const [tooltip, setTooltip] = useState<{ i: number; val: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxVal = Math.max(...INITIAL_ARRAY);
  const step = steps[idx];
  const activeLine = getActiveLine(step);
  const tierInfo = getTier(combo);

  const advance = useCallback(() => {
    setIdx((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        setPlaying(false);
        setDone(true);
        markComplete(0);
        addXP(50);
        sound.win();
        return prev;
      }
      const s = steps[next];
      if (s.type === "swap") {
        sound.swap();
        setCombo((c) => c + 1);
        setLastSwap(true);
      } else if (s.type === "compare") {
        sound.compare();
        setLastSwap(false);
        setCombo((c) => Math.max(0, c - 1));
      }
      return next;
    });
  }, [steps, addXP, markComplete]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(advance, SPEEDS[speed]);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speed, advance]);

  const reset = () => {
    setPlaying(false);
    setIdx(0);
    setDone(false);
    setCombo(0);
  };

  return (
    <section className="min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="text-xs font-black tracking-widest uppercase px-2.5 py-1 rounded"
              style={{
                color: "var(--violet)",
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(167,139,250,0.2)",
                fontFamily: "var(--font-mono)",
              }}
            >
              01 / 06
            </span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}>
              5 min
            </span>
          </div>
          <h2
            className="text-3xl font-black text-white mb-1 leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Watch it happen.
          </h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Bubble sort live. Each comparison, each swap. Watch the pattern form.
          </p>
        </div>

        {/* 2-column layout */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 280px" }}>
          {/* Main stage */}
          <div>
            {/* Step dots row */}
            <div className="flex items-center gap-1 mb-3 overflow-hidden">
              {steps.slice(0, 40).map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-shrink-0 rounded-full transition-all"
                  style={{
                    width: i === idx ? 12 : 4,
                    background: i < idx
                      ? "rgba(52,211,153,0.6)"
                      : i === idx
                      ? "var(--gold)"
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
              {steps.length > 40 && (
                <span
                  className="text-[9px] ml-1 shrink-0"
                  style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}
                >
                  +{steps.length - 40}
                </span>
              )}
              <span
                className="ml-auto shrink-0 text-[10px] tabular-nums"
                style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}
              >
                {idx + 1}/{steps.length}
              </span>
            </div>

            {/* Bar chart */}
            <div
              className="relative rounded-2xl p-6 mb-3 overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Corners opacity={0.2} />
              <div
                className="absolute inset-0 opacity-[0.025] pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                  backgroundSize: "60px 40px",
                }}
              />
              <div
                className="relative z-10 flex items-end justify-center gap-3"
                style={{ height: 240 }}
              >
                {step.array.map((val, i) => {
                  const state = getBarState(i, step);
                  const height = Math.max(14, (val / maxVal) * 218);
                  const isHovered = tooltip?.i === i;

                  return (
                    <div
                      key={i}
                      className="relative flex flex-col items-center gap-2 cursor-default"
                      onMouseEnter={() => setTooltip({ i, val })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div
                          className="absolute -top-8 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-20"
                          style={{
                            background: "var(--bg-2)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.7)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          [{i}] = {val}
                        </div>
                      )}
                      <motion.div
                        className="bar-base"
                        animate={{
                          height,
                          background: getBarBg(i, state),
                          boxShadow: getBarGlow(state),
                        }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        style={{ width: 46 }}
                      />
                      <span
                        className="text-[11px] font-bold tabular-nums"
                        style={{
                          color: state !== "default"
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(255,255,255,0.2)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step description */}
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14 }}
                className="rounded-xl px-4 py-3 mb-4"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  minHeight: 50,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[9px] font-black tracking-wide uppercase"
                    style={{ color: "rgba(167,139,250,0.6)", fontFamily: "var(--font-mono)" }}
                  >
                    Step {idx + 1}
                  </span>
                  <span
                    className="text-[9px] tabular-nums"
                    style={{ color: "rgba(255,255,255,0.12)", fontFamily: "var(--font-mono)" }}
                  >
                    / {steps.length}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                </div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaying((p) => !p)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.97]"
                style={{
                  background: "var(--violet-dim)",
                  color: "white",
                  boxShadow: "0 0 20px rgba(124,58,237,0.35)",
                }}
              >
                {playing ? <Pause size={13} /> : <Play size={13} />}
                {playing ? "Pause" : "Play"}
              </button>

              <button
                onClick={() => { setPlaying(false); advance(); }}
                disabled={idx >= steps.length - 1}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-[0.97] disabled:opacity-25 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <StepForward size={13} />
                Step
              </button>

              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                <Reset size={13} />
              </button>

              {/* Speed selector */}
              <div
                className="flex items-center overflow-hidden rounded-xl ml-auto"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {(["slow", "normal", "fast"] as Speed[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className="px-3.5 py-2.5 text-sm font-bold transition-all capitalize"
                    style={{
                      background: speed === s ? "var(--violet-dim)" : "transparent",
                      color: speed === s ? "white" : "rgba(255,255,255,0.25)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Complete CTA */}
            <AnimatePresence>
              {done && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative mt-4 p-5 rounded-2xl flex items-center justify-between overflow-hidden"
                  style={{
                    background: "rgba(6,95,70,0.2)",
                    border: "1px solid rgba(52,211,153,0.25)",
                  }}
                >
                  <Corners color="var(--emerald)" opacity={0.35} />
                  <div>
                    <p className="font-black text-sm" style={{ color: "var(--emerald)" }}>
                      Pattern locked in. Now you drive it.
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>
                      +50 XP earned
                    </p>
                  </div>
                  <button
                    onClick={() => goToSection(1)}
                    className="px-5 py-2.5 rounded-xl font-black text-sm transition-all active:scale-[0.97]"
                    style={{
                      background: "#065f46",
                      color: "var(--emerald)",
                      border: "1px solid rgba(52,211,153,0.3)",
                    }}
                  >
                    Next →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Side rail */}
          <div className="flex flex-col gap-3">
            {/* Combo meter */}
            <div
              className="relative rounded-xl p-4 overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: `1px solid ${combo >= 3 ? tierInfo.color + "40" : "rgba(255,255,255,0.06)"}`,
                boxShadow: combo >= 3 ? tierInfo.glow : "none",
                transition: "border-color 0.3s, box-shadow 0.3s",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[9px] tracking-[0.2em] uppercase font-black"
                  style={{
                    color: "rgba(255,255,255,0.2)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Combo
                </span>
                <span
                  className="text-[9px] font-black tracking-widest"
                  style={{
                    color: tierInfo.color,
                    fontFamily: "var(--font-mono)",
                    textShadow: combo >= 3 ? tierInfo.glow : "none",
                  }}
                >
                  {tierInfo.tier}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-black leading-none"
                  style={{
                    fontSize: 36,
                    color: tierInfo.color,
                    fontFamily: "var(--font-mono)",
                    textShadow: combo >= 3 ? tierInfo.glow : "none",
                    transition: "color 0.3s",
                  }}
                >
                  ×{combo}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  swaps
                </span>
              </div>
              {/* Tier bar */}
              <div
                className="mt-2 h-1 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(combo / 10, 1) * 100}%`,
                    background: tierInfo.color,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>

            {/* Pseudocode */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="px-3 py-2 flex items-center gap-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <span
                  className="text-[9px] font-black uppercase tracking-[0.2em]"
                  style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}
                >
                  Pseudocode
                </span>
              </div>
              <div className="p-2">
                {PSEUDO_LINES.map((line, i) => {
                  const isActive = i === activeLine;
                  return (
                    <div
                      key={i}
                      className="px-2 py-1 rounded transition-all"
                      style={{
                        background: isActive ? "rgba(246,196,83,0.07)" : "transparent",
                        borderLeft: isActive ? "2px solid var(--gold)" : "2px solid transparent",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: isActive
                            ? "rgba(255,255,255,0.85)"
                            : "rgba(255,255,255,0.25)",
                          paddingLeft: line.indent * 8,
                          display: "block",
                          whiteSpace: "pre",
                        }}
                      >
                        {line.code}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Telemetry */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="text-[9px] tracking-[0.2em] uppercase font-black mb-2"
                style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}
              >
                Telemetry
              </p>
              {[
                { label: "Pass",       value: step.comparing ? `${Math.floor(idx / (INITIAL_ARRAY.length - 1)) + 1}/${INITIAL_ARRAY.length - 1}` : "-" },
                { label: "Comparisons",value: idx },
                { label: "Sorted",     value: step.sortedIndices.length },
                { label: "Swaps",      value: steps.slice(0, idx + 1).filter((s) => s.type === "swap").length },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-0.5">
                  <span
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.2)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.55)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Coach whisper */}
            <div
              className="rounded-xl p-3.5"
              style={{
                background: "rgba(167,139,250,0.05)",
                border: "1px solid rgba(167,139,250,0.15)",
              }}
            >
              <p
                className="text-[9px] tracking-[0.2em] uppercase font-black mb-1.5"
                style={{ color: "rgba(167,139,250,0.5)", fontFamily: "var(--font-mono)" }}
              >
                Coach
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {WHISPERS[whisperIdx]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
