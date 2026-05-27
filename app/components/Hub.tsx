"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import { createClient } from "@/lib/supabase/client";
import SettingsModal from "@/components/SettingsModal";
import { Bolt, Flame, ArrowRight, Check } from "@/components/Glyphs";
import { TickNumber } from "@/components/Effects";

/* ─── Zone / level data ─────────────────────────────────── */
interface Level {
  id: string;
  name: string;
  label: string;
  xp: number;
  live: boolean;
}

interface Zone {
  id: string;
  name: string;
  region: string;
  accent: string;
  bg: string;
  border: string;
  tagline: string;
  available: boolean;
  levels: Level[];
}

const ZONES: Zone[] = [
  {
    id: "search",
    name: "Search Algorithms",
    region: "II",
    accent: "#67e8f9",
    bg: "rgba(14,116,144,0.1)",
    border: "rgba(103,232,249,0.15)",
    tagline: "Find anything, in any conditions.",
    available: true,
    levels: [
      { id: "linear-search",       name: "Linear Search",       label: "ENTRY",   xp: 200, live: true },
      { id: "binary-search",       name: "Binary Search",       label: "TIER I",  xp: 320, live: true },
      { id: "jump-search",         name: "Jump Search",         label: "TIER I",  xp: 320, live: true },
      { id: "interpolation-search",name: "Interpolation Search",label: "TIER II", xp: 400, live: true },
    ],
  },
  {
    id: "trees",
    name: "Tree Structures",
    region: "III",
    accent: "#6ee7b7",
    bg: "rgba(6,95,70,0.1)",
    border: "rgba(110,231,183,0.15)",
    tagline: "Branching logic, recursive beauty.",
    available: true,
    levels: [
      { id: "binary-tree", name: "Binary Tree",        label: "ENTRY",    xp: 280, live: true },
      { id: "bst",         name: "Binary Search Tree", label: "TIER I",   xp: 320, live: true },
      { id: "avl-tree",    name: "AVL Tree",           label: "TIER II",  xp: 380, live: true },
      { id: "heap",        name: "Heap",               label: "TIER II",  xp: 380, live: true },
      { id: "trie",        name: "Trie",               label: "TIER III", xp: 420, live: true },
    ],
  },
  {
    id: "graphs",
    name: "Graph Theory",
    region: "IV",
    accent: "#fb7185",
    bg: "rgba(159,18,57,0.1)",
    border: "rgba(251,113,133,0.15)",
    tagline: "Paths, traversals, and dark corners.",
    available: true,
    levels: [
      { id: "graph-basics", name: "Graph Basics",       label: "ENTRY",    xp: 280, live: true },
      { id: "bfs",          name: "BFS",                label: "TIER I",   xp: 320, live: true },
      { id: "dfs",          name: "DFS",                label: "TIER I",   xp: 320, live: true },
      { id: "dijkstra",     name: "Dijkstra's",         label: "TIER II",  xp: 420, live: true },
      { id: "astar",        name: "A*",                 label: "TIER III", xp: 480, live: true },
    ],
  },
  {
    id: "system-design",
    name: "System Design",
    region: "V",
    accent: "#f6c453",
    bg: "rgba(146,64,14,0.1)",
    border: "rgba(246,196,83,0.15)",
    tagline: "Architecture at scale.",
    available: true,
    levels: [
      { id: "caching",        name: "Caching",        label: "TIER I",   xp: 400, live: true },
      { id: "load-balancing", name: "Load Balancing", label: "TIER I",   xp: 400, live: true },
      { id: "databases",      name: "Databases",      label: "TIER II",  xp: 480, live: true },
      { id: "message-queues", name: "Message Queues", label: "TIER II",  xp: 480, live: true },
      { id: "cdns",           name: "CDNs",           label: "TIER III", xp: 520, live: true },
    ],
  },
  {
    id: "ai-ml",
    name: "AI & Machine Learning",
    region: "VI",
    accent: "#93c5fd",
    bg: "rgba(29,78,216,0.1)",
    border: "rgba(147,197,253,0.15)",
    tagline: "The model that learns to think.",
    available: true,
    levels: [
      { id: "neural-nets",  name: "Neural Networks",  label: "TIER II",  xp: 480, live: true },
      { id: "backprop",     name: "Backpropagation",  label: "TIER III", xp: 520, live: true },
      { id: "transformers", name: "Transformers",     label: "TIER IV",  xp: 600, live: true },
      { id: "embeddings",   name: "Embeddings",       label: "TIER III", xp: 560, live: true },
    ],
  },
];

