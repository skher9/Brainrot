"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, Trophy, Close, Village, Mountain, Forest,
  Web, Castle, Circuit, ArrowRight, Check, Lock, Bolt,
} from "@/components/Glyphs";
import type { SVGProps, ReactElement } from "react";

type GlyphKey = "Village" | "Mountain" | "Forest" | "Web" | "Castle" | "Circuit";
type G = SVGProps<SVGSVGElement> & { size?: number };
const GLYPHS: Record<GlyphKey, (p: G) => ReactElement> = {
  Village, Mountain, Forest, Web, Castle, Circuit,
};

interface ZoneLevel {
  name: string;
  unlocked: boolean;
  current?: boolean;
  xp: number;
  label: string;
}

interface Zone {
  id: string;
  name: string;
  region: string;
  glyph: GlyphKey;
  accent: string;
  deep: string;
  blurb: string;
  levels: ZoneLevel[];
}

const ZONES: Zone[] = [
  {
    id: "sort", name: "Sorting Village", region: "I",
    glyph: "Village", accent: "#a78bfa", deep: "#5b21b6",
    blurb: "Where order first finds its footing.",
    levels: [
      { name: "Bubble Sort",    unlocked: true,  current: true,  xp: 250, label: "ENTRY"  },
      { name: "Selection Sort", unlocked: false, xp: 280, label: "TIER I"  },
      { name: "Insertion Sort", unlocked: false, xp: 280, label: "TIER I"  },
      { name: "Merge Sort",     unlocked: false, xp: 360, label: "TIER II" },
      { name: "Quick Sort",     unlocked: false, xp: 360, label: "TIER II" },
    ],
  },
  {
    id: "search", name: "Search Mountains", region: "II",
    glyph: "Mountain", accent: "#67e8f9", deep: "#0e7490",
    blurb: "Find anything, in any conditions.",
    levels: [
      { name: "Linear Search",  unlocked: false, xp: 200, label: "ENTRY"   },
      { name: "Binary Search",  unlocked: false, xp: 320, label: "TIER I"  },
      { name: "Jump Search",    unlocked: false, xp: 320, label: "TIER I"  },
      { name: "Interpolation",  unlocked: false, xp: 400, label: "TIER II" },
    ],
  },
  {
    id: "tree", name: "Tree Forest", region: "III",
    glyph: "Forest", accent: "#6ee7b7", deep: "#065f46",
    blurb: "Branching structure, recursive logic.",
    levels: [
      { name: "Binary Tree",   unlocked: false, xp: 280, label: "ENTRY"    },
      { name: "BST",           unlocked: false, xp: 320, label: "TIER I"   },
      { name: "AVL Tree",      unlocked: false, xp: 380, label: "TIER II"  },
      { name: "Heap",          unlocked: false, xp: 380, label: "TIER II"  },
      { name: "Trie",          unlocked: false, xp: 420, label: "TIER III" },
    ],
  },
  {
    id: "graph", name: "Graph Dungeon", region: "IV",
    glyph: "Web", accent: "#fb7185", deep: "#9f1239",
    blurb: "Pathways, traversals, dark corners.",
    levels: [
      { name: "Graph Basics", unlocked: false, xp: 280, label: "ENTRY"    },
      { name: "BFS",          unlocked: false, xp: 320, label: "TIER I"   },
      { name: "DFS",          unlocked: false, xp: 320, label: "TIER I"   },
      { name: "Dijkstra",     unlocked: false, xp: 420, label: "TIER II"  },
      { name: "A*",           unlocked: false, xp: 480, label: "TIER III" },
    ],
  },
  {
    id: "design", name: "System Design Castle", region: "V",
    glyph: "Castle", accent: "#f6c453", deep: "#92400e",
    blurb: "Architecture, at scale.",
    levels: [
      { name: "Caching",        unlocked: false, xp: 400, label: "TIER I"   },
      { name: "Load Balancing", unlocked: false, xp: 400, label: "TIER I"   },
      { name: "Databases",      unlocked: false, xp: 480, label: "TIER II"  },
      { name: "Message Queues", unlocked: false, xp: 480, label: "TIER II"  },
      { name: "CDNs",           unlocked: false, xp: 520, label: "TIER III" },
    ],
  },
  {
    id: "ai", name: "AI Realm", region: "VI",
    glyph: "Circuit", accent: "#93c5fd", deep: "#1d4ed8",
    blurb: "The model that learns to think.",
    levels: [
      { name: "Neural Nets",  unlocked: false, xp: 480, label: "TIER II"  },
      { name: "Backprop",     unlocked: false, xp: 520, label: "TIER III" },
      { name: "Transformers", unlocked: false, xp: 600, label: "TIER IV"  },
      { name: "Embeddings",   unlocked: false, xp: 560, label: "TIER III" },
    ],
  },
];

function ZoneStat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.2em",
        color: "rgba(235,233,227,0.4)",
      }}>{label}</span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600,
        color: accent ?? "#ebe9e3",
        textShadow: accent ? `0 0 10px ${accent}80` : "none",
      }}>{value}</span>
    </div>
  );
}

