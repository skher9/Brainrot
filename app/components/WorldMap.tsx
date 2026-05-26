"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Level {
  name: string;
  unlocked: boolean;
  current?: boolean;
}

interface Zone {
  name: string;
  icon: string;
  accent: string;
  border: string;
  glow: string;
  levels: Level[];
}

const ZONES: Zone[] = [
  {
    name: "Sorting Village",
    icon: "🏘️",
    accent: "text-violet-400",
    border: "border-violet-700/40",
    glow: "shadow-violet-900/40",
    levels: [
      { name: "Bubble Sort", unlocked: true, current: true },
      { name: "Selection Sort", unlocked: false },
      { name: "Insertion Sort", unlocked: false },
      { name: "Merge Sort", unlocked: false },
    ],
  },
  {
    name: "Search Mountains",
    icon: "⛰️",
    accent: "text-cyan-400",
    border: "border-cyan-900/40",
    glow: "shadow-cyan-900/20",
    levels: [
      { name: "Linear Search", unlocked: false },
      { name: "Binary Search", unlocked: false },
      { name: "Jump Search", unlocked: false },
      { name: "Interpolation", unlocked: false },
    ],
  },
  {
    name: "Tree Forest",
    icon: "🌲",
    accent: "text-emerald-400",
    border: "border-emerald-900/40",
    glow: "shadow-emerald-900/20",
    levels: [
      { name: "Binary Tree", unlocked: false },
      { name: "BST", unlocked: false },
      { name: "AVL Tree", unlocked: false },
      { name: "Heap", unlocked: false },
      { name: "Trie", unlocked: false },
    ],
  },
  {
    name: "Graph Dungeon",
    icon: "🕸️",
    accent: "text-pink-400",
    border: "border-pink-900/40",
    glow: "shadow-pink-900/20",
    levels: [
      { name: "Graph Basics", unlocked: false },
      { name: "BFS", unlocked: false },
      { name: "DFS", unlocked: false },
      { name: "Dijkstra", unlocked: false },
      { name: "A*", unlocked: false },
    ],
  },
  {
    name: "System Design Castle",
    icon: "🏰",
    accent: "text-amber-400",
    border: "border-amber-900/40",
    glow: "shadow-amber-900/20",
    levels: [
      { name: "Caching", unlocked: false },
      { name: "Load Balancing", unlocked: false },
      { name: "Databases", unlocked: false },
      { name: "Message Queues", unlocked: false },
      { name: "CDNs", unlocked: false },
    ],
  },
  {
    name: "AI Realm",
    icon: "🤖",
    accent: "text-blue-400",
    border: "border-blue-900/40",
    glow: "shadow-blue-900/20",
    levels: [
      { name: "Neural Nets", unlocked: false },
      { name: "Backprop", unlocked: false },
      { name: "Transformers", unlocked: false },
      { name: "Embeddings", unlocked: false },
    ],
  },
];

export default function WorldMap({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);

  const handleLocked = () => {
    setLockedMsg("Coming soon. Keep rotting.");
    setTimeout(() => setLockedMsg(null), 1800);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] bg-[#0a0a0f]/95 backdrop-blur-xl overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur border-b border-[#1c1c3a] px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-white font-black text-xl">World Map</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Your learning journey. One concept at a time.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1c1c3a] border border-[#2a2a4a] hover:border-red-700/60 text-slate-400 hover:text-red-400 transition-colors text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {/* Zones */}
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
            {ZONES.map((zone, zi) => (
              <motion.div
                key={zone.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: zi * 0.06, duration: 0.4 }}
                className={`rounded-2xl border bg-[#12121a] p-5 ${zone.border}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{zone.icon}</span>
                  <div>
                    <h3 className={`font-black text-base ${zone.accent}`}>
                      {zone.name}
                    </h3>
                    <p className="text-slate-600 text-xs">
                      {zone.levels.filter((l) => l.unlocked).length}/
                      {zone.levels.length} unlocked
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  {zone.levels.map((lvl) => (
                    <button
                      key={lvl.name}
                      onClick={lvl.unlocked ? undefined : handleLocked}
                      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                        lvl.current
                          ? `bg-violet-600/20 border-violet-500/60 text-violet-300 shadow-lg shadow-violet-900/30`
                          : lvl.unlocked
                          ? `bg-emerald-900/20 border-emerald-700/40 text-emerald-400 hover:border-emerald-500`
                          : `bg-[#0d0d14] border-[#1c1c3a] text-slate-700 cursor-default`
                      }`}
                    >
                      {lvl.current && (
                        <motion.span
                          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-400"
                          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                      {!lvl.unlocked && (
                        <span className="text-slate-700 text-xs">🔒</span>
                      )}
                      {lvl.unlocked && !lvl.current && (
                        <span className="text-emerald-500 text-xs">✓</span>
                      )}
                      {lvl.current && (
                        <span className="text-violet-400 text-xs">▶</span>
                      )}
                      {lvl.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Locked level toast */}
          <AnimatePresence>
            {lockedMsg && (
              <motion.div
                initial={{ opacity: 0, y: 12, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, y: 12, x: "-50%" }}
                className="fixed bottom-8 left-1/2 bg-[#1c1c3a] border border-[#2a2a4a] rounded-xl px-5 py-3 text-slate-300 text-sm font-medium shadow-xl"
              >
                {lockedMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
