"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import ScanLayout, { ScanAhaMoment, ScanStarBar } from "../ScanLayout";
import { SCAN, calcStars, calcXP, type StarCount } from "../types";
import { BELT_LEVELS } from "./levels";

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
function playExpand() { playTone(440, "sine", 0.08); }
function playShrink()  { playTone(220, "triangle", 0.1); }
function playWin()     { [660, 880, 1100].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.14), i * 70)); }

/* ── Belt display ────────────────────────────────────────── */
function BeltRow({ chars, left, right, valid, matchHighlights = [] }: {
  chars: string; left: number; right: number; valid: boolean; matchHighlights?: [number, number][];
}) {
  const arr = chars.split("");
  const cellW = Math.min(44, Math.floor(560 / arr.length) - 4);
  const isInMatch = (i: number) => matchHighlights.some(([l, r]) => i >= l && i <= r);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* Pointer labels */}
      <div style={{ display: "flex", gap: 4, height: 20, alignItems: "flex-end" }}>
        {arr.map((_, i) => (
          <div key={i} style={{ width: cellW, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 9, color: i === left ? SCAN.green : i === right ? SCAN.amber : "transparent" }}>
            {i === left && i === right ? "LR" : i === left ? "L" : i === right ? "R" : ""}
          </div>
        ))}
      </div>

      {/* Sushi pieces */}
      <div style={{ display: "flex", gap: 4 }}>
        {arr.map((ch, i) => {
          const inWin  = i >= left && i <= right;
          const isL    = i === left;
          const isR    = i === right;
          const isMatch = isInMatch(i);

          return (
            <motion.div key={i}
              animate={{ scale: inWin ? 1.06 : 1 }}
              transition={{ duration: 0.15 }}
              style={{
                width: cellW, height: cellW, borderRadius: 8,
                background: isMatch
                  ? "rgba(0,220,120,0.22)"
                  : inWin && valid ? "rgba(0,180,100,0.15)" : inWin ? "rgba(220,60,60,0.12)" : "rgba(10,20,16,0.8)",
                border: `${inWin ? 2 : 1}px solid ${
                  isMatch ? SCAN.green
                  : isL && isR ? SCAN.green
                  : isL ? SCAN.green
                  : isR ? SCAN.amber
                  : inWin && valid ? SCAN.borderGreen
                  : inWin ? SCAN.borderRed
                  : SCAN.border
                }`,
                boxShadow: inWin ? `0 0 8px ${valid ? "rgba(0,220,120,0.2)" : "rgba(220,60,60,0.2)"}` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: cellW > 34 ? 16 : 13, fontWeight: 800,
                color: isMatch ? SCAN.green : inWin ? SCAN.text : SCAN.textDim,
              }}
            >
              {ch}
            </motion.div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        {arr.map((_, i) => (
          <div key={i} style={{ width: cellW, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 9, color: SCAN.textFaint }}>
            {i}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Frequency map display ───────────────────────────────── */
function FreqMap({ freq, required }: { freq: Map<string, number>; required?: string }) {
  const entries = Array.from(freq.entries()).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
      {entries.map(([ch, cnt]) => {
        const needed = required?.includes(ch) ?? false;
        return (
          <div key={ch} style={{
            padding: "4px 10px", borderRadius: 6,
            background: needed ? "rgba(0,220,120,0.1)" : "rgba(10,20,16,0.8)",
            border: `1px solid ${needed ? SCAN.borderGreen : SCAN.border}`,
            fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800,
            color: needed ? SCAN.green : SCAN.textDim,
          }}>
            {ch}: {cnt}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function SushiBelt({ levelNum, onComplete, onBack }: Props) {
  const router = useRouter();
  const { addXP } = useXP();
  const cfg = BELT_LEVELS[levelNum - 1];
  if (!cfg) { router.push("/learn/tier1/sliding-window"); return null; }

  const arr = cfg.belt.split("");
  const n = arr.length;

  const [left,  setLeft]  = useState(0);
  const [right, setRight] = useState(-1);
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<"playing" | "aha">("playing");
  const [stars, setStars]   = useState<StarCount>(3);
  const [xpEarned, setXpEarned] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bestLen, setBestLen] = useState(0);
  const [bestWin, setBestWin] = useState<[number, number] | null>(null);
  const [matchHighlights, setMatchHighlights] = useState<[number, number][]>([]);
  const [freq, setFreq] = useState<Map<string, number>>(new Map());
  const [maxFreq, setMaxFreq] = useState(0);
  const fbRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showFb(msg: string) {
    setFeedback(msg);
    if (fbRef.current) clearTimeout(fbRef.current);
    fbRef.current = setTimeout(() => setFeedback(null), 1500);
  }

  function isValid(l: number, r: number, f: Map<string, number>): boolean {
    const { mode, maxTypes, flips, required } = cfg;
    if (mode === "no_repeat" || mode === "no_repeat2") return f.size === r - l + 1;
    if (mode === "two_types") return f.size <= 2;
    if (mode === "k_types") return f.size <= (maxTypes ?? 3);
    if (mode === "all_ones") {
      const zeros = Array.from(f.entries()).filter(([ch]) => ch === "0").reduce((s, [, c]) => s + c, 0);
      return zeros <= (flips ?? 0);
    }
    if (mode === "k_replace") {
      const winSize = r - l + 1;
      const mf = Math.max(...Array.from(f.values()), 0);
      return (winSize - mf) <= (flips ?? 0);
    }
    if (mode === "min_cover" && required) {
      return required.split("").every(ch => (f.get(ch) ?? 0) > 0);
    }
    return true;
  }

  function finalize(totalMoves: number) {
    const s = calcStars(totalMoves, cfg.optimalMoves);
    const xp = calcXP(cfg.xpBase, s);
    setStars(s); setXpEarned(xp);
    addXP(xp);
    onComplete({ stars: s, xpEarned: xp });
    setPhase("aha");
  }

  function expandRight() {
    if (phase !== "playing" || right >= n - 1) return;
    const newR = right + 1;
    const ch = arr[newR];
    const newFreq = new Map(freq);
    newFreq.set(ch, (newFreq.get(ch) ?? 0) + 1);
    const newMoves = moves + 1;
    const valid = isValid(left, newR, newFreq);
    setRight(newR); setFreq(newFreq); setMoves(newMoves);
    playExpand();

    const winLen = newR - left + 1;
    if (valid) {
      if (cfg.mode === "min_cover") {
        if (winLen < bestLen || bestLen === 0) {
          setBestLen(winLen);
          setBestWin([left, newR]);
          showFb(`VALID COVER: ${winLen} chars`);
        } else showFb(`COVER OK: ${winLen}`);
      } else {
        if (winLen > bestLen) {
          setBestLen(winLen);
          setBestWin([left, newR]);
          showFb(`NEW BEST: ${winLen}`);
          playWin();
        } else showFb(`WINDOW: ${winLen}`);
      }
    } else {
      const types = newFreq.size;
      showFb(cfg.mode.includes("type") ? `${types} types — shrink left` : `INVALID — shrink left`);
    }

    if (newR === n - 1 && cfg.mode !== "min_cover") {
      setTimeout(() => finalize(newMoves), 600);
    }
  }

  function shrinkLeft() {
    if (phase !== "playing" || left > right) return;
    const ch = arr[left];
    const newFreq = new Map(freq);
    const cnt = newFreq.get(ch) ?? 0;
    if (cnt <= 1) newFreq.delete(ch); else newFreq.set(ch, cnt - 1);
    const newL = left + 1;
    const newMoves = moves + 1;
    setLeft(newL); setFreq(newFreq); setMoves(newMoves);
    playShrink();
    showFb(`SHRUNK — L now at ${newL}`);
  }

  function handleFinish() {
    if (cfg.mode === "min_cover") {
      finalize(moves);
    }
  }

  const valid = right >= left ? isValid(left, right, freq) : true;
  const winLen = Math.max(0, right - left + 1);

  return (
    <ScanLayout gameName="SUSHI BELT" levelNum={levelNum} xpReward={cfg.xpBase} stars={stars} onBack={onBack}>
      <div style={{ padding: "24px 20px", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 18, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.24em", color: SCAN.greenDim, marginBottom: 6 }}>
            ORDER {levelNum} OF 8
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: SCAN.text, marginBottom: 4 }}>
            {cfg.orderTitle.toUpperCase()}
          </h2>
          <ScanStarBar stars={stars} />
        </div>

        <p style={{ color: SCAN.textDim, textAlign: "center", maxWidth: 460, margin: "0 auto 18px", lineHeight: 1.6, fontSize: 13 }}>
          {cfg.storyBeat}
        </p>

        {/* Stats */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: SCAN.textFaint, marginBottom: 4 }}>WINDOW</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 900, color: valid ? SCAN.green : SCAN.red }}>{winLen}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: SCAN.textFaint, marginBottom: 4 }}>
              {cfg.mode === "min_cover" ? "MIN COVER" : "BEST"}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 900, color: SCAN.amber }}>{bestLen || "—"}</div>
          </div>
          {cfg.maxTypes !== undefined && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: SCAN.textFaint, marginBottom: 4 }}>TYPES / MAX</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 900, color: freq.size > (cfg.maxTypes ?? 0) ? SCAN.red : SCAN.green }}>
                {freq.size}/{cfg.maxTypes}
              </div>
            </div>
          )}
          {cfg.required && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: SCAN.textFaint, marginBottom: 4 }}>NEED</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900, color: SCAN.amber }}>{cfg.required}</div>
            </div>
          )}
        </div>

        {/* Belt */}
        <div style={{ marginBottom: 16, overflowX: "auto" }}>
          <BeltRow chars={cfg.belt} left={left} right={Math.max(left, right)} valid={valid} matchHighlights={bestWin ? [bestWin] : []} />
        </div>

        {/* Freq map */}
        <div style={{ marginBottom: 14, minHeight: 28 }}>
          <FreqMap freq={freq} required={cfg.required} />
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
          L={left} R={right} · MOVES: {moves} · OPTIMAL: {cfg.optimalMoves}
        </div>

        {/* Controls */}
        {phase === "playing" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={expandRight}
              disabled={right >= n - 1}
              style={{
                padding: "11px 22px", borderRadius: 8, cursor: right >= n - 1 ? "not-allowed" : "pointer",
                background: "rgba(0,220,120,0.08)", border: `1px solid ${SCAN.borderGreen}`,
                color: SCAN.green, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.1em", opacity: right >= n - 1 ? 0.35 : 1,
              }}
            >
              EXPAND R →
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={shrinkLeft}
              disabled={left > right}
              style={{
                padding: "11px 22px", borderRadius: 8, cursor: left > right ? "not-allowed" : "pointer",
                background: "rgba(220,180,0,0.06)", border: `1px solid ${SCAN.borderAmber}`,
                color: SCAN.amber, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.1em", opacity: left > right ? 0.35 : 1,
              }}
            >
              ← SHRINK L
            </motion.button>
            {cfg.mode === "min_cover" && valid && (
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={handleFinish}
                style={{
                  padding: "11px 22px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(0,220,120,0.14)", border: `1px solid ${SCAN.green}`,
                  color: SCAN.green, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.1em",
                }}
              >
                ◆ SUBMIT BEST
              </motion.button>
            )}
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
                ? `/learn/tier1/sliding-window/sushi-belt/${next}`
                : "/learn/tier1/sliding-window/sushi-belt"
              );
            }}
          />
        )}
      </AnimatePresence>
    </ScanLayout>
  );
}
