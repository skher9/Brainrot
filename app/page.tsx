"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { XPProvider, useXP } from "@/lib/xpContext";
import ColdOpen from "@/components/ColdOpen";
import Header from "@/components/Header";
import DailyChallenge from "@/components/DailyChallenge";
import WorldMap from "@/components/WorldMap";
import Section1Visualizer from "@/components/Section1Visualizer";
import Section2Interactive from "@/components/Section2Interactive";
import Section3BeatTheClock from "@/components/Section3BeatTheClock";
import Section4SpotTheBug from "@/components/Section4SpotTheBug";
import Section5BossLevel from "@/components/Section5BossLevel";
import Section6RealWorld from "@/components/Section6RealWorld";
import { AmbientStage, BurstHost } from "@/components/Effects";
import { CursorAurora, Constellation, ToastHost, LiveFeed, TrendingRail, LevelUpFlash } from "@/components/Extras";

const SECTIONS = [
  Section1Visualizer,
  Section2Interactive,
  Section3BeatTheClock,
  Section4SpotTheBug,
  Section5BossLevel,
  Section6RealWorld,
];

/* ── Venn companion mascot (geometric owl) ───────────────── */
function Venn({ hint }: { hint: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hint) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(t);
    }
  }, [hint]);

  return (
    <div className="fixed bottom-20 left-5 z-40 pointer-events-none">
      <AnimatePresence>
        {hint && visible && (
          <motion.div
            initial={{ opacity: 0, x: -16, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex items-end gap-2"
          >
            {/* Speech bubble */}
            <div
              className="max-w-[180px] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed"
              style={{
                background: "rgba(13,13,20,0.95)",
                border: "1px solid rgba(167,139,250,0.25)",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              {hint}
            </div>

            {/* Owl SVG */}
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              {/* Body */}
              <polygon points="18,4 32,28 4,28" fill="rgba(124,58,237,0.2)" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />
              {/* Eyes */}
              <circle cx="13" cy="18" r="4" fill="rgba(13,13,20,0.9)" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
              <circle cx="23" cy="18" r="4" fill="rgba(13,13,20,0.9)" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
              <circle cx="13" cy="18" r="1.8" fill="rgba(167,139,250,0.9)" />
              <circle cx="23" cy="18" r="1.8" fill="rgba(167,139,250,0.9)" />
              {/* Beak */}
              <polygon points="18,20 16,24 20,24" fill="rgba(246,196,83,0.7)" />
              {/* Ear tufts */}
              <polygon points="10,8 8,2 14,7" fill="rgba(124,58,237,0.3)" stroke="rgba(167,139,250,0.3)" strokeWidth="0.5" />
              <polygon points="26,8 22,7 28,2" fill="rgba(124,58,237,0.3)" stroke="rgba(167,139,250,0.3)" strokeWidth="0.5" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const VENN_HINTS = [
  "Hover the bars to see array indices.",
  "Use the step button to go one at a time.",
  "Watch the sorted suffix grow from the right.",
  "The combo meter tracks consecutive swaps.",
  "Fast mode is great for getting the full picture.",
];

function BubbleSortModule() {
  const { currentSection, levelUpEvent, clearLevelUp } = useXP();
  const [showMap, setShowMap] = useState(false);
  const [vennHint, setVennHint] = useState<string | null>(null);
  const [vennIdx, setVennIdx] = useState(0);
  const ActiveSection = SECTIONS[currentSection];

  // Idle hint system: fire a hint if user is idle on section 0
  useEffect(() => {
    if (currentSection !== 0) return;
    const t = setTimeout(() => {
      setVennHint(VENN_HINTS[vennIdx % VENN_HINTS.length]);
      setVennIdx((i) => i + 1);
    }, 12000);
    return () => clearTimeout(t);
  }, [currentSection, vennIdx]);

  return (
    <>
      {/* Global effects */}
      <AmbientStage />
      <BurstHost />
      <CursorAurora />
      <ToastHost />
      <Constellation />

      <div style={{ background: "var(--bg-0)", position: "relative", zIndex: 1 }}>
        <Header onMap={() => setShowMap(true)} />
        <div style={{ paddingTop: "var(--hud-h)" }}>
          {currentSection === 0 && <DailyChallenge />}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <ActiveSection />
            </motion.div>
          </AnimatePresence>

          {/* Trending + live feed below section 0 */}
          {currentSection === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <TrendingRail />
              <div className="max-w-5xl mx-auto px-4 pb-6">
                <LiveFeed />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Level-up flash */}
      <AnimatePresence>
        {levelUpEvent && (
          <LevelUpFlash key={levelUpEvent} level={levelUpEvent} onDone={clearLevelUp} />
        )}
      </AnimatePresence>

      {/* Companion mascot */}
      <Venn hint={vennHint} />

      {/* World Map */}
      <WorldMap open={showMap} onClose={() => setShowMap(false)} />

      <motion.button
        onClick={() => setShowMap(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 40,
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px",
          background: "rgba(7,7,13,0.9)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(167,139,250,0.25)",
          borderRadius: 10,
          color: "#cdb9ff",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.15em",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M10.5 5.5l-2 4.5-4.5 2 2-4.5 4.5-2Z" fill="currentColor"/>
          <circle cx="8" cy="8" r="1" fill="rgba(7,7,13,0.9)"/>
        </svg>
        WORLD MAP
      </motion.button>
    </>
  );
}

export default function Page() {
  const [phase, setPhase] = useState<"cold" | "module">("cold");

  if (phase === "cold") {
    return (
      <>
        <AmbientStage />
        <BurstHost />
        <CursorAurora />
        <Constellation />
        <ColdOpen onStart={() => setPhase("module")} />
      </>
    );
  }

  return (
    <XPProvider>
      <BubbleSortModule />
    </XPProvider>
  );
}
