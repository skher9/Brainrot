"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import ScanLayout, { ScanAhaMoment, ScanStarBar } from "../ScanLayout";
import { SCAN, calcStars, calcXP, type StarCount } from "../types";
import { BROADCAST_LEVELS } from "./levels";

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
    g.gain.setValueAtTime(0.14, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
    osc.start(); osc.stop(ctx.currentTime + d);
  } catch {}
}
function playSlide()  { playTone(380, "sine", 0.07); }
function playHit()    { [700, 900].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.12), i * 60)); }

/* ── Build frequency map from string ────────────────────── */
function buildFreq(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of s) m.set(ch, (m.get(ch) ?? 0) + 1);
  return m;
}

function freqEquals(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

function freqContains(win: Map<string, number>, pattern: Map<string, number>): boolean {
  for (const [k, v] of pattern) if ((win.get(k) ?? 0) < v) return false;
  return true;
}

/* ── Source display ──────────────────────────────────────── */
function SourceRow({ source, winStart, winSize, matches = [] }: {
  source: string; winStart: number; winSize: number; matches?: number[];
}) {
  const arr = source.split("");
  const winEnd = winStart + winSize - 1;
  const cellW = Math.min(40, Math.floor(540 / arr.length) - 4);
  const isMatch = (i: number) => matches.includes(i);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Window indicator */}
      <div style={{ display: "flex", gap: 4, height: 16, alignItems: "flex-end" }}>
        {arr.map((_, i) => {
          const inWin = i >= winStart && i <= winEnd;
          return (
            <div key={i} style={{ width: cellW }}>
              {inWin && i === winStart && (
                <div style={{ height: 12, borderTop: `2px solid ${SCAN.green}`, borderLeft: `2px solid ${SCAN.green}`, boxShadow: `0 0 5px rgba(0,220,120,0.3)` }} />
              )}
              {inWin && i > winStart && i < winEnd && (
                <div style={{ height: 8, borderTop: `2px solid ${SCAN.green}` }} />
              )}
              {inWin && i === winEnd && winEnd !== winStart && (
                <div style={{ height: 12, borderTop: `2px solid ${SCAN.green}`, borderRight: `2px solid ${SCAN.green}`, boxShadow: `0 0 5px rgba(0,220,120,0.3)` }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {arr.map((ch, i) => {
          const inWin  = i >= winStart && i <= winEnd;
          const matched = isMatch(i);
          return (
            <motion.div key={i}
              animate={{ scale: inWin ? 1.06 : 1 }}
              transition={{ duration: 0.15 }}
              style={{
                width: cellW, height: cellW, borderRadius: 6,
                background: matched ? "rgba(0,220,120,0.22)" : inWin ? "rgba(0,160,90,0.13)" : "rgba(10,20,16,0.8)",
                border: `${inWin ? 2 : 1}px solid ${matched ? SCAN.green : inWin ? SCAN.borderGreen : SCAN.border}`,
                boxShadow: matched ? `0 0 8px rgba(0,220,120,0.3)` : inWin ? `0 0 6px rgba(0,220,120,0.12)` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: cellW > 30 ? 14 : 11, fontWeight: 800,
                color: matched ? SCAN.green : inWin ? SCAN.text : SCAN.textDim,
              }}
            >
              {ch}
            </motion.div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        {arr.map((_, i) => (
          <div key={i} style={{ width: cellW, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 8, color: SCAN.textFaint }}>{i}</div>
        ))}
      </div>
    </div>
  );
}

/* ── Freq comparison display ─────────────────────────────── */
function FreqCompare({ winFreq, patFreq, label = "WINDOW" }: {
  winFreq: Map<string, number>; patFreq: Map<string, number>; label?: string;
}) {
  const allKeys = new Set([...patFreq.keys(), ...winFreq.keys()]);
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
      {Array.from(allKeys).sort().map(ch => {
        const w = winFreq.get(ch) ?? 0;
        const p = patFreq.get(ch) ?? 0;
        const match = w >= p && p > 0;
        const extra = p === 0 && w > 0;
        return (
          <div key={ch} style={{
            padding: "4px 10px", borderRadius: 6, textAlign: "center",
            background: match ? "rgba(0,220,120,0.1)" : extra ? "rgba(10,20,16,0.8)" : "rgba(220,60,60,0.08)",
            border: `1px solid ${match ? SCAN.borderGreen : extra ? SCAN.border : SCAN.borderRed}`,
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 900, color: match ? SCAN.green : extra ? SCAN.textDim : SCAN.red }}>{ch}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: SCAN.textFaint }}>{w}/{p > 0 ? p : "—"}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function DistrictBroadcast({ levelNum, onComplete, onBack }: Props) {
  const router = useRouter();
  const { addXP } = useXP();
  const cfg = BROADCAST_LEVELS[levelNum - 1];
  if (!cfg) { router.push("/learn/tier1/sliding-window"); return null; }

  const src = cfg.source;
  const pat = cfg.pattern;
  const n = src.length;
  const k = pat.length;
  const maxStart = n - k;
  const patFreq = buildFreq(pat);

  const [winStart, setWinStart] = useState(0);
  const [steps, setSteps] = useState(0);
  const [winFreq, setWinFreq] = useState<Map<string, number>>(() => buildFreq(src.slice(0, k)));
  const [phase, setPhase] = useState<"playing" | "aha">("playing");
  const [stars, setStars]   = useState<StarCount>(3);
  const [xpEarned, setXpEarned] = useState(0);
  const [matchPositions, setMatchPositions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bestStart, setBestStart] = useState<number | null>(null);

  const fbRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showFb(msg: string) {
    setFeedback(msg);
    if (fbRef.current) clearTimeout(fbRef.current);
    fbRef.current = setTimeout(() => setFeedback(null), 1500);
  }

  function checkWindow(start: number, freq: Map<string, number>): boolean {
    const { mode, threshold } = cfg;
    if (mode === "freq_match" || mode === "first_anagram" || mode === "count_anagrams") {
      return freqEquals(freq, patFreq);
    }
    if (mode === "freq_contain") return freqContains(freq, patFreq);
    if (mode === "freq_threshold") {
      const maxF = Math.max(...Array.from(freq.values()), 0);
      return maxF >= (threshold ?? 3);
    }
    if (mode === "freq_k_replace") {
      const ws = k;
      const mf = Math.max(...Array.from(freq.values()), 0);
      return (ws - mf) <= (threshold ?? 2);
    }
    return false;
  }

  function finalize(totalSteps: number) {
    const s = calcStars(totalSteps, cfg.optimalSteps);
    const xp = calcXP(cfg.xpBase, s);
    setStars(s); setXpEarned(xp);
    addXP(xp);
    onComplete({ stars: s, xpEarned: xp });
    setPhase("aha");
  }

  function slideWindow(dir: "left" | "right") {
    if (phase !== "playing") return;
    const newStart = dir === "right" ? winStart + 1 : winStart - 1;
    if (newStart < 0 || newStart > maxStart) return;

    const newFreq = new Map(winFreq);
    if (dir === "right") {
      const removing = src[winStart];
      const adding   = src[winStart + k];
      const rc = newFreq.get(removing) ?? 0;
      if (rc <= 1) newFreq.delete(removing); else newFreq.set(removing, rc - 1);
      newFreq.set(adding, (newFreq.get(adding) ?? 0) + 1);
    } else {
      const removing = src[winStart + k - 1];
      const adding   = src[newStart];
      const rc = newFreq.get(removing) ?? 0;
      if (rc <= 1) newFreq.delete(removing); else newFreq.set(removing, rc - 1);
      newFreq.set(adding, (newFreq.get(adding) ?? 0) + 1);
    }

    const newSteps = steps + 1;
    setWinStart(newStart); setWinFreq(newFreq); setSteps(newSteps);
    playSlide();

    const isMatch = checkWindow(newStart, newFreq);
    if (isMatch) {
      playHit();
      if (cfg.mode === "first_anagram") {
        showFb(`FIRST ANAGRAM AT [${newStart}]`);
        setTimeout(() => finalize(newSteps), 700);
        return;
      } else if (cfg.mode === "freq_match" || cfg.mode === "count_anagrams") {
        setMatchPositions(prev => prev.includes(newStart) ? prev : [...prev, newStart]);
        showFb(`MATCH AT [${newStart}]`);
      } else if (cfg.mode === "freq_contain") {
        if (bestStart === null || k < k) {
          setBestStart(newStart);
        }
        showFb(`CONTAINS PATTERN AT [${newStart}]`);
      } else {
        showFb(`VALID WINDOW AT [${newStart}]`);
        setMatchPositions(prev => prev.includes(newStart) ? prev : [...prev, newStart]);
      }
    } else {
      showFb(`[${newStart}] — no match`);
    }

    if (newStart === maxStart) {
      setTimeout(() => finalize(newSteps), 700);
    }
  }

  const isCurrentMatch = checkWindow(winStart, winFreq);
  const matchedCellIndices = matchPositions.flatMap(pos => Array.from({ length: k }, (_, i) => pos + i));

  return (
    <ScanLayout gameName="DISTRICT BROADCAST" levelNum={levelNum} xpReward={cfg.xpBase} stars={stars} onBack={onBack}>
      <div style={{ padding: "24px 20px", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 18, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.24em", color: SCAN.greenDim, marginBottom: 6 }}>
            BROADCAST {levelNum} OF 8
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: SCAN.text, marginBottom: 4 }}>
            {cfg.channelTitle.toUpperCase()}
          </h2>
          <ScanStarBar stars={stars} />
        </div>

        <p style={{ color: SCAN.textDim, textAlign: "center", maxWidth: 460, margin: "0 auto 18px", lineHeight: 1.6, fontSize: 13 }}>
          {cfg.storyBeat}
        </p>

        {/* Pattern display */}
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: SCAN.textFaint, marginBottom: 6 }}>PATTERN</div>
            <div style={{ display: "flex", gap: 4 }}>
              {pat.split("").map((ch, i) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(0,220,120,0.1)", border: `1px solid ${SCAN.borderGreen}`,
                  fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: SCAN.green,
                }}>
                  {ch}
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: SCAN.textFaint, marginBottom: 6 }}>MATCHES</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 900, color: SCAN.amber }}>
              {matchPositions.length}
            </div>
          </div>
        </div>

        {/* Source */}
        <div style={{ marginBottom: 16, overflowX: "auto" }}>
          <SourceRow source={src} winStart={winStart} winSize={k} matches={matchedCellIndices} />
        </div>

        {/* Freq comparison */}
        <div style={{ marginBottom: 14 }}>
          <FreqCompare winFreq={winFreq} patFreq={patFreq} />
        </div>

        {/* Match status */}
        <div style={{
          textAlign: "center", marginBottom: 12, padding: "6px 0",
          fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em",
          color: isCurrentMatch ? SCAN.green : SCAN.textFaint,
        }}>
          {isCurrentMatch ? "◆ FREQUENCY MATCH" : "○ NO MATCH"}
        </div>

        {/* Feedback */}
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div key={feedback}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center", marginBottom: 10, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: SCAN.green }}
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: SCAN.textFaint, marginBottom: 14, letterSpacing: "0.1em" }}>
          WINDOW [{winStart}…{winStart + k - 1}] · STEPS: {steps} · OPTIMAL: {cfg.optimalSteps}
        </div>

        {/* Controls */}
        {phase === "playing" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => slideWindow("left")}
              disabled={winStart <= 0}
              style={{
                padding: "11px 22px", borderRadius: 8, cursor: winStart <= 0 ? "not-allowed" : "pointer",
                background: "rgba(0,220,120,0.07)", border: `1px solid ${SCAN.borderGreen}`,
                color: SCAN.green, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.1em", opacity: winStart <= 0 ? 0.35 : 1,
              }}
            >
              ← SLIDE LEFT
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => slideWindow("right")}
              disabled={winStart >= maxStart}
              style={{
                padding: "11px 22px", borderRadius: 8, cursor: winStart >= maxStart ? "not-allowed" : "pointer",
                background: "rgba(0,220,120,0.07)", border: `1px solid ${SCAN.borderGreen}`,
                color: SCAN.green, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.1em", opacity: winStart >= maxStart ? 0.35 : 1,
              }}
            >
              SLIDE RIGHT →
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
                ? `/learn/tier1/sliding-window/district-broadcast/${next}`
                : "/learn/tier1/sliding-window/district-broadcast"
              );
            }}
          />
        )}
      </AnimatePresence>
    </ScanLayout>
  );
}
