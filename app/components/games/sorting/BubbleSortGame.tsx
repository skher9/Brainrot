"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { useHints } from "@/lib/useHints";
import { getModuleConfig } from "@/lib/sorting/gameConfigs";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { getNextModule } from "@/lib/sorting/gameConfigs";
import Section1Visualizer from "@/components/Section1Visualizer";
import Section2Interactive from "@/components/Section2Interactive";
import Section3BeatTheClock from "@/components/Section3BeatTheClock";
import Section4SpotTheBug from "@/components/Section4SpotTheBug";
import Section5BossLevel from "@/components/Section5BossLevel";
import { useRouter } from "next/navigation";

const SLUG = "bubble-sort";
const CONFIG = getModuleConfig(SLUG)!;
const SECTIONS = [
  Section1Visualizer,
  Section2Interactive,
  Section3BeatTheClock,
  Section4SpotTheBug,
  Section5BossLevel,
];
const TOTAL_LEVELS = CONFIG.levels.length;

export default function BubbleSortGame() {
  const router = useRouter();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showStats, setShowStats] = useState(false);
  const [startTime] = useState(Date.now());
  const [ops, setOps] = useState(0);
  const { hintsUsed, useHint } = useHints(SLUG);
  const nextModule = getNextModule(SLUG);

  const ActiveSection = SECTIONS[currentLevel - 1];
  const levelConfig = CONFIG.levels[currentLevel - 1];

  const handleNext = () => {
    if (currentLevel >= TOTAL_LEVELS) {
      setShowStats(true);
    } else {
      setCurrentLevel((l) => l + 1);
    }
  };

  const handlePrev = () => setCurrentLevel((l) => Math.max(1, l - 1));

  const stats: CompletionStats = {
    operationsUsed: ops,
    optimalOperations: 21, // 7-element bubble sort
    timeSeconds: Math.floor((Date.now() - startTime) / 1000),
    hintsUsed,
    moduleName: CONFIG.name,
    moduleSlug: SLUG,
  };

  return (
    <>
      <VisualiserLayout
        title={CONFIG.name}
        category="Sorting"
        slug={SLUG}
        totalSteps={TOTAL_LEVELS}
        currentStep={currentLevel}
        onNext={handleNext}
        onPrev={handlePrev}
        hints={CONFIG.hints}
        hintsUsed={hintsUsed}
        onUseHint={useHint}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLevel}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
          >
            <div style={{ padding: "8px 0" }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em",
                color: "rgba(232,244,255,0.35)", marginBottom: 4,
                paddingLeft: 24,
              }}>
                {levelConfig?.name?.toUpperCase()} · LEVEL {currentLevel}/{TOTAL_LEVELS}
              </div>
            </div>
            <ActiveSection />
          </motion.div>
        </AnimatePresence>
      </VisualiserLayout>

      <AnimatePresence>
        {showStats && (
          <StatsModal
            stats={stats}
            baseXP={levelConfig?.baseXP ?? 50}
            onClose={() => router.push("/")}
            onNextModule={() => nextModule && router.push(`/learn/sorting/${nextModule.slug}`)}
            nextModule={nextModule}
          />
        )}
      </AnimatePresence>
    </>
  );
}
