"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import ScanLayout, { ScanAhaMoment, ScanStarBar } from "../ScanLayout";
import { SCAN, calcStars, calcXP, type StarCount } from "../types";
import { SIGNAL_LEVELS } from "./levels";

interface Props {
  levelNum: number;
  onComplete: (r: { stars: StarCount; xpEarned: number }) => void;
  onBack?: () => void;
}

function playTone(f: number, t: OscillatorType = "sine", d = 0.1) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = t; osc.frequency.value = f;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
    osc.start(); osc.stop(ctx.currentTime + d);
  } catch {}
}
function playSlide() { playTone(380, "sine", 0.08); }
function playMatch() { [660, 880, 1100].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.15), i * 70)); }

/* ── Signal array display ────────────────────────────────── */
function SignalRow({ arr, winStart, winSize, matchedWindows = [] }: {
  arr: number[]; winStart: number; winSize: number; matchedWindows?: number[];
}) {
  const winEnd = winStart + winSize - 1;
  const cellW = Math.min(52, Math.floor(560 / arr.length) - 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* Window bracket */}
      <div style={{ display: "flex", gap: 4, height: 18, alignItems: "flex-end" }}>
        {arr.map((_, i) => {
          const inWin = i >= winStart && i <= winEnd;
          return (
            <div key={i} style={{ width: cellW, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              {inWin && (
                <div style={{
                  width: cellW - 4, height: i === winStart || i === winEnd ? 14 : 8,
                  borderTop: `2px solid ${SCAN.green}`,
                  borderLeft: i === winStart ? `2px solid ${SCAN.green}` : "none",
                  borderRight: i === winEnd ? `2px solid ${SCAN.green}` : "none",
                  boxShadow: `0 0 6px rgba(0,220,120,0.3)`,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Cells */}
      <div style={{ display: "flex", gap: 4 }}>
        {arr.map((val, i) => {
          const inWin = i >= winStart && i <= winEnd;
          const isMatched = matchedWindows.includes(i);

          return (
            <motion.div key={i}
              animate={{ scale: inWin ? 1.05 : 1 }}
              transition={{ duration: 0.18 }}
              style={{
                width: cellW, height: cellW, borderRadius: 6,
                background: isMatched
                  ? "rgba(0,220,120,0.22)"
                  : inWin ? "rgba(0,180,100,0.14)" : "rgba(10,20,16,0.8)",
                border: `${inWin ? 2 : 1}px solid ${isMatched ? SCAN.green : inWin ? SCAN.borderGreen : SCAN.border}`,
                boxShadow: inWin ? `0 0 10px rgba(0,220,120,0.2)` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: cellW > 40 ? 15 : 12,
                fontWeight: 800, color: isMatched ? SCAN.green : inWin ? SCAN.text : SCAN.textDim,
              }}
            >
              {val}
            </motion.div>
          );
        })}
      </div>

      {/* Index labels */}
      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        {arr.map((_, i) => (
          <div key={i} style={{ width: cellW, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 9, color: SCAN.textFaint }}>
            [{i}]
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function SignalScanner({ levelNum, onComplete, onBack }: Props) {
  const router = useRouter();
  const { addXP } = useXP();
  const cfg = SIGNAL_LEVELS[levelNum - 1];
  if (!cfg) { router.push("/learn/tier1/sliding-window"); return null; }

  const n = cfg.array.length;
  const maxStart = n - cfg.windowSize;

  const [winStart, setWinStart] = useState(0);
  const [steps, setSteps] = useState(0);
  const [phase, setPhase] = useState<"playing" | "won" | "aha">("playing");
  const [stars, setStars] = useState<StarCount>(3);
  const [xpEarned, setXpEarned] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [matchedWindows, setMatchedWindows] = useState<number[]>([]);
  const [matchCount, setMatchCount] = useState(0);

  const fbRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showFb(msg: string) {
    setFeedback(msg);
    if (fbRef.current) clearTimeout(fbRef.current);
    fbRef.current = setTimeout(() => setFeedback(null), 1600);
  }

  const windowSum = useCallback(() => {
    return cfg.array.slice(winStart, winStart + cfg.windowSize).reduce((a, b) => a + b, 0);
  }, [cfg.array, winStart, cfg.windowSize]);

  const windowProduct = useCallback(() => {
    return cfg.array.slice(winStart, winStart + cfg.windowSize).reduce((a, b) => a * b, 1);
  }, [cfg.array, winStart, cfg.windowSize]);

  const windowZeros = useCallback(() => {
    return cfg.array.slice(winStart, winStart + cfg.windowSize).filter(v => v === 0).length;
  }, [cfg.array, winStart, cfg.windowSize]);

  function getTargetValue(): number {
    if (cfg.mode === "fixed_product") return windowProduct();
    return windowSum();
  }

  function getBestValue(): number {
    let best = cfg.mode === "fixed_min" ? Infinity : -Infinity;
    for (let s = 0; s <= maxStart; s++) {
      const sum = cfg.array.slice(s, s + cfg.windowSize).reduce((a, b) => a + b, 0);
      if (cfg.mode === "fixed_min") best = Math.min(best, sum);
      else best = Math.max(best, sum);
    }
    return best;
  }

  function finalize(totalSteps: number) {
    const s = calcStars(totalSteps, cfg.optimalSteps);
    const xp = calcXP(cfg.xpBase, s);
    setStars(s); setXpEarned(xp);
    addXP(xp);
    onComplete({ stars: s, xpEarned: xp });
    setPhase("aha");
  }

  function slide(dir: "left" | "right") {
    if (phase !== "playing") return;
    const newStart = dir === "right" ? winStart + 1 : winStart - 1;
    if (newStart < 0 || newStart > maxStart) return;
    setWinStart(newStart);
    const newSteps = steps + 1;
    setSteps(newSteps);
    playSlide();

    const sum = cfg.array.slice(newStart, newStart + cfg.windowSize).reduce((a, b) => a + b, 0);

    if (cfg.mode === "fixed_target" && sum === cfg.target) {
      playMatch();
      showFb(`TARGET LOCKED — SUM ${sum}`);
      setTimeout(() => finalize(newSteps), 800);
    } else if (cfg.mode === "fixed_count" && sum > (cfg.threshold ?? 0)) {
      playMatch();
      const newCount = matchCount + 1;
      setMatchCount(newCount);
      setMatchedWindows(prev => [...prev, newStart]);
      showFb(`MATCH ${newCount} — SUM ${sum} > ${cfg.threshold}`);
      if (newStart === maxStart) setTimeout(() => finalize(newSteps), 600);
    } else if ((cfg.mode === "fixed_average") && (sum / cfg.windowSize) > (cfg.threshold ?? 0)) {
      playMatch();
      const newCount = matchCount + 1;
      setMatchCount(newCount);
      setMatchedWindows(prev => [...prev, newStart]);
      showFb(`AVG ${(sum / cfg.windowSize).toFixed(1)} > ${cfg.threshold}`);
      if (newStart === maxStart) setTimeout(() => finalize(newSteps), 600);
    } else if (cfg.mode === "fixed_zeros") {
      const zeros = cfg.array.slice(newStart, newStart + cfg.windowSize).filter(v => v === 0).length;
      showFb(zeros <= 2 ? `VALID — ${zeros} zeros flipped` : `INVALID — ${zeros} zeros (max 2)`);
      if (newStart === maxStart) setTimeout(() => finalize(newSteps), 600);
    } else {
      if (newStart === maxStart && (cfg.mode === "fixed_max" || cfg.mode === "fixed_min" || cfg.mode === "fixed_product")) {
        setTimeout(() => finalize(newSteps), 600);
      } else {
        showFb(`SUM: ${sum}`);
      }
    }
  }

  function handleBossComplete() {
    finalize(steps + 1);
  }

  const sum = windowSum();
  const avg = (sum / cfg.windowSize).toFixed(1);
  const zeros = windowZeros();

  return (
    <ScanLayout gameName="SIGNAL SCANNER" levelNum={levelNum} xpReward={cfg.xpBase} stars={stars} onBack={onBack}>
      <div style={{ padding: "24px 20px", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 18, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.24em", color: SCAN.greenDim, marginBottom: 6 }}>
            SIGNAL {levelNum} OF 8
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: SCAN.text, marginBottom: 4 }}>
            {cfg.signalTitle.toUpperCase()}
          </h2>
          <ScanStarBar stars={stars} />
        </div>

        <p style={{ color: SCAN.textDim, textAlign: "center", maxWidth: 460, margin: "0 auto 20px", lineHeight: 1.6, fontSize: 13 }}>
          {cfg.storyBeat}
        </p>

        {/* Stats row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: SCAN.textFaint, marginBottom: 4 }}>WINDOW SIZE</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 900, color: SCAN.amber }}>{cfg.windowSize}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: SCAN.textFaint, marginBottom: 4 }}>
              {cfg.mode === "fixed_product" ? "PRODUCT" : cfg.mode === "fixed_average" ? "AVERAGE" : "SUM"}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 900, color: SCAN.green }}>
              {cfg.mode === "fixed_product" ? windowProduct() : cfg.mode === "fixed_average" ? avg : sum}
            </div>
          </div>
          {cfg.target !== undefined && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: SCAN.textFaint, marginBottom: 4 }}>TARGET</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 900, color: SCAN.amber }}>{cfg.target}</div>
            </div>
          )}
          {cfg.threshold !== undefined && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: SCAN.textFaint, marginBottom: 4 }}>THRESHOLD</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 900, color: SCAN.amber }}>{cfg.threshold}</div>
            </div>
          )}
          {cfg.mode === "fixed_count" || cfg.mode === "fixed_average" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: SCAN.textFaint, marginBottom: 4 }}>MATCHES</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 900, color: SCAN.green }}>{matchCount}</div>
            </div>
          ) : null}
        </div>

        {/* Signal array */}
        <div style={{ marginBottom: 24, overflowX: "auto" }}>
          <SignalRow arr={cfg.array} winStart={winStart} winSize={cfg.windowSize} matchedWindows={matchedWindows} />
        </div>

        {/* Position indicator */}
        <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: SCAN.textFaint, marginBottom: 16, letterSpacing: "0.12em" }}>
          WINDOW [{winStart}…{winStart + cfg.windowSize - 1}] · STEPS: {steps} · OPTIMAL: {cfg.optimalSteps}
        </div>

        {/* Feedback */}
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div key={feedback}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center", marginBottom: 12, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: SCAN.green }}
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        {phase === "playing" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => slide("left")}
              disabled={winStart <= 0}
              style={{
                padding: "12px 28px", borderRadius: 8, cursor: winStart <= 0 ? "not-allowed" : "pointer",
                background: "rgba(0,220,120,0.08)", border: `1px solid ${SCAN.borderGreen}`,
                color: SCAN.green, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                letterSpacing: "0.1em", opacity: winStart <= 0 ? 0.35 : 1,
              }}
            >
              ← SLIDE LEFT
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => slide("right")}
              disabled={winStart >= maxStart}
              style={{
                padding: "12px 28px", borderRadius: 8, cursor: winStart >= maxStart ? "not-allowed" : "pointer",
                background: "rgba(0,220,120,0.08)", border: `1px solid ${SCAN.borderGreen}`,
                color: SCAN.green, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                letterSpacing: "0.1em", opacity: winStart >= maxStart ? 0.35 : 1,
              }}
            >
              SLIDE RIGHT →
            </motion.button>
          </div>
        )}

        {/* Scan complete button for count/average modes */}
        {phase === "playing" && (cfg.mode === "fixed_count" || cfg.mode === "fixed_average" || cfg.mode === "fixed_zeros") && winStart === maxStart && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => finalize(steps)}
              style={{
                padding: "10px 24px", borderRadius: 8, cursor: "pointer",
                background: "rgba(0,220,120,0.14)", border: `1px solid ${SCAN.green}`,
                color: SCAN.green, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.1em",
              }}
            >
              ◆ SCAN COMPLETE
            </motion.button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {phase === "aha" && (
          <ScanAhaMoment
            title={cfg.ahaTitle}
            body={cfg.ahaBody}
            complexity="O(n)"
            onContinue={() => {
              const next = levelNum + 1;
              router.push(next <= 8
                ? `/learn/tier1/sliding-window/signal-scanner/${next}`
                : "/learn/tier1/sliding-window/signal-scanner"
              );
            }}
          />
        )}
      </AnimatePresence>
    </ScanLayout>
  );
}
