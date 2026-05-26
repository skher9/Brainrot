"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sound } from "@/lib/sound";
import { useXP } from "@/lib/xpContext";
import { Corners, fireBurst } from "@/components/Effects";
import { Check, ArrowRight, Trophy, Bolt, Flame } from "@/components/Glyphs";
import Confetti from "./Confetti";

interface Comparison { j: number; shouldSwap: boolean; explanation: string; }

function buildComparisons(arr: number[]): Comparison[] {
  const a = [...arr]; const n = a.length; const result: Comparison[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      const x = a[j], y = a[j + 1];
      result.push({ j, shouldSwap: x > y, explanation: x > y ? `${x} > ${y} — bigger number goes right. Swap.` : `${x} ≤ ${y} — already in order. Keep.` });
      if (x > y) [a[j], a[j + 1]] = [a[j + 1], a[j]];
    }
  }
  return result;
}

function shuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function isSorted(arr: number[]): boolean { return arr.every((v, i) => i === 0 || arr[i - 1] <= v); }

interface RoundConfig { label: string; pattern: string; patternDesc: string; buildArray: () => number[]; }

const ROUND_CONFIGS: RoundConfig[] = [
  { label: "Round 1", pattern: "Random",        patternDesc: "Random 4-element array. Get your bearings.",                  buildArray: () => shuffle([10, 25, 40, 55]) },
  { label: "Round 2", pattern: "Nearly Sorted", patternDesc: "Almost in order — just 1-2 elements out of place.",           buildArray: () => [10, 40, 25, 55, 70] },
  { label: "Round 3", pattern: "Worst Case",    patternDesc: "Fully reversed. Every single comparison needs a swap.",       buildArray: () => [70, 55, 40, 30, 20, 10] },
  { label: "Round 4", pattern: "Duplicates",    patternDesc: "Equal elements never swap — ≤ not <. Watch your edge cases.", buildArray: () => shuffle([20, 20, 10, 40, 20, 30]) },
  { label: "Round 5", pattern: "Random (Hard)", patternDesc: "Larger 7-element random array. Full boss difficulty.",        buildArray: () => shuffle([5, 15, 25, 35, 45, 55, 65]) },
];

const TOTAL_ROUNDS = ROUND_CONFIGS.length;

const VIS_PALETTE = [
  { top: "#c4b5fd", bot: "#5b21b6", g: "rgba(167,139,250,0.4)" },
  { top: "#a5f3fc", bot: "#0e7490", g: "rgba(103,232,249,0.35)" },
  { top: "#fde68a", bot: "#92400e", g: "rgba(246,196,83,0.4)" },
  { top: "#fda4af", bot: "#9f1239", g: "rgba(251,113,133,0.35)" },
  { top: "#6ee7b7", bot: "#065f46", g: "rgba(110,231,183,0.35)" },
  { top: "#93c5fd", bot: "#1d4ed8", g: "rgba(147,197,253,0.3)" },
  { top: "#fed7aa", bot: "#7c2d12", g: "rgba(254,215,170,0.3)" },
];

type Feedback = "correct" | "wrong" | null;

