"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import { createClient } from "@/lib/supabase/client";
import SettingsModal from "@/components/SettingsModal";
import { Bolt, Flame, ArrowRight, Lock, Check, Trophy } from "@/components/Glyphs";
import { TickNumber } from "@/components/Effects";

/* ─── Region grid constants ─────────────────────────────── */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const CW = 320, CH = 230, STEPY = 276;
const COL = [0, 346, 692, 1038];
const ROW = [0, 276];
const MAP_W = 1360;
const MAP_H = ROW[1] + CH; // 506

/* Serpentine trace geometry */
const CY1 = ROW[0] + CH / 2;  // 115
const CY2 = ROW[1] + CH / 2;  // 391
const LX = COL[0] + CW / 2;   // 160
const RX = COL[3] + CW / 2;   // 1198
const TRACE_D = `M${LX} ${CY1} H${RX - 36} Q${RX} ${CY1} ${RX} ${CY1 + 36} V${CY2 - 36} Q${RX} ${CY2} ${RX - 36} ${CY2} H${LX}`;
const NODES = [
  { x: 333, y: CY1 }, { x: 679, y: CY1 }, { x: 1025, y: CY1 },
  { x: RX, y: (CY1 + CY2) / 2 },
  { x: 1025, y: CY2 }, { x: 679, y: CY2 }, { x: 333, y: CY2 },
];

/* ─── Region definitions ────────────────────────────────── */
interface RegionDef {
  id: string;
  topic: string;
  zone: string;
  href: string;
  code: number;
  tier: string;
  xp: number;
  total: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const REGION_DEFS: RegionDef[] = [
  { id: "binary-search",       topic: "Binary Search",       zone: "Search City",      href: "/learn/tier1/binary-search",      code: 0, tier: "ENTRY",    xp: 320, total: 8, x: COL[0], y: ROW[0], w: CW, h: CH },
  { id: "two-pointers",        topic: "Two Pointers",        zone: "Pointer Docks",    href: "/learn/tier1/two-pointers",        code: 1, tier: "TIER I",   xp: 280, total: 8, x: COL[1], y: ROW[0], w: CW, h: CH },
  { id: "sliding-window",      topic: "Sliding Window",      zone: "Scanner District", href: "/learn/tier1/sliding-window",      code: 2, tier: "TIER I",   xp: 300, total: 8, x: COL[2], y: ROW[0], w: CW, h: CH },
  { id: "graphs",              topic: "Graphs · BFS/DFS",    zone: "Graph Jungle",     href: "/learn/tier1/graphs",              code: 3, tier: "TIER II",  xp: 380, total: 8, x: COL[3], y: ROW[0], w: CW, h: CH },
  { id: "tries",               topic: "Tries",               zone: "Trie Archives",    href: "/learn/tier1/tries",               code: 7, tier: "TIER II",  xp: 360, total: 8, x: COL[3], y: ROW[1], w: CW, h: CH },
  { id: "backtracking",        topic: "Backtracking",        zone: "Palace Ruins",     href: "/learn/tier1/backtracking",        code: 6, tier: "TIER II",  xp: 360, total: 8, x: COL[2], y: ROW[1], w: CW, h: CH },
  { id: "trees",               topic: "Trees & BST",         zone: "Tree Temple",      href: "/learn/tier1/trees",               code: 4, tier: "TIER II",  xp: 380, total: 8, x: COL[1], y: ROW[1], w: CW, h: CH },
  { id: "dynamic-programming", topic: "Dynamic Programming", zone: "DP Lab",           href: "/learn/tier1/dynamic-programming", code: 5, tier: "TIER III", xp: 420, total: 8, x: COL[0], y: ROW[1], w: CW, h: CH },
];

type RegionStatus = "mastered" | "active" | "new" | "locked";

interface Region extends RegionDef {
  done: number;
  status: RegionStatus;
}

/* ─── Icons ─────────────────────────────────────────────── */
const SkullIco = () => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <path d="M12 3a8 8 0 0 0-8 8c0 2.7 1.3 4.4 3 5.5V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.5c1.7-1.1 3-2.8 3-5.5a8 8 0 0 0-8-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    <circle cx="9" cy="11" r="1.6" fill="currentColor"/>
    <circle cx="15" cy="11" r="1.6" fill="currentColor"/>
    <path d="M10 20v-2M14 20v-2M12 14v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const PlayIco = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <path d="M7 4.5v15l13-7.5-13-7.5Z" fill="currentColor"/>
  </svg>
);

