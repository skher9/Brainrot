"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProgress } from "@/lib/useProgress";
import { ArrowRight, Info, Check } from "@/components/Glyphs";

interface Props {
  title: string;
  category: string;
  slug: string;
  totalSteps: number;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  children: ReactNode;
  hints: string[];
  hintsUsed: number;
  onUseHint: () => void;
}

export default function VisualiserLayout({
  title,
  category,
  slug,
  totalSteps,
  currentStep,
  onNext,
  onPrev,
  children,
  hints,
  hintsUsed,
  onUseHint,
}: Props) {
  const { upsert } = useProgress(slug, totalSteps);
  const [hintOpen, setHintOpen] = useState(false);
  const [displayedHint, setDisplayedHint] = useState("");
  const [displayedHintIndex, setDisplayedHintIndex] = useState(0);
  const prevStepRef = useRef<number | null>(null);

  // Auto-save on step change (skip initial render)
  useEffect(() => {
    if (prevStepRef.current === null) {
      prevStepRef.current = currentStep;
      return;
    }
    if (prevStepRef.current === currentStep) return;
    prevStepRef.current = currentStep;
    upsert(currentStep);
  }, [currentStep, upsert]);

  const maxHints = hints.length;
  const remaining = maxHints - hintsUsed;
  const hasHints = remaining > 0;
  const isComplete = currentStep >= totalSteps;
  const pct = totalSteps > 0 ? Math.min((currentStep / totalSteps) * 100, 100) : 0;

  const handleHintClick = () => {
    if (!hasHints) return;
    const idx = hintsUsed; // index before increment
    setDisplayedHint(hints[idx] ?? "");
    setDisplayedHintIndex(idx + 1);
    setHintOpen(true);
    onUseHint();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-0)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        height: 54,
        background: "rgba(11,14,31,0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center",
        padding: "0 24px", gap: 0,
      }}>
        {/* Bottom accent sweep */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.4), rgba(0,229,255,0.3), transparent)",
        }} />

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em",
            color: "rgba(232,244,255,0.35)", textTransform: "uppercase", flexShrink: 0,
          }}>
            {category}
          </span>
          <span style={{ color: "rgba(232,244,255,0.2)", fontSize: 14, flexShrink: 0 }}>›</span>
          <span style={{
            fontFamily: "var(--font-tac)", fontSize: 13, fontWeight: 600,
            color: "rgba(232,244,255,0.9)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {title}
          </span>
        </div>

        {/* Step counter + progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px",
                background: "rgba(110,231,183,0.1)",
                border: "1px solid rgba(110,231,183,0.3)",
                borderRadius: 20,
                fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em",
                color: "#6ee7b7",
              }}
            >
              <Check size={10} color="#6ee7b7" /> COMPLETE
            </motion.div>
          )}
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em",
            color: "rgba(232,244,255,0.45)",
          }}>
            <span style={{ color: "#00e5ff", fontWeight: 700 }}>{currentStep}</span>
            <span style={{ opacity: 0.4, margin: "0 2px" }}>/</span>
            {totalSteps}
          </span>
          <div style={{
            width: 72, height: 3,
            background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden",
          }}>
            <motion.div
              style={{ height: "100%", background: "linear-gradient(90deg, #a78bfa, #00e5ff)", borderRadius: 2 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {children}
      </div>

      {/* ── Hint panel ── */}
      <AnimatePresence>
        {hintOpen && displayedHint && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            style={{
              margin: "0 16px",
              padding: "14px 18px",
              background: "rgba(0,229,255,0.05)",
              border: "1px solid rgba(0,229,255,0.22)",
              borderRadius: 10,
              display: "flex", alignItems: "flex-start", gap: 12,
            }}
          >
            <Info size={14} color="#00e5ff" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.22em",
                color: "rgba(0,229,255,0.7)", marginBottom: 5,
              }}>
                HINT {displayedHintIndex} OF {maxHints}
              </div>
              <div style={{
                fontSize: 13, color: "rgba(232,244,255,0.82)",
                lineHeight: 1.55, fontFamily: "var(--font-tac)",
              }}>
                {displayedHint}
              </div>
            </div>
            <button
              onClick={() => setHintOpen(false)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(232,244,255,0.35)", fontSize: 18, lineHeight: 1,
                padding: "0 2px", flexShrink: 0,
                transition: "color 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(232,244,255,0.7)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(232,244,255,0.35)"; }}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom bar ── */}
      <div style={{
        padding: "14px 24px",
        background: "rgba(11,14,31,0.92)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        {/* Prev */}
        <NavBtn
          onClick={onPrev}
          disabled={currentStep <= 1}
          variant="ghost"
        >
          ← Prev
        </NavBtn>

        {/* Hint */}
        <button
          onClick={handleHintClick}
          disabled={!hasHints}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 16px",
            background: hasHints ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${hasHints ? "rgba(0,229,255,0.22)" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 8, cursor: hasHints ? "pointer" : "not-allowed",
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em",
            color: hasHints ? "#00e5ff" : "rgba(232,244,255,0.2)",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (hasHints) {
              e.currentTarget.style.background = "rgba(0,229,255,0.12)";
              e.currentTarget.style.borderColor = "rgba(0,229,255,0.45)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = hasHints ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.02)";
            e.currentTarget.style.borderColor = hasHints ? "rgba(0,229,255,0.22)" : "rgba(255,255,255,0.06)";
          }}
        >
          <Info size={12} />
          {hasHints ? `Hint (${remaining} remaining)` : "No hints left"}
        </button>

        {/* Next */}
        <NavBtn
          onClick={onNext}
          disabled={isComplete}
          variant="primary"
        >
          {isComplete ? "Done" : "Next →"}
        </NavBtn>
      </div>
    </div>
  );
}

function NavBtn({
  children, onClick, disabled, variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  variant: "ghost" | "primary";
}) {
  const base: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 20px", borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--font-tac)", fontSize: 13, fontWeight: 500,
    transition: "all 0.15s",
  };

  const active = !disabled;
  const styles: React.CSSProperties = variant === "primary"
    ? {
        ...base,
        background: active ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${active ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.06)"}`,
        color: active ? "#e8f4ff" : "rgba(232,244,255,0.2)",
      }
    : {
        ...base,
        background: active ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}`,
        color: active ? "rgba(232,244,255,0.75)" : "rgba(232,244,255,0.2)",
      };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={styles}
      onMouseEnter={(e) => {
        if (!active) return;
        e.currentTarget.style.background = variant === "primary"
          ? "rgba(167,139,250,0.22)"
          : "rgba(255,255,255,0.08)";
        e.currentTarget.style.color = "#e8f4ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = styles.background as string;
        e.currentTarget.style.color = styles.color as string;
      }}
    >
      {children}
    </button>
  );
}
