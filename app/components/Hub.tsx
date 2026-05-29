"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import { createClient } from "@/lib/supabase/client";
import SettingsModal from "@/components/SettingsModal";
import { Bolt, Flame, ArrowRight } from "@/components/Glyphs";
import { TickNumber } from "@/components/Effects";

/* ─── Module data ───────────────────────────────────────── */
interface Module {
  id: string;
  href: string;
  name: string;
  tag: string;
  xp: number;
  accent: string;
  description: string;
  problems: number;
}

const LIVE_MODULES: Module[] = [
  {
    id: "binary-search",
    href: "/learn/tier1/binary-search",
    name: "Binary Search",
    tag: "TIER I · SEARCH",
    xp: 320,
    accent: "#67e8f9",
    description: "Halve the search space every step. 8 problems from classic arrays to median of two sorted arrays.",
    problems: 8,
  },
  {
    id: "backtracking",
    href: "/learn/tier1/backtracking",
    name: "Backtracking",
    tag: "TIER I · RECURSION",
    xp: 360,
    accent: "#fbbf24",
    description: "Place, conflict, retreat. 8 problems — N-Queens to Sudoku — where the wrong move sends you back.",
    problems: 8,
  },
  {
    id: "graphs",
    href: "/learn/tier1/graphs",
    name: "Graphs & BFS/DFS",
    tag: "TIER I · TRAVERSAL",
    xp: 380,
    accent: "#a78bfa",
    description: "Flood fill, shortest path, island count. 8 problems — Minesweeper to Tarjan bridges.",
    problems: 8,
  },
  {
    id: "two-pointers",
    href: "/learn/tier1/two-pointers",
    name: "Two Pointers",
    tag: "TIER I · ARRAYS",
    xp: 280,
    accent: "#f43f5e",
    description: "Two ends meet in the middle. 8 problems from two-sum to trapping rain water.",
    problems: 8,
  },
  {
    id: "sliding-window",
    href: "/learn/tier1/sliding-window",
    name: "Sliding Window",
    tag: "TIER I · ARRAYS",
    xp: 300,
    accent: "#10b981",
    description: "A frame that slides, expands, and contracts. 8 problems — max average to minimum window substring.",
    problems: 8,
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
        <div style={{
          fontFamily: "var(--font-display)", fontSize: 20,
          letterSpacing: "-0.02em", fontWeight: 500,
          marginRight: "auto", flexShrink: 0,
        }}>
          <span style={{ color: golden ? "#f6c453" : "#a78bfa", textShadow: `0 0 14px ${golden ? "rgba(246,196,83,0.4)" : "rgba(167,139,250,0.4)"}` }}>brain</span>
          <span style={{ color: "rgba(232,244,255,0.9)" }}>rot</span>
        </div>

        {/* Right: XP + avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
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
                    <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "#a78bfa" }}>
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

/* ─── Module card ────────────────────────────────────────── */
function ModuleCard({ mod }: { mod: Module }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={() => router.push(mod.href)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      style={{
        width: "100%", maxWidth: 480, textAlign: "left",
        padding: "28px 32px",
        background: hovered
          ? `linear-gradient(135deg, ${mod.accent}18, ${mod.accent}08)`
          : `linear-gradient(135deg, ${mod.accent}0c, transparent)`,
        border: `1px solid ${hovered ? mod.accent + "60" : mod.accent + "28"}`,
        borderRadius: 16, cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s",
        boxShadow: hovered ? `0 20px 60px -10px ${mod.accent}20` : "none",
      }}
    >
      {/* Live badge + tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 8px",
          background: "rgba(182,255,60,0.1)", border: "1px solid rgba(182,255,60,0.3)",
          borderRadius: 999,
          fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.15em", color: "#b6ff3c",
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#b6ff3c", boxShadow: "0 0 6px #b6ff3c" }} />
          LIVE NOW
        </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em",
          color: mod.accent, opacity: 0.7,
        }}>
          {mod.tag}
        </span>
      </div>

      {/* Name */}
      <h2 style={{
        fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800,
        color: "#e8f4ff", letterSpacing: "-0.02em", lineHeight: 1,
        marginBottom: 12,
      }}>
        {mod.name}
      </h2>

      {/* Description */}
      <p style={{
        fontSize: 14, color: "rgba(232,244,255,0.55)",
        lineHeight: 1.6, marginBottom: 20,
      }}>
        {mod.description}
      </p>

      {/* Footer row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 16 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(232,244,255,0.4)" }}>
            {mod.problems} problems
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,214,10,0.6)" }}>
            <Bolt size={9} color="#ffd60a" /> +{mod.xp} XP
          </span>
        </div>
        <motion.div animate={{ x: hovered ? 6 : 0 }} transition={{ duration: 0.15 }}>
          <ArrowRight size={18} color={mod.accent} />
        </motion.div>
      </div>
    </motion.button>
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)" }}>
      <HubNav onLogout={onLogout} onSettings={() => setSettingsOpen(true)} email={email} />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={onLogout}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        {/* Greeting */}
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
              lineHeight: 1.6, maxWidth: 520, marginBottom: 40,
            }}>
              Pick a pattern. Drive it. Every module is a complete descent — not a lecture.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "YOUR LEVEL", value: level, accent: "#a78bfa" },
                { label: "TOTAL XP",   value: xp.toLocaleString(), accent: "#ffd60a" },
                { label: "LIVE NOW",   value: LIVE_MODULES.length, accent: "#00e5ff" },
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

        {/* Modules */}
        <div style={{ paddingBottom: 80 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.28em",
            color: "rgba(255,255,255,0.3)", marginBottom: 24,
          }}>
            AVAILABLE NOW
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {LIVE_MODULES.map((mod, i) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
              >
                <ModuleCard mod={mod} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          paddingTop: 40, paddingBottom: 48,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "rgba(232,244,255,0.4)" }}>
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