const SearchIco = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7"/>
    <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

const BellIco = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

/* ─── Sub-components ────────────────────────────────────── */

function ProgressDots({ done, total, accent }: { done: number; total: number; accent: string }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: 9, height: 9, borderRadius: "50%",
          background: i < done ? accent : "rgba(255,255,255,0.10)",
          boxShadow: i < done ? `0 0 7px ${accent}` : "none",
          border: i < done ? "none" : "1px solid rgba(255,255,255,0.14)",
        }} />
      ))}
    </div>
  );
}

function XPBarComp({ value, max, accent = "var(--cyan)", h = 10 }: { value: number; max: number; accent?: string; h?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ position: "relative", height: h, borderRadius: h, background: "rgba(255,255,255,0.07)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{
        position: "absolute", inset: 0, width: `${pct}%`, borderRadius: h,
        background: `linear-gradient(90deg, ${accent}, color-mix(in oklch, ${accent}, white 22%))`,
        boxShadow: `0 0 14px ${accent}`, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, bottom: 0, width: "40%",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
          animation: "xp-shine 2.6s ease-in-out infinite",
        }} />
      </div>
    </div>
  );
}

function RegionCard({ r, onEnter }: { r: Region; onEnter: (id: string) => void }) {
  const { status } = r;
  const locked = status === "locked";
  const mastered = status === "mastered";
  const isNew = status === "new";
  const accent = "var(--cyan)";
  const accentHex = "#00e5ff";

  const borderC = locked ? "rgba(255,255,255,0.10)" : mastered ? "var(--lime, #34d399)" : accent;
  const cta = mastered ? "REPLAY" : isNew ? "ENTER" : status === "active" ? "CONTINUE" : "LOCKED";

  return (
    <div
      onClick={() => !locked && onEnter(r.id)}
      className={locked ? undefined : "region-card"}
      style={{
        position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h,
        borderRadius: 14, padding: "20px 22px", overflow: "hidden",
        cursor: locked ? "default" : "pointer",
        background: locked
          ? "rgba(12,12,28,0.72)"
          : `linear-gradient(155deg, ${accentHex}12, rgba(10,11,26,0.85))`,
        border: `1.5px solid ${borderC}`,
        boxShadow: locked ? "none" : "0 18px 44px -30px rgba(0,0,0,0.85)",
        opacity: locked ? 0.7 : 1,
        display: "flex", flexDirection: "column", zIndex: 2,
      }}
    >
      {locked && (
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 7px, transparent 7px 14px)", pointerEvents: "none" }} />
      )}

      {/* header */}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: locked ? "var(--ink-4)" : accent, whiteSpace: "nowrap" }}>
              REGION {ROMAN[r.code]}
            </span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em",
              padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap",
              color: locked ? "var(--ink-4)" : accent,
              background: locked ? "rgba(255,255,255,0.04)" : `${accentHex}18`,
              border: `1px solid ${locked ? "rgba(255,255,255,0.1)" : accentHex + "44"}`,
            }}>{r.tier}</span>
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, letterSpacing: "-0.015em", color: locked ? "var(--ink-3)" : "var(--ink)", lineHeight: 1.06 }}>
            {r.topic}
          </h3>
          <div style={{ fontSize: 13.5, fontStyle: "italic", color: locked ? "var(--ink-4)" : "rgba(232,244,255,0.55)", marginTop: 5, fontFamily: "var(--font-tac)" }}>
            {r.zone}
          </div>
        </div>
        {/* boss portal */}
        <div title={mastered ? "BOSS UNLOCKED" : "Complete all 8 levels to unlock boss"} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <div style={{
            width: 36, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
            clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
            background: mastered ? "rgba(255,214,10,0.14)" : "rgba(255,255,255,0.04)",
            color: mastered ? "var(--gold)" : "var(--ink-4)",
          }}>
            <SkullIco />
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: mastered ? "var(--gold)" : "var(--ink-4)" }}>
            {mastered ? "OPEN" : "BOSS"}
          </span>
        </div>
      </div>

      {/* footer */}
      <div style={{ position: "relative", marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
          <ProgressDots done={r.done} total={r.total} accent={locked ? "#3a3f55" : mastered ? "#34d399" : accentHex} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", color: locked ? "var(--ink-4)" : mastered ? "#34d399" : accent }}>
            {r.done}/{r.total}
          </span>
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 12 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: locked ? "var(--ink-4)" : "var(--gold)", whiteSpace: "nowrap" }}>
            <Bolt size={13} color={locked ? "var(--ink-4)" : "var(--gold)"} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700 }}>+{r.xp} XP</span>
          </span>
          {mastered ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#34d399", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
              <Check size={13} color="#34d399" /> MASTERED
            </span>
          ) : locked ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
              <Lock size={13} color="var(--ink-4)" /> LOCKED
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", color: accent, whiteSpace: "nowrap" }}>
              {isNew && <span className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: accentHex, boxShadow: `0 0 8px ${accentHex}` }} />}
              {cta} <ArrowRight size={15} color={accentHex} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatChipMap({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: "12px 18px", borderRadius: 10, background: "rgba(12,12,28,0.8)", border: "1px solid rgba(255,255,255,0.09)", minWidth: 128 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.18em", color: "var(--ink-4)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "var(--ink)", letterSpacing: "0.01em" }}>{value}</div>
    </div>
  );
}

