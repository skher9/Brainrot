"use client";

import { useState } from "react";
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

const SECTIONS = [
  Section1Visualizer,
  Section2Interactive,
  Section3BeatTheClock,
  Section4SpotTheBug,
  Section5BossLevel,
  Section6RealWorld,
];

function BubbleSortModule() {
  const { currentSection } = useXP();
  const [showMap, setShowMap] = useState(false);
  const ActiveSection = SECTIONS[currentSection];

  return (
    <>
      <div className="min-h-screen bg-[#0a0a0f]">
        <Header />

        {/* Daily challenge — only on first section, below fixed header */}
        <div className="pt-[68px]">
          {currentSection === 0 && <DailyChallenge />}
        </div>
        {currentSection !== 0 && <div className="pt-[68px]" />}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
          >
            <ActiveSection />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* World Map overlay */}
      <WorldMap open={showMap} onClose={() => setShowMap(false)} />

      {/* World Map button — fixed bottom right */}
      <motion.button
        onClick={() => setShowMap(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-[#12121a] border border-violet-700/40 rounded-2xl text-violet-400 font-black text-sm hover:border-violet-500/70 transition-colors shadow-xl shadow-violet-900/20 backdrop-blur-sm"
      >
        🗺️ <span className="hidden sm:inline">World Map</span>
      </motion.button>
    </>
  );
}

export default function Page() {
  const [phase, setPhase] = useState<"cold" | "module">("cold");

  if (phase === "cold") {
    return <ColdOpen onStart={() => setPhase("module")} />;
  }

  return (
    <XPProvider>
      <BubbleSortModule />
    </XPProvider>
  );
}
