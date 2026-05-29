"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import type { GameProps } from "../types";

const HEIGHTS = [1, 8, 6, 2, 5, 4, 8, 3];
const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
const BAR_W = 38;
const BAR_SCALE = 20; // px per unit height

function computeArea(heights: number[], l: number, r: number) {
  return Math.min(heights[l], heights[r]) * (r - l);
}

// Precompute global max
function globalMax(heights: number[]) {
  let best = 0;
  for (let l = 0; l < heights.length - 1; l++) {
    for (let r = l + 1; r < heights.length; r++) {
      best = Math.max(best, computeArea(heights, l, r));
    }
  }
  return best;
}

const GLOBAL_MAX = globalMax(HEIGHTS);

export default function ContainerCraft({ onSolve, onAttempt }: GameProps) {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(HEIGHTS.length - 1);
  const [maxArea, setMaxArea] = useState(computeArea(HEIGHTS, 0, HEIGHTS.length - 1));
  const [moves, setMoves] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockResult, setLockResult] = useState<"correct" | "wrong" | null>(null);
  const [solved, setSolved] = useState(false);
  const solvedRef = useRef(false);

  const currentArea = computeArea(HEIGHTS, left, right);

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      const t = setTimeout(() => onSolve(), 900);
      return () => clearTimeout(t);
    }
  }, [solved, onSolve]);

  function doAttempt() {
    if (!attempted) {
      setAttempted(true);
      onAttempt();
    }
  }

  function move(dir: "left" | "right") {
    if (locked) return;
    doAttempt();
    setMoves(m => m + 1);
    let newL = left;
    let newR = right;
    if (dir === "left" && left < right - 1) newL = left + 1;
    if (dir === "right" && right > left + 1) newR = right - 1;
    const area = computeArea(HEIGHTS, newL, newR);
    setLeft(newL);
    setRight(newR);
    setMaxArea(prev => Math.max(prev, area));
  }

  function handleLockIn() {
    if (locked) return;
    doAttempt();
    setLocked(true);
    if (maxArea === GLOBAL_MAX) {
      setLockResult("correct");
      setSolved(true);
    } else {
      setLockResult("wrong");
    }
  }

  const maxH = Math.max(...HEIGHTS);
  const boardH = maxH * BAR_SCALE + 10;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      height: "100%", background: "#0a0a0a",
      fontFamily: MONO, userSelect: "none",
      overflowY: "auto", padding: "24px 16px 32px", boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>CONTAINER CRAFT</span>
          <span style={{ fontSize: 10, color: "#374151" }}>MOVES: <span style={{ color: "#64748b", fontWeight: 700 }}>{moves}</span></span>
        </div>
        <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.06em", lineHeight: 1.7 }}>
          MOVE POINTERS TO MAXIMIZE WATER AREA · LOCK IN WHEN CONFIDENT
          <br />
          BLUE = LEFT · RED = RIGHT · GOLD FILL = WATER
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{
          padding: "8px 16px",
          background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)",
          borderRadius: 5, fontSize: 12, fontWeight: 700, color: "#fbbf24",
          letterSpacing: "0.08em",
        }}>
          AREA: {currentArea}
        </div>
        <div style={{
          padding: "8px 16px",
          background: maxArea === GLOBAL_MAX ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${maxArea === GLOBAL_MAX ? "rgba(34,197,94,0.3)" : "#1e1e1e"}`,
          borderRadius: 5, fontSize: 12, fontWeight: 700,
          color: maxArea === GLOBAL_MAX ? "#22c55e" : "#475569",
          letterSpacing: "0.08em",
        }}>
          MAX: {maxArea} {maxArea === GLOBAL_MAX ? "✓" : ""}
        </div>
      </div>

      {/* Bar chart */}
      <div style={{
        display: "flex", alignItems: "flex-end", gap: 4,
        height: boardH, marginBottom: 28,
        position: "relative",
        padding: "0 4px",
      }}>
        {HEIGHTS.map((h, i) => {
          const isLeft = i === left;
          const isRight = i === right;
          const isBetween = i > left && i < right;
          const barH = h * BAR_SCALE;
          const waterH = Math.min(HEIGHTS[left], HEIGHTS[right]) * BAR_SCALE;
          const showWater = isBetween || isLeft || isRight;

          let barBg = "#1a1a1a";
          let barBorder = "1px solid #2a2a2a";
          if (isLeft) { barBg = "rgba(59,130,246,0.25)"; barBorder = "1px solid rgba(59,130,246,0.6)"; }
          if (isRight) { barBg = "rgba(239,68,68,0.25)"; barBorder = "1px solid rgba(239,68,68,0.6)"; }
          if (solved && (isLeft || isRight)) { barBg = "rgba(34,197,94,0.2)"; barBorder = "1px solid rgba(34,197,94,0.5)"; }

          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {/* Height label */}
              <span style={{ fontSize: 9, color: isLeft ? "#3b82f6" : isRight ? "#ef4444" : "#374151", marginBottom: 2 }}>{h}</span>

              {/* Bar wrapper */}
              <div style={{ position: "relative", width: BAR_W, height: barH }}>
                {/* Water fill (behind bar) */}
                {showWater && (
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    height: Math.min(waterH, barH),
                    background: "rgba(59,130,246,0.12)",
                    borderRadius: 2,
                    pointerEvents: "none",
                  }} />
                )}
                {/* Bar itself */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: "100%",
                  background: barBg, border: barBorder, borderRadius: 3,
                  transition: "all 0.15s",
                  display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 4,
                }}>
                  {isLeft && <span style={{ fontSize: 9, color: "#3b82f6" }}>L</span>}
                  {isRight && <span style={{ fontSize: 9, color: "#ef4444" }}>R</span>}
                </div>
              </div>

              {/* Index */}
              <span style={{ fontSize: 8, color: "#2a2a2a", marginTop: 2 }}>{i}</span>
            </div>
          );
        })}
      </div>

      {/* Pointer info */}
      <div style={{ display: "flex", gap: 24, marginBottom: 16, fontSize: 10, color: "#475569" }}>
        <span>L[{left}]={HEIGHTS[left]} <span style={{ color: "#1e1e1e" }}>height</span></span>
        <span style={{ color: "#2a2a2a" }}>width={right - left}</span>
        <span>R[{right}]={HEIGHTS[right]} <span style={{ color: "#1e1e1e" }}>height</span></span>
      </div>

      {/* Controls */}
      {!locked && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => move("left")}
            disabled={left >= right - 1}
            style={{
              padding: "9px 18px",
              background: left >= right - 1 ? "rgba(59,130,246,0.03)" : "rgba(59,130,246,0.1)",
              border: `1px solid ${left >= right - 1 ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.35)"}`,
              borderRadius: 5, cursor: left >= right - 1 ? "not-allowed" : "pointer",
              fontSize: 11, color: left >= right - 1 ? "#1e3a5f" : "#3b82f6",
              fontFamily: "inherit", letterSpacing: "0.08em",
            }}
          >
            ← MOVE LEFT
          </button>
          <button
            onClick={() => move("right")}
            disabled={right <= left + 1}
            style={{
              padding: "9px 18px",
              background: right <= left + 1 ? "rgba(239,68,68,0.03)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${right <= left + 1 ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.35)"}`,
              borderRadius: 5, cursor: right <= left + 1 ? "not-allowed" : "pointer",
              fontSize: 11, color: right <= left + 1 ? "#5f1e1e" : "#ef4444",
              fontFamily: "inherit", letterSpacing: "0.08em",
            }}
          >
            MOVE RIGHT →
          </button>
          <button
            onClick={handleLockIn}
            style={{
              padding: "9px 18px",
              background: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.35)",
              borderRadius: 5, cursor: "pointer",
              fontSize: 11, color: "#fbbf24",
              fontFamily: "inherit", letterSpacing: "0.08em",
            }}
          >
            LOCK IN MAX={maxArea}
          </button>
        </div>
      )}

      {/* Lock result */}
      {lockResult === "correct" && (
        <div style={{
          padding: "14px 22px",
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 6, fontSize: 11, color: "#22c55e",
          letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.8,
        }}>
          CORRECT! MAX AREA = {GLOBAL_MAX}
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            GREEDY: ALWAYS MOVE THE SHORTER WALL — MOVING THE TALLER ONE CAN ONLY SHRINK AREA
          </span>
        </div>
      )}
      {lockResult === "wrong" && (
        <div style={{
          padding: "14px 22px",
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 6, fontSize: 11, color: "#ef4444",
          letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.8,
        }}>
          NOT QUITE — YOU FOUND {maxArea}, BUT MAX IS {GLOBAL_MAX}
          <br />
          <span style={{ fontSize: 9, color: "#fca5a5", opacity: 0.7 }}>
            TIP: ALWAYS MOVE THE SHORTER WALL INWARD
          </span>
          <br />
          <button
            onClick={() => {
              setLeft(0); setRight(HEIGHTS.length - 1);
              setMaxArea(computeArea(HEIGHTS, 0, HEIGHTS.length - 1));
              setMoves(0); setLocked(false); setLockResult(null);
            }}
            style={{
              marginTop: 8, padding: "6px 14px",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 4, cursor: "pointer", fontSize: 10, color: "#ef4444",
              fontFamily: "inherit", letterSpacing: "0.06em",
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Footer note */}
      <div style={{
        marginTop: 20, width: "100%", maxWidth: 520,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.01)", border: "1px solid #141414",
        borderRadius: 4, fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        AREA = MIN(HEIGHT[L], HEIGHT[R]) × (R - L) · SHORTER WALL IS THE BOTTLENECK — MOVE IT INWARD
      </div>
    </div>
  );
}
