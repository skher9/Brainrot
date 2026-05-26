"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import WorldMap from "@/components/WorldMap";
import { Bolt, Flame, ArrowRight, Compass, Trophy, Star } from "@/components/Glyphs";
import { TickNumber } from "@/components/Effects";

const SORT_TOPICS = [
  {
    id: "bubble-sort",
    name: "Bubble Sort",
    sub: "ENTRY · 6 STAGES",
    desc: "The classic. Adjacent swaps, growing sorted suffix. Learn to see patterns in chaos.",
    xp: 250,
    accent: "#a78bfa",
    deep: "#5b21b6",
    label: "ENTRY",
    internal: true,
  },
  {
    id: "selection-sort",
    name: "Selection Sort",
    sub: "TIER I · SORTING",
    desc: "Find the minimum, place it. Fewest swaps of any O(n²) sort.",
    xp: 280,
    accent: "#00e5ff",
    deep: "#0369a1",
    label: "TIER I",
    internal: false,
  },
  {
    id: "insertion-sort",
    name: "Insertion Sort",
    sub: "TIER I · SORTING",
    desc: "Build the sorted array one card at a time. Adaptive and online.",
    xp: 280,
    accent: "#6ee7b7",
    deep: "#065f46",
    label: "TIER I",
    internal: false,
  },
  {
    id: "merge-sort",
    name: "Merge Sort",
    sub: "TIER II · SORTING",
    desc: "Divide and conquer. Guaranteed O(n log n). The stable workhorse.",
    xp: 360,
    accent: "#fb7185",
    deep: "#9f1239",
    label: "TIER II",
    internal: false,
  },
  {
    id: "quick-sort",
    name: "Quick Sort",
    sub: "TIER II · SORTING",
    desc: "Pivot, partition, recurse. Cache-friendly and blazingly fast in practice.",
    xp: 360,
    accent: "#f6c453",
    deep: "#92400e",
    label: "TIER II",
    internal: false,
  },
] as const;

const COMING_SOON = [
  {
    id: "search",
    name: "Search Mountains",
    sub: "REGION II",
    desc: "Binary search, interpolation, jump search.",
    accent: "#67e8f9",
    icon: "⛰",
  },
  {
    id: "trees",
    name: "Tree Forest",
    sub: "REGION III",
    desc: "BST, AVL, Heap, Trie — branching logic.",
    accent: "#6ee7b7",
    icon: "🌲",
  },
  {
    id: "graphs",
    name: "Graph Dungeon",
    sub: "REGION IV",
    desc: "BFS, DFS, Dijkstra, A* — navigate the dark.",
    accent: "#fb7185",
    icon: "🕸",
  },
  {
    id: "design",
    name: "System Design Castle",
    sub: "REGION V",
    desc: "Caching, load balancing, databases at scale.",
    accent: "#f6c453",
    icon: "🏰",
  },
  {
    id: "ai",
    name: "AI Realm",
    sub: "REGION VI",
    desc: "Neural nets, backprop, transformers, embeddings.",
    accent: "#93c5fd",
    icon: "⚡",
  },
];

function SortCard({
  topic,
  onEnterBubble,
}: {
  topic: typeof SORT_TOPICS[number];
  onEnterBubble: () => void;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (topic.internal) {
      onEnterBubble();
    } else {
      router.push(`/learn/${topic.id}`);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      style={{
        textAlign: "left",
        padding: "24px",
        background: hovered
          ? `linear-gradient(135deg, ${topic.accent}14, ${topic.deep}28)`
          : `linear-gradient(135deg, ${topic.accent}08, ${topic.deep}14)`,
        border: `1px solid ${hovered ? topic.accent + "60" : topic.accent + "28"}`,
        borderRadius: 14,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      {/* Subtle grid bg */}
      <div style={{
        position: "absolute", inset: 0, opacity: hovered ? 0.04 : 0.02,
        backgroundImage: `linear-gradient(${topic.accent}40 1px, transparent 1px), linear-gradient(90deg, ${topic.accent}40 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
        pointerEvents: "none",
        transition: "opacity 0.2s",
      }} />

      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.22em",
        color: topic.accent, marginBottom: 10, opacity: 0.8,
      }}>
        {topic.sub}
      </div>

      <h3 style={{
        fontFamily: "var(--font-display)",
        fontSize: 20, fontWeight: 700,
        color: "#e8f4ff", letterSpacing: "-0.01em",
        lineHeight: 1.1, marginBottom: 10,
      }}>
        {topic.name}
      </h3>

      <p style={{
        fontSize: 13, color: "rgba(232,244,255,0.5)",
        lineHeight: 1.5, marginBottom: 18,
      }}>
        {topic.desc}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Bolt size={11} color={topic.accent} />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "rgba(232,244,255,0.5)", letterSpacing: "0.04em",
          }}>
            +{topic.xp} XP
          </span>
        </div>
        <motion.div
          animate={{ x: hovered ? 4 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ArrowRight size={16} color={topic.accent} />
        </motion.div>
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${topic.accent}${hovered ? "80" : "30"}, transparent)`,
        transition: "opacity 0.2s",
      }} />
    </motion.button>
  );
}

function ComingSoonCard({ topic }: { topic: typeof COMING_SOON[number] }) {
  return (
    <div style={{
      padding: "20px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 10px)",
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ fontSize: 24, lineHeight: 1, opacity: 0.6 }}>{topic.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.22em",
            color: topic.accent, marginBottom: 4, opacity: 0.6,
          }}>
            {topic.sub} · COMING SOON
          </div>
          <h4 style={{
            fontSize: 14, fontWeight: 600,
            color: "rgba(232,244,255,0.45)", marginBottom: 6,
          }}>
            {topic.name}
          </h4>
          <p style={{
            fontSize: 12, color: "rgba(232,244,255,0.28)", lineHeight: 1.4,
          }}>
            {topic.desc}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, value, label, accent }: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px",
      background: `${accent}08`,
      border: `1px solid ${accent}20`,
      borderRadius: 10,
    }}>
      {icon}
      <div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700,
          color: accent, lineHeight: 1,
          textShadow: `0 0 16px ${accent}60`,
        }}>
          <TickNumber value={value} />
        </div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.18em",
          color: "rgba(232,244,255,0.35)", marginTop: 3,
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}