export default function Section5BossLevel() {
  const { addXP, markComplete, goToSection, streak, totalSessionXP, setSessionAccuracy } = useXP();
  const [roundNum, setRoundNum] = useState(0);
  const [roundArrays] = useState<number[][]>(() => ROUND_CONFIGS.map((c) => c.buildArray()));
  const [array, setArray] = useState<number[]>(() => [...roundArrays[0]]);
  const [comparisons, setComparisons] = useState<Comparison[]>(() => buildComparisons([...roundArrays[0]]));
  const [cIdx, setCIdx] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [roundWrong, setRoundWrong] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [explanation, setExplanation] = useState("");
  const [roundDone, setRoundDone] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const lockRef = useRef(false);

  const maxVal = Math.max(...array);
  const current = comparisons[cIdx];
  const totalComparisons = comparisons.length;
  const progress = cIdx / totalComparisons;

  const getBarState = useCallback((i: number): string => {
    if (!current) return isSorted(array) ? "sorted" : "default";
    if (feedback && (i === current.j || i === current.j + 1)) return feedback === "correct" ? "swapping" : "default";
    if (i === current.j || i === current.j + 1) return "comparing";
    return "default";
  }, [current, feedback, array]);

  const answer = (userSaysSwap: boolean) => {
    if (lockRef.current || feedback !== null || !current) return;
    lockRef.current = true;
    const isCorrect = userSaysSwap === current.shouldSwap;
    setExplanation(current.explanation);
    if (isCorrect) {
      setFeedback("correct"); setRoundScore((s) => s + 1); setTotalScore((s) => s + 1);
      addXP(20); sound.correct(); sound.xp();
      if (current.shouldSwap) setArray((prev) => { const a = [...prev]; [a[current.j], a[current.j + 1]] = [a[current.j + 1], a[current.j]]; return a; });
    } else {
      setFeedback("wrong"); setRoundWrong((w) => w + 1); setTotalWrong((w) => w + 1);
      sound.wrong(); setShaking(true); setTimeout(() => setShaking(false), 400);
      if (current.shouldSwap) setArray((prev) => { const a = [...prev]; [a[current.j], a[current.j + 1]] = [a[current.j + 1], a[current.j]]; return a; });
    }
    setTimeout(() => {
      setFeedback(null); lockRef.current = false;
      const next = cIdx + 1;
      if (next >= comparisons.length) { setRoundDone(true); sound.win(); }
      else { setCIdx(next); }
    }, 1400);
  };

  const startNextRound = () => {
    const next = roundNum + 1;
    if (next >= TOTAL_ROUNDS) {
      markComplete(4); addXP(150); setAllDone(true);
      setTimeout(() => { sound.chord(); setTimeout(() => setShowCard(true), 400); }, 2000);
      return;
    }
    const nextArr = roundArrays[next];
    setRoundNum(next); setArray([...nextArr]); setComparisons(buildComparisons([...nextArr]));
    setCIdx(0); setRoundScore(0); setRoundWrong(0); setRoundDone(false);
  };

  const allComparisons = ROUND_CONFIGS.reduce((sum, _, i) => sum + buildComparisons([...roundArrays[i]]).length, 0);

  useEffect(() => {
    if (allDone) { const acc = Math.round((totalScore / allComparisons) * 100); setSessionAccuracy(acc); }
  }, [allDone, totalScore, allComparisons, setSessionAccuracy]);

  if (allDone) {
    const accuracy = Math.round((totalScore / allComparisons) * 100);
    const shareText = `I just beat Bubble Sort (Boss Mode) on Brainrot\n\n⚡ ${totalSessionXP} XP earned\n🎯 ${accuracy}% accuracy\n🔥 ${streak} day streak\n\nRot smarter → brainrot.dev`;
    const handleShare = async () => {
      try {
        if (navigator.share) await navigator.share({ text: shareText });
        else { await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2000); }
      } catch {}
    };

    return (
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
        <Confetti />
        <div style={{ maxWidth: 520, margin: "40px auto 0" }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "#f6c453", marginBottom: 16 }}>BOSS MODE COMPLETE</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "#ebe9e3", lineHeight: 1, marginBottom: 8 }}>
              {accuracy >= 90 ? "Flawless." : accuracy >= 75 ? "Solid." : accuracy >= 60 ? "Getting there." : "Keep going."}
            </h2>
            <p style={{ fontSize: 13, color: "rgba(235,233,227,0.4)" }}>
              {totalScore}/{allComparisons} correct across {TOTAL_ROUNDS} rounds — {accuracy}%
            </p>
          </motion.div>

          <AnimatePresence>
            {showCard && (
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <div style={{ position: "relative", marginBottom: 16 }}>
                  <Corners color="rgba(167,139,250,0.4)" size={12} thickness={1.2} />
                  <div style={{
                    background: "linear-gradient(135deg, rgba(12,12,20,0.95), rgba(20,10,40,0.9))",
                    border: "1px solid rgba(167,139,250,0.25)",
                    borderRadius: 16, padding: "24px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>
                        <span style={{ color: "#a78bfa" }}>brain</span>
                        <span style={{ color: "#ebe9e3" }}>rot</span>
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(235,233,227,0.35)" }}>BOSS MODE COMPLETE</span>
                    </div>
                    <p style={{ fontSize: 15, color: "#ebe9e3", fontWeight: 600, marginBottom: 20, lineHeight: 1.4 }}>
                      I just beat Bubble Sort (Boss Mode) on Brainrot
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                      {[
                        { glyph: <Bolt size={14} color="#f6c453" />, val: `${totalSessionXP} XP`, label: "EARNED" },
                        { glyph: <Check size={14} color="#6ee7b7" />, val: `${accuracy}%`, label: "ACCURACY" },
                        { glyph: <Flame size={14} color="#fb7185" />, val: `${streak}`, label: "DAY STREAK" },
                      ].map((s) => (
                        <div key={s.label} style={{
                          background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 8px", textAlign: "center",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{s.glyph}</div>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "#ebe9e3" }}>{s.val}</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.15em", color: "rgba(235,233,227,0.35)", marginTop: 2 }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textAlign: "center", color: "rgba(235,233,227,0.25)", letterSpacing: "0.2em" }}>ROT SMARTER.</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={handleShare} className="btn-ghost" style={{ flex: 1, padding: "12px", justifyContent: "center" }}>
                    {copied ? "✓ Copied" : "Share result →"}
                  </button>
                  <button onClick={() => goToSection(5)} className="btn-primary" style={{ flex: 1, padding: "12px", justifyContent: "center" }}>
                    Finish <ArrowRight size={14} color="#fff4d6" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showCard && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
              style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(235,233,227,0.3)", letterSpacing: "0.4em" }}>
              · · ·
            </motion.p>
          )}
        </div>
      </section>
    );
  }

  const config = ROUND_CONFIGS[roundNum];

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Section header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", color: "#f6c453", padding: "4px 10px", background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4 }}>STAGE 05 / 06</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>ESTIMATED 15 MIN</span>
          <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>REWARD · +150 XP</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1, letterSpacing: "-0.025em", color: "#ebe9e3", marginBottom: 10 }}>
          Boss level.
        </h1>
        <p style={{ fontSize: 15, color: "rgba(235,233,227,0.5)", maxWidth: 580, lineHeight: 1.55 }}>
          Drive every sort from start to finish. {TOTAL_ROUNDS} rounds, increasing difficulty.
        </p>
      </div>

      {/* Round progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 20 }}>
        {ROUND_CONFIGS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, transition: "all 0.3s", background: i < roundNum ? "#6ee7b7" : i === roundNum ? "#fb7185" : "rgba(255,255,255,0.06)" }} />
        ))}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", marginLeft: 8 }}>
          Round {roundNum + 1}/{TOTAL_ROUNDS}
        </span>
      </div>

      {/* Pattern badge */}
      <AnimatePresence mode="wait">
        <motion.div key={roundNum} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          style={{
            marginBottom: 20, padding: "14px 18px",
            background: "rgba(12,12,20,0.6)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.15em", color: "#fb7185" }}>{config.label.toUpperCase()}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(235,233,227,0.5)" }}>
              {config.pattern}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "rgba(235,233,227,0.4)" }}>{config.patternDesc}</p>
        </motion.div>
      </AnimatePresence>

      {/* Round complete interstitial */}
      <AnimatePresence>
        {roundDone && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              marginBottom: 20, padding: "16px 18px",
              background: "rgba(110,231,183,0.07)", border: "1px solid rgba(110,231,183,0.25)",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 13, color: "#6ee7b7", fontWeight: 700, marginBottom: 2 }}>
                {config.label} done.{" "}
                <span style={{ fontWeight: 400, color: "rgba(235,233,227,0.45)" }}>{roundScore}/{totalComparisons} correct</span>
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)" }}>
                {roundNum + 1 < TOTAL_ROUNDS ? `Next: ${ROUND_CONFIGS[roundNum + 1].pattern}` : "Final round complete!"}
              </p>
            </div>
            <button onClick={startNextRound} className="btn-primary" style={{ padding: "10px 18px", marginLeft: 16, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
              {roundNum + 1 < TOTAL_ROUNDS ? "Next round" : "Finish"}
              <ArrowRight size={14} color="#fff4d6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress within round */}
      {!roundDone && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
            <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.3 }}
              style={{ height: "100%", background: "linear-gradient(90deg,#a78bfa,#fb7185)" }} />
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)" }}>{cIdx}/{totalComparisons}</span>
        </div>
      )}

      {/* Bar chart */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Corners color="rgba(167,139,250,0.4)" size={12} thickness={1.2} />
        <div className={shaking ? "shake" : ""} style={{
          background: "rgba(12,12,20,0.6)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14, padding: "28px 24px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 14, height: 200 }}>
            {array.map((val, i) => {
              const state = getBarState(i);
              const palette = VIS_PALETTE[i % VIS_PALETTE.length];
              const height = Math.max(16, (val / maxVal) * 178);
              let top = palette.top, bot = palette.bot, g = palette.g, glow = 10;
              if (state === "sorted")    { top = "#6ee7b7"; bot = "#065f46"; g = "rgba(110,231,183,0.55)"; glow = 18; }
              if (state === "comparing") { top = "#fde68a"; bot = "#92400e"; g = "rgba(246,196,83,0.7)";   glow = 24; }
              if (state === "swapping")  { top = "#fda4af"; bot = "#9f1239"; g = "rgba(251,113,133,0.65)"; glow = 22; }
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div className="bar-base" style={{
                    width: 46, height,
                    ["--bc-top" as string]: top, ["--bc-bot" as string]: bot,
                    ["--bar-glow" as string]: glow + "px", ["--bar-glow-c" as string]: g,
                    transition: "height 0.3s cubic-bezier(.16,1,.3,1), box-shadow 0.3s",
                  }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: state === "comparing" ? "#f6c453" : state === "sorted" ? "#6ee7b7" : "rgba(235,233,227,0.35)" }}>{val}</span>
                </div>
              );
            })}
          </div>
          {current && !roundDone && (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "#ebe9e3" }}>
                <span style={{ color: "#f6c453" }}>{array[current.j]}</span>
                <span style={{ color: "rgba(235,233,227,0.25)", margin: "0 16px", fontSize: 16 }}>vs</span>
                <span style={{ color: "#f6c453" }}>{array[current.j + 1]}</span>
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.12em", marginTop: 6 }}>
                POSITION {current.j} AND {current.j + 1}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              padding: "12px 18px", borderRadius: 10, marginBottom: 14, fontSize: 13,
              background: feedback === "correct" ? "rgba(110,231,183,0.07)" : "rgba(251,113,133,0.07)",
              border: `1px solid ${feedback === "correct" ? "rgba(110,231,183,0.3)" : "rgba(251,113,133,0.3)"}`,
              color: feedback === "correct" ? "#6ee7b7" : "#fb7185",
            }}
          >
            {feedback === "correct" ? "✓ " : "✗ "}{explanation}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swap / Keep buttons */}
      {!roundDone && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={() => answer(true)} disabled={feedback !== null} className="btn-violet"
            style={{ padding: "16px", fontSize: 15, justifyContent: "center", opacity: feedback !== null ? 0.4 : 1 }}>
            ↕ Swap
          </button>
          <button onClick={() => answer(false)} disabled={feedback !== null} className="btn-ghost"
            style={{ padding: "16px", fontSize: 15, justifyContent: "center", opacity: feedback !== null ? 0.4 : 1 }}>
            → Keep
          </button>
        </div>
      )}

      {/* Score */}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 32 }}>
        {[
          { label: "THIS ROUND", value: roundScore, color: "#6ee7b7" },
          { label: "TOTAL", value: totalScore, color: "#a78bfa" },
          { label: "WRONG", value: totalWrong, color: "#fb7185" },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.2em", color: "rgba(235,233,227,0.3)", marginBottom: 2 }}>{s.label}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
