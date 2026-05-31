"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SCAN, type StarCount } from "@/components/games/tier1/sliding-window/scan/types";
import { SurveillanceRoom, ScanStarBar } from "@/components/games/tier1/sliding-window/scan/ScanLayout";
import { BROADCAST_LEVELS } from "@/components/games/tier1/sliding-window/scan/district-broadcast/levels";

const SLUG = "district-broadcast";

function readStars(): StarCount[] {
  if (typeof window === "undefined") return Array(8).fill(0) as StarCount[];
  try {
    const raw = JSON.parse(localStorage.getItem(`sw_${SLUG}_stars`) ?? "[]") as number[];
    const out: StarCount[] = Array(8).fill(0);
    for (let i = 0; i < 8; i++) out[i] = (Math.max(0, Math.min(3, raw[i] ?? 0))) as StarCount;
    return out;
  } catch { return Array(8).fill(0) as StarCount[]; }
}

function isUnlocked(stars: StarCount[], lvl: number): boolean {
  return lvl === 1 || stars[lvl - 2] > 0;
}

export default function DistrictBroadcastSelect() {
  const router = useRouter();
  const [stars, setStars] = useState<StarCount[]>(Array(8).fill(0) as StarCount[]);

  useEffect(() => { setStars(readStars()); }, []);

  const done = stars.filter(s => s > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ minHeight: "100vh", background: SCAN.bg, color: SCAN.text, position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: `repeating-linear-gradient(0deg, ${SCAN.scanLine} 0px, ${SCAN.scanLine} 1px, transparent 1px, transparent 3px)` }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 320, zIndex: 0, pointerEvents: "none" }}>
        <SurveillanceRoom />
      </div>

      <div style={{
        position: "sticky", top: 0, zIndex: 50, height: 52,
        display: "flex", alignItems: "center", padding: "0 20px",
        background: "rgba(4,12,8,0.94)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${SCAN.border}`,
      }}>
        <button
          onClick={() => router.push("/learn/tier1/sliding-window")}
          style={{ background: "none", border: "none", cursor: "pointer", color: SCAN.textDim, fontSize: 13, fontFamily: "var(--font-tac)" }}
        >
          ← Scanner District
        </button>
        <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", color: SCAN.textFaint }}>
          CASE FILE #003 · DISTRICT BROADCAST
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: SCAN.amber }}>{done}/8</div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", padding: "32px 20px 140px" }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ marginBottom: 28, textAlign: "center" }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.3em", color: SCAN.green, marginBottom: 8 }}>◆ DISTRICT BROADCAST</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, color: SCAN.text, marginBottom: 16 }}>SELECT CHANNEL</h1>

          <div style={{ padding: "12px 16px", background: "rgba(10,20,16,0.7)", border: `1px solid ${SCAN.border}`, borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", color: SCAN.textFaint }}>CHANNELS DECODED</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: SCAN.amber }}>{done}/8</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${(done / 8) * 100}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                style={{ height: "100%", background: `linear-gradient(90deg, ${SCAN.green}, ${SCAN.cyan})`, borderRadius: 2 }}
              />
            </div>
          </div>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {BROADCAST_LEVELS.map((lvl, i) => {
            const n = lvl.level;
            const s = stars[n - 1];
            const unlocked = isUnlocked(stars, n);
            const completed = s > 0;
            const isNext = unlocked && !completed;

            return (
              <motion.button
                key={n}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.28 }}
                whileHover={unlocked ? { y: -3, boxShadow: `0 8px 24px rgba(0,0,0,0.6)` } : {}}
                whileTap={unlocked ? { scale: 0.97 } : {}}
                onClick={() => unlocked && router.push(`/learn/tier1/sliding-window/district-broadcast/${n}`)}
                style={{
                  textAlign: "left", padding: "16px", borderRadius: 10,
                  background: completed ? "rgba(0,80,40,0.1)" : isNext ? "rgba(0,60,30,0.1)" : "rgba(6,14,10,0.6)",
                  border: `1px solid ${completed ? "rgba(0,220,120,0.4)" : isNext ? SCAN.borderGreen : SCAN.border}`,
                  boxShadow: isNext ? `0 0 14px rgba(0,220,120,0.08)` : "none",
                  cursor: unlocked ? "pointer" : "not-allowed",
                  opacity: unlocked ? 1 : 0.3,
                  position: "relative", overflow: "hidden",
                }}
              >
                {!unlocked && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SCAN.textFaint} strokeWidth="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                )}
                {unlocked && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
                        color: completed ? SCAN.green : isNext ? SCAN.green : SCAN.textFaint,
                        background: completed ? "rgba(0,220,120,0.1)" : isNext ? "rgba(0,220,120,0.08)" : "transparent",
                        padding: "2px 6px", borderRadius: 4,
                      }}>
                        {String(n).padStart(2, "0")}
                      </span>
                      {completed && <ScanStarBar stars={s} size={12} />}
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: SCAN.text, marginBottom: 6, lineHeight: 1.3 }}>
                      {lvl.channelTitle}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: SCAN.amber }}>+{lvl.xpBase} XP</span>
                      {isNext && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: SCAN.green, letterSpacing: "0.12em" }}>DECODE →</span>}
                      {completed && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: SCAN.green }}>DECODED</span>}
                    </div>
                  </>
                )}
              </motion.button>
            );
          })}
        </div>

        {done >= 8 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ marginTop: 28, padding: "20px 24px", textAlign: "center", background: "rgba(0,80,40,0.1)", border: `1px solid ${SCAN.green}`, borderRadius: 14 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 900, color: SCAN.green, marginBottom: 6 }}>CASE FILE 003 CLOSED ✓</div>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 13, color: SCAN.textDim, lineHeight: 1.7 }}>
              Frequency maps + sliding window = O(n) for every anagram, pattern-match, and frequency query.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
