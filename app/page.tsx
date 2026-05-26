"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { XPProvider, useXP } from "@/lib/xpContext";
import { createClient } from "@/lib/supabase/client";
import ColdOpen from "@/components/ColdOpen";
import Header from "@/components/Header";
import DailyChallenge from "@/components/DailyChallenge";
import Section1Visualizer from "@/components/Section1Visualizer";
import Section2Interactive from "@/components/Section2Interactive";
import Section3BeatTheClock from "@/components/Section3BeatTheClock";
import Section4SpotTheBug from "@/components/Section4SpotTheBug";
import Section5BossLevel from "@/components/Section5BossLevel";
import Section6RealWorld from "@/components/Section6RealWorld";
import { AmbientStage, BurstHost } from "@/components/Effects";
import { CursorAurora, Constellation, ToastHost, LiveFeed, TrendingRail, LevelUpFlash } from "@/components/Extras";
import Landing from "@/components/Landing";
import AuthModal from "@/components/AuthModal";
import Hub from "@/components/Hub";

const SECTIONS = [
  Section1Visualizer,
  Section2Interactive,
  Section3BeatTheClock,
  Section4SpotTheBug,
  Section5BossLevel,
  Section6RealWorld,
];

const VENN_HINTS = [
  "Hover the bars to see array indices.",
  "Use the step button to go one at a time.",
  "Watch the sorted suffix grow from the right.",
  "The combo meter tracks consecutive swaps.",
  "Fast mode is great for getting the full picture.",
];

function BubbleSortModule({ onHub, onLogout }: { onHub: () => void; onLogout: () => void }) {
  const { currentSection, levelUpEvent, clearLevelUp } = useXP();
  const [vennHint, setVennHint] = useState<string | null>(null);
  const [vennIdx, setVennIdx] = useState(0);
  const ActiveSection = SECTIONS[currentSection];

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
      <AmbientStage />
      <BurstHost />
      <CursorAurora />
      <ToastHost />
      <Constellation />

      <div style={{ background: "var(--bg-0)", position: "relative", zIndex: 1 }}>
        <Header mode="module" onHub={onHub} onLogout={onLogout} />
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

      <AnimatePresence>
        {levelUpEvent && (
          <LevelUpFlash key={levelUpEvent} level={levelUpEvent} onDone={clearLevelUp} />
        )}
      </AnimatePresence>

      {vennHint && (
        <motion.div
          key={vennHint}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          className="fixed bottom-20 left-5 z-40 pointer-events-none"
          style={{ display: "flex", alignItems: "flex-end", gap: 8 }}
        >
          <div style={{
            maxWidth: 180, borderRadius: 12, padding: "10px 14px", fontSize: 12,
            background: "rgba(11,14,31,0.95)", border: "1px solid rgba(0,229,255,0.25)",
            color: "rgba(232,244,255,0.55)",
          }}>
            {vennHint}
          </div>
        </motion.div>
      )}
    </>
  );
}

export default function Page() {
  const [phase, setPhase] = useState<"landing" | "cold" | "hub" | "module">("landing");
  const [authOpen, setAuthOpen] = useState<"login" | "signup" | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Restore session on mount — prevents logout on reload
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPhase("hub");
      setSessionChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setPhase("landing");
    });
    return () => subscription.unsubscribe();
  }, []);

  // Don't flash landing page while checking session
  if (!sessionChecked) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#060814",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-0.02em",
          color: "#00e5ff", opacity: 0.7,
        }}>
          <span style={{ color: "#a78bfa" }}>brain</span>rot
        </div>
      </div>
    );
  }

  if (phase === "landing") {
    return (
      <>
        <AmbientStage />
        <BurstHost />
        <CursorAurora />
        <Constellation />
        <ToastHost />

        <Landing onOpenAuth={(m) => setAuthOpen(m)} />

        <AuthModal
          open={authOpen !== null}
          mode={authOpen ?? "signup"}
          onClose={() => setAuthOpen(null)}
          onSwitch={(m) => setAuthOpen(m)}
          onAuth={() => {
            setAuthOpen(null);
            setPhase("cold");
          }}
        />
      </>
    );
  }

  if (phase === "cold") {
    return (
      <>
        <AmbientStage />
        <BurstHost />
        <CursorAurora />
        <Constellation />
        <ColdOpen onStart={() => setPhase("hub")} />
      </>
    );
  }

  if (phase === "hub") {
    return (
      <XPProvider>
        <>
          <AmbientStage />
          <BurstHost />
          <CursorAurora />
          <ToastHost />
          <Constellation />
          <Hub
            onEnterBubble={() => setPhase("module")}
            onLogout={() => setPhase("landing")}
          />
        </>
      </XPProvider>
    );
  }

  return (
    <XPProvider>
      <BubbleSortModule onHub={() => setPhase("hub")} onLogout={() => setPhase("landing")} />
    </XPProvider>
  );
}