export default function Hub({ onEnterBubble }: { onEnterBubble: () => void }) {
  const { xp, streak, level } = useXP();
  const [showMap, setShowMap] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)", position: "relative" }}>
      {/* Ambient radial bg */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `
          radial-gradient(ellipse 900px 500px at 10% 10%, rgba(0,229,255,0.04), transparent 60%),
          radial-gradient(ellipse 700px 400px at 90% 80%, rgba(255,214,10,0.03), transparent 60%)
        `,
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 1100, margin: "0 auto",
        padding: "80px 24px 80px",
      }}>
        {/* Top greeting row */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 32, flexWrap: "wrap", gap: 16,
          }}
        >
          <div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em",
              color: "rgba(0,229,255,0.6)", marginBottom: 6,
            }}>
              ◇ LEARNING HUB · BRAINROT v.7
            </div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800,
              color: "#e8f4ff", letterSpacing: "-0.02em", lineHeight: 1,
            }}>
              Choose Your Module
            </h1>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatChip
              icon={<Bolt size={16} color="#ffd60a" />}
              value={xp}
              label="TOTAL XP"
              accent="#ffd60a"
            />
            <StatChip
              icon={<Flame size={16} color={streak >= 7 ? "#ffd60a" : "#fb7185"} />}
              value={streak}
              label="DAY STREAK"
              accent={streak >= 7 ? "#ffd60a" : "#fb7185"}
            />
            <StatChip
              icon={<Trophy size={16} color="#a78bfa" />}
              value={SORT_TOPICS.length + COMING_SOON.length}
              label="MODULES"
              accent="#a78bfa"
            />
          </div>
        </motion.div>

        {/* Level badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px",
            background: "rgba(167,139,250,0.08)",
            border: "1px solid rgba(167,139,250,0.25)",
            borderRadius: 20, marginBottom: 48,
          }}
        >
          <Star size={11} color="#a78bfa" />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em",
            color: "#a78bfa",
          }}>
            {level || "INITIATE"}
          </span>
        </motion.div>

        {/* SORTING ALGORITHMS */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          style={{ marginBottom: 56 }}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
          }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em",
              color: "rgba(167,139,250,0.7)",
            }}>
              REGION I · SORTING VILLAGE
            </div>
            <div style={{
              flex: 1, height: 1,
              background: "linear-gradient(90deg, rgba(167,139,250,0.3), transparent)",
            }} />
          </div>

          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700,
            color: "#e8f4ff", letterSpacing: "-0.01em", marginBottom: 16,
          }}>
            Sorting Algorithms
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 14,
          }}>
            {SORT_TOPICS.map((topic, i) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.06, duration: 0.35 }}
              >
                <SortCard topic={topic} onEnterBubble={onEnterBubble} />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* COMING SOON */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
          }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em",
              color: "rgba(255,214,10,0.5)",
            }}>
              REGIONS II–VI · IN DEVELOPMENT
            </div>
            <div style={{
              flex: 1, height: 1,
              background: "linear-gradient(90deg, rgba(255,214,10,0.2), transparent)",
            }} />
          </div>

          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700,
            color: "rgba(232,244,255,0.45)", letterSpacing: "-0.01em", marginBottom: 16,
          }}>
            More Coming Soon
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}>
            {COMING_SOON.map((topic, i) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 + i * 0.05, duration: 0.3 }}
              >
                <ComingSoonCard topic={topic} />
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* World Map FAB */}
      <motion.button
        onClick={() => setShowMap(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 40,
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px",
          background: "rgba(6,8,20,0.9)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(0,229,255,0.25)", borderRadius: 10,
          color: "#b8f7ff", fontFamily: "var(--font-mono)",
          fontSize: 10, letterSpacing: "0.15em", cursor: "pointer",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        <Compass size={14} />
        WORLD MAP
      </motion.button>

      <WorldMap open={showMap} onClose={() => setShowMap(false)} />
    </div>
  );
}
