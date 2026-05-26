"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import { Corners } from "@/components/Effects";
import { Bolt, Check, Trophy, Shield, ArrowRight } from "@/components/Glyphs";

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

const CARDS = [
  {
    title: "Why you learned this first",
    accent: "#a78bfa",
    accentBg: "rgba(167,139,250,0.07)",
    accentBorder: "rgba(167,139,250,0.2)",
    tag: "FOUNDATION",
    body: "Bubble sort is the simplest way to understand comparison-based sorting. It makes the core idea obvious — bigger elements \"bubble\" to the top. Once you get this, merge sort and quick sort click faster.",
  },
  {
    title: "Where it actually runs",
    accent: "#67e8f9",
    accentBg: "rgba(103,232,249,0.05)",
    accentBorder: "rgba(103,232,249,0.15)",
    tag: "REAL USAGE",
    body: "Embedded systems with tiny datasets. Sorting a handful of sensor readings on a microcontroller. Nearly-sorted data where it runs close to O(n). Educational tools, obviously. Anywhere n is so small that simplicity beats performance.",
  },
  {
    title: "Why it's slow",
    accent: "#f6c453",
    accentBg: "rgba(246,196,83,0.05)",
    accentBorder: "rgba(246,196,83,0.18)",
    tag: "COMPLEXITY",
    body: "O(n²) time complexity. Sort 100 elements: up to 10,000 comparisons. Sort 10,000 elements: up to 100 million comparisons. Merge sort does the same job in ~130,000. The gap only gets worse as n grows.",
    extra: (
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { n: "100", bubble: "10K", merge: "665" },
          { n: "1,000", bubble: "500K", merge: "10K" },
          { n: "10,000", bubble: "50M", merge: "133K" },
        ].map((row) => (
          <div key={row.n} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 6px", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#ebe9e3", marginBottom: 4 }}>{row.n}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#fb7185", marginBottom: 2 }}>bubble {row.bubble}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#6ee7b7" }}>merge {row.merge}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "What comes next",
    accent: "#6ee7b7",
    accentBg: "rgba(110,231,183,0.05)",
    accentBorder: "rgba(110,231,183,0.18)",
    tag: "LEARNING PATH",
    body: "Selection sort and insertion sort are next. Then merge sort — where you'll see O(n log n) for the first time. Then quicksort, the one actually used in most languages' standard libraries.",
    extra: (
      <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[
          { name: "Selection Sort", done: true },
          { name: "Insertion Sort", done: false },
          { name: "Merge Sort",     done: false },
          { name: "Quick Sort",     done: false },
        ].map((item) => (
          <span key={item.name} style={{
            fontFamily: "var(--font-mono)", fontSize: 10, padding: "3px 8px", borderRadius: 3,
            color: item.done ? "#6ee7b7" : "rgba(235,233,227,0.35)",
            background: item.done ? "rgba(110,231,183,0.08)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${item.done ? "rgba(110,231,183,0.3)" : "rgba(255,255,255,0.08)"}`,
          }}>
            {item.done ? "✓ " : ""}{item.name}
          </span>
        ))}
      </div>
    ),
  },
];

export default function Section6RealWorld() {
  const { goToSection, totalSessionXP, sessionStartTime, sessionAccuracy, bestAccuracy } = useXP();
  const [elapsed, setElapsed] = useState(Date.now() - sessionStartTime);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - sessionStartTime), 1000);
    return () => clearInterval(t);
  }, [sessionStartTime]);

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Section header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", color: "#f6c453", padding: "4px 10px", background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4 }}>STAGE 06 / 06</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>ESTIMATED 5 MIN</span>
          <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.35)", letterSpacing: "0.15em" }}>FINAL STAGE</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1, letterSpacing: "-0.025em", color: "#ebe9e3", marginBottom: 10 }}>
          The bigger picture.
        </h1>
        <p style={{ fontSize: 15, color: "rgba(235,233,227,0.5)", maxWidth: 580, lineHeight: 1.55 }}>
          Bubble sort isn&apos;t something you&apos;ll write in production. It&apos;s something you understand so everything else makes sense.
        </p>
      </div>

      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {CARDS.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.4 }}>
            <div style={{ position: "relative" }}>
              <Corners color={card.accentBorder} size={10} thickness={1} />
              <div style={{
                background: card.accentBg, border: `1px solid ${card.accentBorder}`,
                borderRadius: 14, padding: "22px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: card.accent, opacity: 0.8 }}>
                    {card.tag}
                  </span>
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#ebe9e3", marginBottom: 10, lineHeight: 1.2 }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: 13, color: "rgba(235,233,227,0.5)", lineHeight: 1.6 }}>{card.body}</p>
                {card.extra && card.extra}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Session stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <Corners color="rgba(255,255,255,0.12)" size={10} thickness={1} />
          <div style={{ background: "rgba(12,12,20,0.6)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#ebe9e3" }}>Your session</h3>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "rgba(235,233,227,0.35)" }}>STATS</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              {[
                { icon: <Bolt size={14} color="#f6c453" />, val: `${totalSessionXP} XP`, label: "EARNED TODAY",  color: "#f6c453" },
                { icon: <Check size={14} color="#67e8f9" />, val: formatTime(elapsed),   label: "TIME SPENT",   color: "#67e8f9" },
                { icon: <Trophy size={14} color="#a78bfa" />, val: sessionAccuracy !== null ? `${sessionAccuracy}%` : "—", label: "BOSS ACCURACY", color: "#a78bfa" },
                { icon: <Shield size={14} color="#6ee7b7" />, val: bestAccuracy > 0 ? `${bestAccuracy}%` : "—", label: "PERSONAL BEST", color: "#6ee7b7" },
              ].map((s) => (
                <div key={s.label} style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10, padding: "14px 10px", textAlign: "center",
                }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{s.icon}</div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.val}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.15em", color: "rgba(235,233,227,0.3)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Final win */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <div style={{ position: "relative" }}>
          <Corners color="rgba(167,139,250,0.35)" size={12} thickness={1.2} />
          <div style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(14,116,144,0.06))",
            border: "1px solid rgba(167,139,250,0.2)",
            borderRadius: 14, padding: "40px 32px", textAlign: "center",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", color: "rgba(167,139,250,0.7)", marginBottom: 16 }}>
              MODULE COMPLETE
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 42, color: "#ebe9e3", marginBottom: 12, lineHeight: 1 }}>
              Pattern locked.
            </h3>
            <p style={{ fontSize: 14, color: "rgba(235,233,227,0.45)", maxWidth: 480, margin: "0 auto 8px" }}>
              You watched it, drove it, raced it, debugged it, and owned it. Bubble sort is yours. On to the next one.
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.15em", color: "rgba(235,233,227,0.25)", marginBottom: 28 }}>
              DAILY CHALLENGE DROPS AT MIDNIGHT
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => goToSection(0)} className="btn-ghost" style={{ padding: "10px 22px" }}>
                ↺ Replay module
              </button>
              <button
                className="btn-primary"
                style={{ padding: "10px 22px", display: "inline-flex", alignItems: "center", gap: 8 }}
                onClick={() => {
                  const text = `Just completed Bubble Sort on Brainrot — ${totalSessionXP} XP, ${sessionAccuracy ?? "?"}% accuracy. Rot smarter.`;
                  navigator.clipboard?.writeText(text);
                }}
              >
                Share result <ArrowRight size={14} color="#fff4d6" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
