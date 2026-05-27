"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getNextModule, SortModuleConfig } from "@/lib/sorting/gameConfigs";

export interface CompletionStats {
  operationsUsed: number;
  optimalOperations: number;
  timeSeconds: number;
  hintsUsed: number;
  moduleName: string;
  moduleSlug: string;
}

function xpBreakdown(stats: CompletionStats, baseXP: number) {
  const noHintBonus  = stats.hintsUsed === 0 ? 25 : 0;
  const speedBonus   = stats.timeSeconds < 120 ? 15 : 0;
  const firstTry     = stats.operationsUsed <= stats.optimalOperations ? 10 : 0;
  const total        = baseXP + noHintBonus + speedBonus + firstTry;
  return { base: baseXP, noHintBonus, speedBonus, firstTry, total };
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

interface Props {
  stats: CompletionStats;
  baseXP: number;
  onClose: () => void;
  onNextModule: () => void;
  nextModule: SortModuleConfig | undefined;
}

export function StatsModal({ stats, baseXP, onClose, onNextModule, nextModule }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const xp = xpBreakdown(stats, baseXP);
  const efficiency = stats.optimalOperations > 0
    ? Math.min(100, Math.round((stats.optimalOperations / stats.operationsUsed) * 100))
    : 100;

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(6,8,20,0.85)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: "rgba(13,16,35,0.98)",
          border: "1px solid rgba(167,139,250,0.25)",
          borderRadius: 20,
          padding: "36px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.6), rgba(0,229,255,0.4), transparent)",
        }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em",
            color: "#6ee7b7", marginBottom: 8,
          }}>
            MODULE COMPLETE
          </div>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: 32, lineHeight: 1,
            color: "#e8f4ff", marginBottom: 4,
          }}>
            {stats.moduleName}
          </h2>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 10, marginBottom: 20,
        }}>
          <StatCard label="Operations" value={String(stats.operationsUsed)} sub={`Optimal: ${stats.optimalOperations}`} accent="#a78bfa" />
          <StatCard label="Time" value={fmtTime(stats.timeSeconds)} sub={stats.timeSeconds < 120 ? "Speed bonus!" : ""} accent="#00e5ff" />
          <StatCard label="Efficiency" value={`${efficiency}%`} sub={efficiency === 100 ? "Optimal!" : ""} accent="#f6c453" />
          <StatCard label="Hints Used" value={String(stats.hintsUsed)} sub={stats.hintsUsed === 0 ? "Clean run!" : ""} accent="#fb7185" />
        </div>

        {/* XP breakdown */}
        <div style={{
          background: "rgba(167,139,250,0.05)",
          border: "1px solid rgba(167,139,250,0.15)",
          borderRadius: 12,
          padding: "16px 18px",
          marginBottom: 20,
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "rgba(232,244,255,0.4)", marginBottom: 12 }}>XP EARNED</div>
          <XPLine label="Base" value={xp.base} />
          {xp.noHintBonus > 0 && <XPLine label="No hints bonus" value={xp.noHintBonus} color="#6ee7b7" />}
          {xp.speedBonus > 0 && <XPLine label="Speed bonus" value={xp.speedBonus} color="#f6c453" />}
          {xp.firstTry > 0 && <XPLine label="Optimal path" value={xp.firstTry} color="#00e5ff" />}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 0" }} />
          <XPLine label="Total" value={xp.total} color="#a78bfa" big />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, cursor: "pointer",
              fontFamily: "var(--font-tac)", fontSize: 13, color: "rgba(232,244,255,0.6)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          >
            Back to Hub
          </button>
          {nextModule && (
            <button
              onClick={onNextModule}
              style={{
                flex: 2, padding: "12px",
                background: "rgba(167,139,250,0.12)",
                border: "1px solid rgba(167,139,250,0.35)",
                borderRadius: 10, cursor: "pointer",
                fontFamily: "var(--font-tac)", fontSize: 13, fontWeight: 600, color: "#e8f4ff",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(167,139,250,0.22)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(167,139,250,0.12)"; }}
            >
              Next: {nextModule.name} →
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{
      padding: "14px 16px",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10,
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(232,244,255,0.35)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(232,244,255,0.3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function XPLine({ label, value, color = "rgba(232,244,255,0.7)", big = false }: {
  label: string; value: number; color?: string; big?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: big ? 0 : 6 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: big ? 11 : 10, color: "rgba(232,244,255,0.5)" }}>{label}</span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: big ? 16 : 11,
        fontWeight: big ? 700 : 500, color,
      }}>+{value} XP</span>
    </div>
  );
}