function ZoneJump() {
  const items = [
    { label: "SEARCH", href: "#binary-search" },
    { label: "POINTERS", href: "#two-pointers" },
    { label: "SCANNER", href: "#sliding-window" },
    { label: "GRAPHS", href: "#graphs" },
    { label: "TREES", href: "#trees" },
    { label: "DP", href: "#dynamic-programming" },
    { label: "BACK", href: "#backtracking" },
    { label: "TRIES", href: "#tries" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {items.map((z, i) => (
        <a key={z.label} href={z.href} style={{
          fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em",
          padding: "6px 9px", borderRadius: 6, cursor: "pointer", textDecoration: "none",
          color: i === 0 ? "var(--cyan)" : "var(--ink-4)",
          background: i === 0 ? "rgba(0,229,255,0.08)" : "transparent",
        }}>{z.label}</a>
      ))}
    </div>
  );
}

/* ─── Drop menu item ────────────────────────────────────── */
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

/* ─── Campaign HUD bar ──────────────────────────────────── */
function CampaignHUD({ xp, streak, initials, onSettings, onLogout }: {
  xp: number;
  streak: number;
  initials: string;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: 60, display: "flex", alignItems: "center", gap: 24, padding: "0 36px",
      background: "rgba(6,8,20,0.88)", backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(0,229,255,0.14)",
    }}>
      {/* logo */}
      <div style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", flexShrink: 0 }}>
        <span style={{ color: "var(--cyan)", textShadow: "0 0 16px rgba(0,229,255,0.4)" }}>brain</span>
        <span style={{ color: "var(--ink)" }}>rot</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-4)", marginLeft: 6, letterSpacing: "0.1em" }}>v.7</span>
      </div>

      {/* zone-jump */}
      <div style={{ margin: "0 auto" }}>
        <ZoneJump />
      </div>

      {/* right cluster */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
        {/* XP */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(255,214,10,0.08)", border: "1px solid rgba(255,214,10,0.28)", color: "var(--gold)" }}>
          <Bolt size={13} color="var(--gold)" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>
            <TickNumber value={xp} />
          </span>
        </div>
        {/* streak */}
        {streak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(255,214,10,0.08)", border: "1px solid rgba(255,214,10,0.28)", color: "var(--gold)" }}>
            <Flame size={14} color="var(--gold)" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>{streak}</span>
          </div>
        )}
        {/* avatar + menu */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: menuOpen
                ? "linear-gradient(135deg, rgba(0,229,255,0.35), rgba(0,229,255,0.18))"
                : "linear-gradient(135deg, rgba(0,229,255,0.25), rgba(0,229,255,0.10))",
              border: `1.5px solid ${menuOpen ? "rgba(0,229,255,0.7)" : "rgba(0,229,255,0.45)"}`,
              cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700,
              color: menuOpen ? "#00e5ff" : "var(--ink)", boxShadow: menuOpen ? "0 0 14px rgba(0,229,255,0.3)" : "none",
              transition: "all 0.15s",
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
                  minWidth: 200, background: "rgba(11,14,31,0.98)",
                  border: "1px solid rgba(0,229,255,0.2)", borderRadius: 12,
                  overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.6)", zIndex: 200,
                }}
              >
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
  );
}