/* ─── Nav ───────────────────────────────────────────────── */
function HubNav({
  onLogout,
  onSettings,
  email,
}: {
  onLogout: () => void;
  onSettings: () => void;
  email: string;
}) {
  const { xp, streak, level } = useXP();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const golden = streak >= 7;
  const initials = email ? email[0].toUpperCase() : "?";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: 60,
      background: scrolled ? "rgba(6,8,20,0.95)" : "rgba(6,8,20,0.8)",
      backdropFilter: "blur(20px)",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
      transition: "all 0.3s ease",
    }}>
      <div style={{
        height: "100%", maxWidth: 1200, margin: "0 auto",
        padding: "0 24px",
        display: "flex", alignItems: "center", gap: 0,
      }}>
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "var(--font-display)", fontSize: 20,
            letterSpacing: "-0.02em", fontWeight: 500,
            marginRight: 40, flexShrink: 0,
            padding: 0,
          }}
        >
          <span style={{ color: golden ? "#f6c453" : "#a78bfa", textShadow: `0 0 14px ${golden ? "rgba(246,196,83,0.4)" : "rgba(167,139,250,0.4)"}` }}>brain</span>
          <span style={{ color: "rgba(232,244,255,0.9)" }}>rot</span>
        </button>

        {/* Zone links */}
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {ZONES.map((z) => (
            <button
              key={z.id}
              onClick={() => scrollTo(z.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font-tac)", fontSize: 12, fontWeight: 500,
                letterSpacing: "0.03em",
                color: "rgba(232,244,255,0.75)",
                padding: "6px 10px", borderRadius: 6,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${z.accent}14`;
                e.currentTarget.style.color = z.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(232,244,255,0.75)";
              }}
            >
              {z.name.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Right: XP + avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {/* XP chip */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 10px",
            background: "rgba(255,214,10,0.06)",
            border: "1px solid rgba(255,214,10,0.18)",
            borderRadius: 20,
          }}>
            <Bolt size={11} color="#ffd60a" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "#ffd60a" }}>
              <TickNumber value={xp} />
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,214,10,0.5)", letterSpacing: "0.1em" }}>XP</span>
          </div>

          {/* Streak */}
          {streak > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px",
              background: golden ? "rgba(246,196,83,0.06)" : "rgba(251,113,133,0.06)",
              border: `1px solid ${golden ? "rgba(246,196,83,0.2)" : "rgba(251,113,133,0.18)"}`,
              borderRadius: 20,
            }}>
              <Flame size={11} color={golden ? "#f6c453" : "#fb7185"} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: golden ? "#f6c453" : "#fb7185" }}>
                {streak}
              </span>
            </div>
          )}

          {/* Avatar dropdown */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: menuOpen
                  ? "linear-gradient(135deg, rgba(0,229,255,0.35), rgba(167,139,250,0.25))"
                  : "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(167,139,250,0.15))",
                border: `1.5px solid ${menuOpen ? "rgba(0,229,255,0.7)" : "rgba(0,229,255,0.35)"}`,
                cursor: "pointer",
                fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700,
                color: menuOpen ? "#00e5ff" : "rgba(232,244,255,0.85)",
                boxShadow: menuOpen ? "0 0 14px rgba(0,229,255,0.3)" : "none",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {initials}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0,
                    minWidth: 220,
                    background: "rgba(11,14,31,0.98)",
                    border: "1px solid rgba(0,229,255,0.2)",
                    borderRadius: 12, overflow: "hidden",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                    zIndex: 200,
                  }}
                >
                  {/* Email header */}
                  <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(0,229,255,0.3), rgba(167,139,250,0.2))",
                        border: "1.5px solid rgba(0,229,255,0.4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "#00e5ff",
                      }}>{initials}</div>
                      <div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.18em", color: "rgba(0,229,255,0.6)", marginBottom: 2 }}>SIGNED IN AS</div>
                        <div style={{ fontSize: 12, color: "#e8f4ff", fontFamily: "var(--font-tac)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {email}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em",
                      color: "#a78bfa",
                    }}>
                      {level}
                    </div>
                  </div>

                  <div style={{ padding: "6px" }}>
                    <DropItem
                      icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2 13.5c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
                      label="Settings"
                      onClick={() => { setMenuOpen(false); onSettings(); }}
                    />
                    <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0" }} />
                    <DropItem
                      icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      label="Sign out"
                      onClick={onLogout}
                      danger
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}

function DropItem({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px", borderRadius: 8,
        background: "transparent", border: "none", cursor: "pointer",
        color: danger ? "rgba(255,154,199,0.75)" : "rgba(232,244,255,0.75)",
        fontFamily: "var(--font-tac)", fontSize: 13, textAlign: "left",
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "rgba(255,46,147,0.08)" : "rgba(255,255,255,0.05)";
        e.currentTarget.style.color = danger ? "#ff9ac7" : "#e8f4ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = danger ? "rgba(255,154,199,0.75)" : "rgba(232,244,255,0.75)";
      }}
    >
      <span style={{ opacity: 0.7, flexShrink: 0, display: "flex" }}>{icon}</span>
      {label}
    </button>
  );
}

/* ─── Level card ─────────────────────────────────────────── */
function LevelCard({
  level, zone,
}: {
  level: Level;
  zone: Zone;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [toast, setToast] = useState(false);
  const isLive = level.live;

  const handleClick = () => {
    if (!isLive) {
      setToast(true);
      setTimeout(() => setToast(false), 2000);
      return;
    }
    router.push(`/learn/${level.id}`);
  };

  return (
    <div style={{ position: "relative" }}>
      <motion.button
        onClick={handleClick}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={isLive ? { y: -3 } : undefined}
        whileTap={isLive ? { scale: 0.98 } : undefined}
        style={{
          width: "100%", textAlign: "left",
          padding: "18px 20px",
          background: isLive
            ? hovered
              ? `linear-gradient(135deg, ${zone.accent}16, ${zone.accent}06)`
              : `linear-gradient(135deg, ${zone.accent}08, transparent)`
            : "rgba(255,255,255,0.02)",
          border: `1px solid ${isLive
            ? hovered ? zone.accent + "55" : zone.accent + "22"
            : "rgba(255,255,255,0.05)"}`,
          borderRadius: 12, cursor: isLive ? "pointer" : "default",
          position: "relative", overflow: "hidden",
          transition: "background 0.2s, border-color 0.2s",
        }}
      >
        {!isLive && (
          <div style={{
            position: "absolute", inset: 0, opacity: 0.025,
            backgroundImage: "repeating-linear-gradient(45deg, white 0 1px, transparent 1px 10px)",
            pointerEvents: "none",
          }} />
        )}

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.2em",
              color: isLive ? zone.accent : "rgba(232,244,255,0.25)",
              marginBottom: 6,
            }}>
              {level.label}
            </div>
            <div style={{
              fontSize: 15, fontWeight: 600,
              color: isLive ? "#e8f4ff" : "rgba(232,244,255,0.35)",
              lineHeight: 1.2, marginBottom: 10,
            }}>
              {level.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Bolt size={10} color={isLive ? zone.accent : "rgba(232,244,255,0.2)"} />
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10,
                color: isLive ? "rgba(232,244,255,0.5)" : "rgba(232,244,255,0.2)",
              }}>
                +{level.xp} XP
              </span>
              {!isLive && (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.15em",
                  color: "rgba(232,244,255,0.25)", marginLeft: 4,
                }}>
                  COMING SOON
                </span>
              )}
            </div>
          </div>
          {isLive && (
            <motion.div
              animate={{ x: hovered ? 4 : 0 }}
              transition={{ duration: 0.15 }}
              style={{ flexShrink: 0, marginTop: 4 }}
            >
              <ArrowRight size={16} color={zone.accent} />
            </motion.div>
          )}
        </div>
      </motion.button>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
              padding: "6px 12px",
              background: "rgba(11,14,31,0.98)", border: "1px solid rgba(255,214,10,0.3)",
              borderRadius: 8, fontSize: 11, color: "#ffd60a",
              fontFamily: "var(--font-mono)", letterSpacing: "0.12em",
              whiteSpace: "nowrap", zIndex: 10,
              pointerEvents: "none",
            }}
          >
            Content coming soon
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Zone section ───────────────────────────────────────── */
function ZoneSection({ zone }: { zone: Zone }) {
  return (
    <section
      id={zone.id}
      style={{
        paddingTop: 80, paddingBottom: 64,
        borderTop: `1px solid ${zone.border}`,
        scrollMarginTop: 80,
      }}
    >
      {/* Section header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.28em",
            color: zone.accent, opacity: 0.8,
          }}>
            REGION {zone.region}
          </span>
          <span style={{
              fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.2em",
              padding: "2px 8px",
              background: `${zone.accent}18`,
              border: `1px solid ${zone.accent}40`,
              borderRadius: 20, color: zone.accent,
            }}>
              UNLOCKED
            </span>
        </div>
        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800,
          color: "#e8f4ff",
          letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 8,
        }}>
          {zone.name}
        </h2>
        <p style={{
          fontSize: 14, color: "rgba(232,244,255,0.45)",
          fontStyle: "italic", lineHeight: 1.5,
        }}>
          {zone.tagline}
        </p>
      </div>

      {/* Level cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 12,
      }}>
        {zone.levels.map((level, i) => (
          <motion.div
            key={level.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <LevelCard level={level} zone={zone} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─── Main Hub ───────────────────────────────────────────── */
export default function Hub({ onLogout }: { onLogout: () => void }) {
  const { xp, level } = useXP();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? "");
        setDisplayName(
          data.user.user_metadata?.display_name ||
          data.user.user_metadata?.full_name ||
          data.user.email?.split("@")[0] || ""
        );
      }
    });
  }, []);

  const totalTopics = ZONES.reduce((s, z) => s + z.levels.length, 0);
  const liveTopics = ZONES.flatMap((z) => z.levels).filter((l) => l.live).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)" }}>
      {/* Nav */}
      <HubNav
        onLogout={onLogout}
        onSettings={() => setSettingsOpen(true)}
        email={email}
      />

      {/* Settings modal — rendered here, NOT inside fixed header */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={onLogout}
      />

      {/* Main content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

        {/* Hero / greeting */}
        <div style={{ paddingTop: 120, paddingBottom: 64 }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.28em",
              color: "rgba(0,229,255,0.6)", marginBottom: 14,
            }}>
              ◇ WELCOME BACK
            </div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 900,
              color: "#e8f4ff", letterSpacing: "-0.03em", lineHeight: 1,
              marginBottom: 16,
            }}>
              {displayName
                ? <>{displayName.split(" ")[0]}<span style={{ color: "#a78bfa" }}>.</span></>
                : <>Choose <span style={{ color: "#a78bfa" }}>your module.</span></>
              }
            </h1>
            <p style={{
              fontSize: 16, color: "rgba(232,244,255,0.5)",
              lineHeight: 1.6, maxWidth: 560, marginBottom: 40,
            }}>
              Pick an algorithm. Watch it. Drive it. Debug it. Every module is a complete descent — not a lecture.
            </p>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "YOUR LEVEL", value: level, accent: "#a78bfa" },
                { label: "TOTAL XP", value: xp.toLocaleString(), accent: "#ffd60a" },
                { label: "LIVE MODULES", value: liveTopics, accent: "#00e5ff" },
                { label: "TOTAL MODULES", value: totalTopics, accent: "rgba(232,244,255,0.4)" },
              ].map((s) => (
                <div key={s.label} style={{
                  padding: "12px 18px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10,
                }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.2em", color: "rgba(232,244,255,0.4)", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: s.accent }}>{s.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Zone sections */}
        {ZONES.map((zone) => (
          <ZoneSection key={zone.id} zone={zone} />
        ))}

        {/* Footer */}
        <footer style={{
          paddingTop: 40, paddingBottom: 48,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
        }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700,
            color: "rgba(232,244,255,0.4)",
          }}>
            <span style={{ color: "#a78bfa" }}>brain</span>rot
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "rgba(232,244,255,0.25)" }}>
            v.7 · Algorithms, felt in the fingers.
          </div>
        </footer>
      </div>
    </div>
  );
}
