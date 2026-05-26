"use client";

import { AnimatePresence, motion } from "framer-motion";
import { XPProvider, useXP } from "@/lib/xpContext";
import Header from "@/components/Header";
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
  const ActiveSection = SECTIONS[currentSection];

  return (
    <div className="min-h-screen bg-[#08080f]">
      <Header />
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSection}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <ActiveSection />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function Page() {
  return (
    <XPProvider>
      <BubbleSortModule />
    </XPProvider>
  );
}
