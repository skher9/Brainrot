"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SCAN } from "@/components/games/tier1/sliding-window/scan/types";
import { SurveillanceRoom, CaseCard } from "@/components/games/tier1/sliding-window/scan/ScanLayout";

/* ── Glitch text for entry title ─────────────────────────── */
function GlitchTitle({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, clipPath: "inset(40% 0 40% 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0% 0 0% 0)" }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: "inline-block" }}
    >
      {text}
    </motion.span>
  );
}

/* ── Progress helper ─────────────────────────────────────── */
function getProgress(slug: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(`sw_${slug}_levels`) ?? "0", 10);
}

function getStatus(done: number, locked: boolean): "available" | "active" | "completed" | "locked" {
  if (locked)    return "locked";
  if (done >= 8) return "completed";
  if (done > 0)  return "active";
  return "available";
}

/* ── Entry screen ────────────────────────────────────────── */
function EntryScreen({ onDone }: { onDone: () => void }) {
  const [showTitle, setShowTitle] = useState(false);
  const [showSub,   setShowSub]   = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowTitle(true), 400);
    const t2 = setTimeout(() => setShowSub(true), 1100);
    const t3 = setTimeout(onDone, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onClick={onDone}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: SCAN.bg,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", overflow: "hidden",
      }}
    >
      {/* Scan-line overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(0deg, ${SCAN.scanLine} 0px, ${SCAN.scanLine} 1px, transparent 1px, transparent 3px)`,
      }} />

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 320 }}>
        <SurveillanceRoom />
      </div>

      {/* Ambient glow */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}
        transition={{ duration: 2 }}
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 45% at 50% 60%, rgba(0,80,40,0.25), transparent 70%)",
        }}
      />

      <div style={{ position: "relative", textAlign: "center", zIndex: 2, padding: "0 20px" }}>
        <AnimatePresence>
          {showTitle && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.38em", color: SCAN.green, marginBottom: 18 }}>
                <GlitchTitle text="REGION III · SLIDING WINDOW" delay={0} />
              </div>
              <h1 style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(38px, 8vw, 78px)",
                fontWeight: 900, letterSpacing: "0.04em",
                color: SCAN.text, marginBottom: 14,
                textShadow: `0 0 40px rgba(0,220,120,0.2)`,
                lineHeight: 1,
              }}>
                <GlitchTitle text="SCANNER" delay={0.1} />
                {" "}
                <GlitchTitle text="DISTRICT" delay={0.22} />
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSub && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: SCAN.textDim, maxWidth: 460, lineHeight: 1.75 }}>
                One window. Slide it. Shrink it. Grow it.
                <br />Never recompute what you already know.
              </p>
              <div style={{ marginTop: 22, fontFamily: "var(--font-mono)", fontSize: 9, color: SCAN.textFaint, letterSpacing: "0.22em" }}>
                TAP TO ENTER
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Corner decorations */}
      {[
        { top: 16, left: 16 }, { top: 16, right: 16 },
        { bottom: 40, left: 16 }, { bottom: 40, right: 16 },
      ].map((pos, i) => (
        <div key={i} style={{
          position: "absolute", ...pos, width: 20, height: 20, pointerEvents: "none",
          borderTop: i < 2 ? `2px solid ${SCAN.green}` : "none",
          borderBottom: i >= 2 ? `2px solid ${SCAN.green}` : "none",
          borderLeft: i % 2 === 0 ? `2px solid ${SCAN.green}` : "none",
          borderRight: i % 2 === 1 ? `2px solid ${SCAN.green}` : "none",
          opacity: 0.4,
        }} />
      ))}
    </motion.div>
  );
}