/* ─── Main Hub ───────────────────────────────────────────── */
export default function Hub({ onLogout }: { onLogout: () => void }) {
  const router = useRouter();
  const { xp, streak, level } = useXP();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});

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
        /* fetch per-module progress */
        supabase
          .from("user_progress")
          .select("topic_slug, completed_steps")
          .eq("user_id", data.user.id)
          .then(({ data: rows }) => {
            if (rows) {
              const map: Record<string, number> = {};
              for (const row of rows) map[row.topic_slug] = row.completed_steps;
              setProgress(map);
            }
          });
      }
    });
  }, []);

  const initials = email ? email[0].toUpperCase() : "?";
  const firstName = displayName ? displayName.split(" ")[0] : null;

  /* Build regions with live progress */
  const masteredCount = REGION_DEFS.filter((r) => (progress[r.id] ?? 0) >= r.total).length;

  const regions: Region[] = REGION_DEFS.map((def) => {
    const done = progress[def.id] ?? 0;
    let status: RegionStatus;
    if (done >= def.total) {
      status = "mastered";
    } else if (done > 0) {
      status = "active";
    } else if (def.id === "dynamic-programming" && masteredCount < 2) {
      status = "locked";
    } else {
      status = "new";
    }
    return { ...def, done, status };
  });

  /* The module currently in progress (for DAILY RUN → BEGIN) */
  const continueModule = regions.find((r) => r.status === "active") ?? regions[0];

  const handleEnterRegion = (id: string) => {
    const r = REGION_DEFS.find((d) => d.id === id);
    if (r) router.push(r.href);
  };

  const handleBegin = () => {
    router.push(continueModule.href);
  };

  /* Interview Arena unlock bars */
  const arenaUnlocked = masteredCount;
  const arenaRequired = 3;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)" }}>
      <CampaignHUD
        xp={xp}
        streak={streak}
        initials={initials}
        onSettings={() => setSettingsOpen(true)}
        onLogout={onLogout}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={onLogout}
      />

      <div style={{ paddingTop: 60 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 40px" }}>

          {/* ── Hero ── */}
          <div style={{ position: "relative", paddingTop: 40, marginBottom: 30 }}>
            <div style={{ position: "absolute", top: 0, left: -20, width: 380, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,229,255,0.10), transparent 65%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.28em", color: "rgba(0,229,255,0.7)", marginBottom: 14 }}>
              ◇ WELCOME BACK
            </div>
            <h1 style={{ position: "relative", fontFamily: "var(--font-display)", fontSize: 56, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 16 }}>
              {firstName
                ? <>{firstName}<span style={{ color: "var(--cyan)" }}>.</span></>
                : <>Choose <span style={{ color: "var(--cyan)" }}>your module.</span></>
              }
            </h1>
            <p style={{ position: "relative", fontSize: 17, color: "rgba(232,244,255,0.6)", maxWidth: 560, lineHeight: 1.55, marginBottom: 24 }}>
              Pick an algorithm. Watch it. Drive it. Debug it. Every module is a complete descent — not a lecture.
            </p>
            <div style={{ position: "relative", display: "flex", gap: 12, flexWrap: "wrap" }}>
              <StatChipMap label="YOUR LEVEL" value={level} />
              <StatChipMap label="TOTAL XP" value={xp.toLocaleString()} />
              <StatChipMap label="LIVE MODULES" value={REGION_DEFS.length} />
              <StatChipMap label="MASTERED" value={masteredCount} />
            </div>
          </div>

          {/* ── Daily Run strip ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 20, padding: "18px 24px",
            borderRadius: 14, marginBottom: 36,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,214,10,0.10)", border: "1px solid rgba(255,214,10,0.28)", color: "var(--gold)" }}>
                <Flame size={22} color="var(--gold)" />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.2em", color: "var(--ink-2)", fontWeight: 700, whiteSpace: "nowrap" }}>DAILY RUN</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)", marginTop: 2, whiteSpace: "nowrap" }}>{streak}-day streak</div>
              </div>
            </div>
            <div style={{ flex: 1, fontSize: 15.5, color: "var(--ink-2)", fontFamily: "var(--font-tac)" }}>
              5-min pattern sprint. <span style={{ color: "var(--ink-3)" }}>Pattern → Game → Review → XP.</span>
            </div>
            <button
              onClick={handleBegin}
              style={{
                display: "inline-flex", alignItems: "center", gap: 9, padding: "12px 26px",
                borderRadius: 8, cursor: "pointer", flexShrink: 0,
                background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.5)", color: "var(--cyan)",
                fontFamily: "var(--font-tac)", fontWeight: 700, fontSize: 15, letterSpacing: "0.08em",
              }}
            >
              <PlayIco /> BEGIN
            </button>
          </div>

          {/* ── Campaign section header ── */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, letterSpacing: "0.01em" }}>THE CAMPAIGN</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>// 8 regions · {masteredCount} mastered · follow the path</span>
          </div>

          {/* ── Campaign Map ── */}
          <div style={{ position: "relative", width: "100%", overflowX: "auto", marginBottom: 40 }}>
            <div style={{ position: "relative", width: MAP_W, height: MAP_H }}>
              {/* connector trace */}
              <svg
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                width={MAP_W}
                height={MAP_H}
                style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "visible" }}
              >
                {/* base track */}
                <path d={TRACE_D} fill="none" stroke="rgba(0,229,255,0.16)" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" />
                <path d={TRACE_D} fill="none" stroke="rgba(0,229,255,0.5)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {/* animated dashes */}
                <path
                  d={TRACE_D} fill="none" stroke="#00e5ff" strokeWidth="2.5"
                  strokeLinejoin="round" strokeLinecap="round"
                  strokeDasharray="2 16"
                  style={{ filter: "drop-shadow(0 0 6px #00e5ff)", animation: "dashflow 1.1s linear infinite" }}
                />
                {/* checkpoint nodes */}
                {NODES.map((n, i) => (
                  <g key={i}>
                    <circle cx={n.x} cy={n.y} r="7" fill="rgba(6,8,20,0.95)" stroke="rgba(0,229,255,0.4)" strokeWidth="1.5" />
                    <circle cx={n.x} cy={n.y} r="3" fill="#00e5ff" style={{ filter: "drop-shadow(0 0 5px #00e5ff)" }} />
                  </g>
                ))}
              </svg>

              {/* region cards */}
              <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
                {regions.map((r) => (
                  <div key={r.id} id={r.id}>
                    <RegionCard r={r} onEnter={handleEnterRegion} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Interview Arena gate ── */}
          <div style={{
            position: "relative", borderRadius: 16, padding: "34px 38px",
            overflow: "hidden", marginBottom: 30,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 10px, transparent 10px 20px)", pointerEvents: "none" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 28 }}>
              <div style={{
                width: 80, height: 88, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
                background: "rgba(255,255,255,0.04)", color: "var(--ink-3)",
              }}>
                <Lock size={34} color="var(--ink-3)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.24em", color: "var(--ink-4)", marginBottom: 8 }}>◇ ENDGAME</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--ink)", marginBottom: 8 }}>
                  INTERVIEW ARENA
                </h2>
                <p style={{ fontSize: 16, color: "var(--ink-2)", maxWidth: 560, lineHeight: 1.5, fontFamily: "var(--font-tac)" }}>
                  Mixed-topic mode. Pattern hidden. Identify, solve, survive.
                </p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)", marginBottom: 10 }}>REQUIRES {arenaRequired}+ COMPLETED REGIONS</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                  {Array.from({ length: arenaRequired }).map((_, i) => (
                    <span key={i} style={{ width: 34, height: 8, borderRadius: 4, background: i < arenaUnlocked ? "#34d399" : "rgba(255,255,255,0.1)" }} />
                  ))}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--ink-3)", marginLeft: 6 }}>{arenaUnlocked} / {arenaRequired}</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", marginTop: 12, letterSpacing: "0.12em" }}>LOCKED · COMING WHEN READY</div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <footer style={{
            paddingTop: 24, paddingBottom: 48,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "rgba(232,244,255,0.4)" }}>
              <span style={{ color: "var(--cyan)" }}>brain</span>rot
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", color: "rgba(232,244,255,0.28)" }}>
              v.7 · Algorithms, felt in the fingers.
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