function LevelCard({
  level, zone, index, onLocked, onClose,
}: {
  level: ZoneLevel;
  zone: Zone;
  index: number;
  onLocked: () => void;
  onClose: () => void;
}) {
  const locked = !level.unlocked;
  const cur = !!level.current;

  return (
    <motion.button
      whileHover={cur || !locked ? { y: -2 } : undefined}
      onClick={locked ? onLocked : onClose}
      style={{
        position: "relative", textAlign: "left",
        padding: "16px 18px",
        background: cur
          ? `linear-gradient(135deg, ${zone.accent}18, ${zone.deep}28)`
          : locked
          ? "rgba(255,255,255,0.015)"
          : "rgba(110,231,183,0.05)",
        border: "1px solid " + (cur
          ? `${zone.accent}66`
          : locked
          ? "rgba(255,255,255,0.05)"
          : "rgba(110,231,183,0.3)"),
        borderRadius: 10, cursor: "pointer",
        overflow: "hidden", width: "100%",
        transition: "border-color 0.2s",
      }}
    >
      {locked && (
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "repeating-linear-gradient(45deg, white 0 1px, transparent 1px 8px)",
          pointerEvents: "none",
        }} />
      )}

      {cur && (
        <span style={{
          position: "absolute", top: 12, right: 12,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 8, height: 8, borderRadius: "50%",
          background: zone.accent, boxShadow: `0 0 12px ${zone.accent}`,
        }}>
          <span style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            border: `1px solid ${zone.accent}80`,
            animation: "pulse-ring 1.5s ease-out infinite",
          }} />
        </span>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 9,
          color: cur ? zone.accent : "rgba(235,233,227,0.4)",
          letterSpacing: "0.18em",
        }}>
          {String(index + 1).padStart(2, "0")} · {level.label}
        </span>
        {!locked && !cur && <Check size={11} color="#6ee7b7" />}
        {locked && <Lock size={11} color="rgba(235,233,227,0.3)" />}
      </div>

      <div style={{
        fontSize: 16, fontWeight: 600, marginBottom: 12,
        color: cur ? "#ebe9e3" : locked ? "rgba(235,233,227,0.4)" : "rgba(110,231,183,0.9)",
      }}>
        {level.name}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Bolt size={11} color={cur ? zone.accent : "rgba(235,233,227,0.4)"} />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: cur ? "#ebe9e3" : "rgba(235,233,227,0.5)",
            letterSpacing: "0.04em",
          }}>+{level.xp} XP</span>
        </div>
        {cur && (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            color: zone.accent, letterSpacing: "0.15em",
          }}>
            IN PROGRESS · ▶
          </span>
        )}
      </div>
    </motion.button>
  );
}