/* ── Case select screen ──────────────────────────────────── */
function CaseSelectScreen() {
  const router = useRouter();
  const [signalDone,    setSignalDone]    = useState(0);
  const [sushiDone,     setSushiDone]     = useState(0);
  const [broadcastDone, setBroadcastDone] = useState(0);

  useEffect(() => {
    setSignalDone(getProgress("signal-scanner"));
    setSushiDone(getProgress("sushi-belt"));
    setBroadcastDone(getProgress("district-broadcast"));
  }, []);

  const totalDone     = signalDone + sushiDone + broadcastDone;
  const sushiLocked   = signalDone < 8;
  const broadcastLocked = sushiDone < 8;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ minHeight: "100vh", background: SCAN.bg, color: SCAN.text, position: "relative", overflow: "hidden" }}
    >
      {/* Scan-line overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(0deg, ${SCAN.scanLine} 0px, ${SCAN.scanLine} 1px, transparent 1px, transparent 3px)`,
      }} />

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 320, zIndex: 0, pointerEvents: "none" }}>
        <SurveillanceRoom />
      </div>

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, height: 52,
        display: "flex", alignItems: "center", padding: "0 20px",
        background: "rgba(4,12,8,0.94)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${SCAN.border}`,
      }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", cursor: "pointer", color: SCAN.textDim, fontSize: 13, fontFamily: "var(--font-tac)", display: "flex", alignItems: "center", gap: 6 }}
        >
          ← World Map
        </button>
        <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", color: SCAN.textFaint }}>
          REGION III · SCANNER DISTRICT
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: SCAN.amber }}>
          {totalDone} / 24
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "32px 20px 140px" }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ marginBottom: 28, textAlign: "center" }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.3em", color: SCAN.green, marginBottom: 8 }}>
            ◆ SCANNER DISTRICT
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 900, color: SCAN.text, marginBottom: 8 }}>
            ACTIVE CASE FILES
          </h1>
          <p style={{ fontFamily: "var(--font-tac)", fontSize: 14, color: SCAN.textDim, maxWidth: 400, margin: "0 auto" }}>
            Three cases. Fixed windows, variable windows, frequency windows.
            Clear all 24 levels to close Scanner District.
          </p>
        </motion.div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24, padding: "12px 16px", background: "rgba(10,20,16,0.7)", border: `1px solid ${SCAN.border}`, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", color: SCAN.textFaint }}>TOTAL PROGRESS</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: SCAN.amber }}>{totalDone}/24</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${(totalDone / 24) * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${SCAN.green}, ${SCAN.cyan})`, borderRadius: 2 }}
            />
          </div>
        </div>

        {/* Case cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.35 }}>
            <CaseCard
              caseNum="001"
              title="Signal Scanner"
              description="Fixed window. Slide across the signal. Find max, min, target. O(n) — never recompute."
              levelsComplete={signalDone}
              totalLevels={8}
              status={getStatus(signalDone, false)}
              onClick={() => router.push("/learn/tier1/sliding-window/signal-scanner")}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.35 }}>
            <CaseCard
              caseNum="002"
              title="Sushi Belt"
              description="Variable window. Expand right freely. Shrink left when constraint breaks."
              levelsComplete={sushiDone}
              totalLevels={8}
              status={getStatus(sushiDone, sushiLocked)}
              lockTooltip="Complete Signal Scanner to unlock"
              onClick={() => router.push("/learn/tier1/sliding-window/sushi-belt")}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.26, duration: 0.35 }}>
            <CaseCard
              caseNum="003"
              title="District Broadcast"
              description="Frequency window. Match patterns by character count. Find all anagrams."
              levelsComplete={broadcastDone}
              totalLevels={8}
              status={getStatus(broadcastDone, broadcastLocked)}
              lockTooltip="Complete Sushi Belt to unlock"
              onClick={() => router.push("/learn/tier1/sliding-window/district-broadcast")}
            />
          </motion.div>
        </div>

        {totalDone >= 24 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ marginTop: 28, padding: "24px", textAlign: "center", background: "rgba(0,80,40,0.1)", border: `1px solid ${SCAN.green}`, borderRadius: 14 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: SCAN.green, marginBottom: 8 }}>
              DISTRICT CLEARED ✓
            </div>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 14, color: SCAN.textDim, lineHeight: 1.7 }}>
              Fixed windows, variable windows, frequency windows — three lenses on one idea. O(n) always.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function ScannerDistrictPage() {
  const [showEntry, setShowEntry] = useState<boolean | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem("sw_entry_seen");
    setShowEntry(!seen);
    if (!seen) localStorage.setItem("sw_entry_seen", "1");
  }, []);

  if (showEntry === null) return null;

  return (
    <>
      <AnimatePresence>
        {showEntry && <EntryScreen key="entry" onDone={() => setShowEntry(false)} />}
      </AnimatePresence>
      {!showEntry && <CaseSelectScreen />}
    </>
  );
}