function ZoneDetail({
  zone, onLocked, onClose,
}: {
  zone: Zone;
  onLocked: (name: string) => void;
  onClose: () => void;
}) {
  const Icon = GLYPHS[zone.glyph];
  return (
    <div style={{ padding: "28px 36px", overflowY: "auto", position: "relative" }}>
      {/* Hero strip */}
      <div style={{
        position: "relative", padding: "32px",
        background: `
          radial-gradient(ellipse 600px 200px at 20% 0%, ${zone.accent}26, transparent 70%),
          radial-gradient(ellipse 400px 240px at 90% 100%, ${zone.deep}40, transparent 60%),
          rgba(12,12,20,0.6)
        `,
        border: `1px solid ${zone.accent}33`,
        borderRadius: 14, marginBottom: 22, overflow: "hidden",
      }}>
        {/* Topology pattern */}
        <svg style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: 0.15, pointerEvents: "none",
        }} viewBox="0 0 800 240" preserveAspectRatio="none">
          <defs>
            <pattern id={`topo-${zone.id}`} x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <circle cx="40" cy="40" r="36" fill="none" stroke={zone.accent} strokeWidth="0.5" />
              <circle cx="40" cy="40" r="24" fill="none" stroke={zone.accent} strokeWidth="0.5" />
              <circle cx="40" cy="40" r="12" fill="none" stroke={zone.accent} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#topo-${zone.id})`} />
        </svg>

        <div style={{ display: "flex", alignItems: "center", gap: 22, position: "relative" }}>
          <div style={{
            width: 88, height: 88, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${zone.accent}40, ${zone.deep}40)`,
            border: `1px solid ${zone.accent}60`,
            borderRadius: 14,
            boxShadow: `0 10px 30px -10px ${zone.accent}40, inset 0 1px 0 ${zone.accent}40`,
          }}>
            <Icon size={48} color={zone.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.25em",
              color: zone.accent, marginBottom: 6,
            }}>
              REGION {zone.region} · CONTINENT OF SORTING
            </div>
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: 38, color: "#ebe9e3",
              letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 6,
            }}>
              {zone.name}
            </h2>
            <p style={{ fontSize: 14, color: "rgba(235,233,227,0.55)", fontStyle: "italic" }}>
              {zone.blurb}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "right", flexShrink: 0 }}>
            <ZoneStat label="LEVELS"   value={zone.levels.length} />
            <ZoneStat label="UNLOCKED" value={zone.levels.filter((l) => l.unlocked).length} accent={zone.accent} />
            <ZoneStat label="MAX XP"   value={zone.levels.reduce((s, l) => s + l.xp, 0)} />
          </div>
        </div>
      </div>

      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em",
        color: "rgba(235,233,227,0.4)", marginBottom: 10,
      }}>
        ◇ STAGES · SELECT TO INSPECT
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 12,
      }}>
        {zone.levels.map((lvl, i) => (
          <LevelCard
            key={lvl.name}
            level={lvl}
            zone={zone}
            index={i}
            onLocked={() => onLocked(lvl.name)}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}

export default function WorldMap({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleLocked = (name: string) => {
    setToast(`${name} is sealed. Finish Bubble Sort first.`);
    setTimeout(() => setToast(null), 1800);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(7,7,13,0.92)",
            backdropFilter: "blur(18px)",
          }}
        >
          {/* Top bar */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            padding: "20px 28px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(7,7,13,0.7)",
            backdropFilter: "blur(20px)",
            zIndex: 2,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(167,139,250,0.1)",
                border: "1px solid rgba(167,139,250,0.3)",
                borderRadius: 8,
              }}>
                <Compass size={20} color="#a78bfa" />
              </div>
              <div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 9,
                  letterSpacing: "0.22em", color: "rgba(246,196,83,0.7)",
                }}>
                  CARTOGRAPHY · CONTINENTS VI
                </div>
                <h2 style={{
                  fontFamily: "var(--font-display)", fontSize: 26,
                  color: "#ebe9e3", lineHeight: 1.1,
                }}>
                  The atlas of unreasonable understanding.
                </h2>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Trophy size={14} color="#f6c453" />
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 10,
                  letterSpacing: "0.18em", color: "rgba(235,233,227,0.55)",
                }}>
                  1 OF 27 UNLOCKED
                </span>
              </div>
              <button
                onClick={onClose}
                title="Close (Esc)"
                style={{
                  width: 36, height: 36,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, cursor: "pointer",
                  color: "rgba(235,233,227,0.7)",
                }}
              >
                <Close size={14} />
              </button>
            </div>
          </div>

          {/* Body: zone strip + detail */}
          <div style={{
            position: "absolute", top: 80, left: 0, right: 0, bottom: 0,
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            overflow: "hidden",
          }}>
            {/* Left: zone list */}
            <div style={{
              padding: "20px 16px 20px 28px",
              overflowY: "auto",
              borderRight: "1px solid rgba(255,255,255,0.05)",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              {ZONES.map((zone, i) => {
                const Icon = GLYPHS[zone.glyph];
                const isActive = i === active;
                const unlocked = zone.levels.filter((l) => l.unlocked).length;
                return (
                  <motion.button
                    key={zone.id}
                    onClick={() => setActive(i)}
                    whileHover={!isActive ? { background: "rgba(255,255,255,0.025)" } : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 14px",
                      background: isActive ? `linear-gradient(90deg, ${zone.accent}18, transparent)` : "transparent",
                      border: "1px solid " + (isActive ? zone.accent + "55" : "rgba(255,255,255,0.05)"),
                      borderRadius: 10,
                      cursor: "pointer", textAlign: "left",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `linear-gradient(135deg, ${zone.accent}26, ${zone.deep}30)`,
                      border: `1px solid ${zone.accent}40`,
                      borderRadius: 8,
                    }}>
                      <Icon size={20} color={zone.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: 8,
                          color: zone.accent, letterSpacing: "0.2em",
                        }}>{zone.region}</span>
                        <span style={{
                          fontSize: 13, fontWeight: 600,
                          color: isActive ? "#ebe9e3" : "rgba(235,233,227,0.7)",
                        }}>{zone.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: 9,
                          color: "rgba(235,233,227,0.4)", letterSpacing: "0.1em",
                        }}>
                          {unlocked} / {zone.levels.length}
                        </span>
                        <div style={{
                          flex: 1, height: 2,
                          background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%",
                            width: `${(unlocked / zone.levels.length) * 100}%`,
                            background: zone.accent,
                            boxShadow: unlocked > 0 ? `0 0 6px ${zone.accent}` : "none",
                          }} />
                        </div>
                      </div>
                    </div>
                    {isActive && <ArrowRight size={14} color={zone.accent} />}
                  </motion.button>
                );
              })}
            </div>

            {/* Right: detail */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                style={{ overflowY: "auto", height: "100%" }}
              >
                <ZoneDetail
                  zone={ZONES[active]}
                  onLocked={handleLocked}
                  onClose={onClose}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 12, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, y: 12, x: "-50%" }}
                style={{
                  position: "fixed", bottom: 32, left: "50%",
                  padding: "10px 18px",
                  background: "rgba(7,7,13,0.95)",
                  border: "1px solid rgba(246,196,83,0.4)",
                  borderRadius: 8,
                  fontSize: 12, color: "#ebe9e3",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                  zIndex: 200,
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <Lock size={12} color="#f6c453" />
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
