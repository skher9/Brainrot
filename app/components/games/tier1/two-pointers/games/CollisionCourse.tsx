"use client";
import { useState, useRef, useEffect } from "react";
import type { GameProps } from "../types";

const ARRAY = [2, 7, 11, 15, 22, 30];
const TARGET = 26;
const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";

export default function CollisionCourse({ onSolve, onAttempt }: GameProps) {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(ARRAY.length - 1);
  const [checks, setChecks] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const solvedRef = useRef(false);

  const currentSum = ARRAY[left] + ARRAY[right];

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

  function moveLeft() {
    if (solved || left >= right - 1) return;
    doAttempt();
    const newLeft = left + 1;
    const newChecks = checks + 1;
    setLeft(newLeft);
    setChecks(newChecks);
    const sum = ARRAY[newLeft] + ARRAY[right];
    if (sum === TARGET) {
      setHint(null);
      setSolved(true);
    } else if (sum < TARGET) {
      setHint("TOO SMALL — MOVE LEFT POINTER RIGHT");
    } else {
      setHint("TOO BIG — MOVE RIGHT POINTER LEFT");
    }
  }

  function moveRight() {
    if (solved || right <= left + 1) return;
    doAttempt();
    const newRight = right - 1;
    const newChecks = checks + 1;
    setRight(newRight);
    setChecks(newChecks);
    const sum = ARRAY[left] + ARRAY[newRight];
    if (sum === TARGET) {
      setHint(null);
      setSolved(true);
    } else if (sum < TARGET) {
      setHint("TOO SMALL — MOVE LEFT POINTER RIGHT");
    } else {
      setHint("TOO BIG — MOVE RIGHT POINTER LEFT");
    }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      height: "100%", background: "#0a0a0a",
      fontFamily: MONO, userSelect: "none",
      overflowY: "auto", padding: "24px 16px 32px", boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 480, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>COLLISION COURSE</span>
          <span style={{ fontSize: 10, color: "#374151", letterSpacing: "0.08em" }}>
            CHECKS: <span style={{ color: "#64748b", fontWeight: 700 }}>{checks}</span>
            <span style={{ color: "#1e1e1e" }}> / LINEAR: {ARRAY.length}</span>
          </span>
        </div>
        <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.06em", lineHeight: 1.7 }}>
          SORTED ARRAY — FIND TWO NUMBERS THAT SUM TO TARGET
          <br />
          BLUE ◄ = LEFT POINTER · RED ► = RIGHT POINTER
        </div>
      </div>

      {/* Target */}
      <div style={{
        marginBottom: 28,
        padding: "10px 24px",
        background: "rgba(244,63,94,0.06)",
        border: "1px solid rgba(244,63,94,0.2)",
        borderRadius: 6,
        fontSize: 14, fontWeight: 700,
        color: "#f43f5e", letterSpacing: "0.1em",
      }}>
        TARGET: {TARGET}
      </div>

      {/* Array */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {ARRAY.map((val, i) => {
          const isLeft = i === left;
          const isRight = i === right;
          const isBetween = i > left && i < right;
          const isActive = isLeft || isRight;
          let bg = "#111";
          let border = "1px solid #222";
          let color = "#475569";
          if (solved && isActive) {
            bg = "rgba(34,197,94,0.12)";
            border = "1px solid rgba(34,197,94,0.5)";
            color = "#22c55e";
          } else if (isLeft) {
            bg = "rgba(59,130,246,0.12)";
            border = "1px solid rgba(59,130,246,0.5)";
            color = "#3b82f6";
          } else if (isRight) {
            bg = "rgba(239,68,68,0.12)";
            border = "1px solid rgba(239,68,68,0.5)";
            color = "#ef4444";
          } else if (isBetween) {
            bg = "rgba(255,255,255,0.02)";
            color = "#374151";
          }
          return (
            <div key={i} style={{
              width: 52, height: 52,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: bg, border, borderRadius: 6,
              transition: "all 0.2s",
              position: "relative",
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color }}>{val}</span>
              <span style={{ fontSize: 8, color: isLeft ? "#3b82f6" : isRight ? "#ef4444" : "#1e1e1e", letterSpacing: "0.04em" }}>
                [{i}]
              </span>
              {isLeft && (
                <span style={{
                  position: "absolute", top: -18, fontSize: 10,
                  color: "#3b82f6", letterSpacing: "0.06em",
                }}>◄ L</span>
              )}
              {isRight && (
                <span style={{
                  position: "absolute", top: -18, fontSize: 10,
                  color: "#ef4444", letterSpacing: "0.06em",
                }}>R ►</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Current sum */}
      <div style={{
        marginBottom: 20,
        padding: "8px 20px",
        background: solved ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${solved ? "rgba(34,197,94,0.3)" : "#1e1e1e"}`,
        borderRadius: 6,
        fontSize: 13, fontWeight: 700,
        color: solved ? "#22c55e" : currentSum === TARGET ? "#22c55e" : currentSum < TARGET ? "#3b82f6" : "#ef4444",
        letterSpacing: "0.08em",
      }}>
        {ARRAY[left]} + {ARRAY[right]} = {currentSum}
        {solved && <span style={{ marginLeft: 12, fontSize: 11 }}>✓ FOUND!</span>}
      </div>

      {/* Hint */}
      {hint && !solved && (
        <div style={{
          marginBottom: 20,
          padding: "8px 16px",
          background: "rgba(251,191,36,0.04)",
          border: "1px solid rgba(251,191,36,0.15)",
          borderRadius: 4,
          fontSize: 10, color: "#92400e", letterSpacing: "0.06em",
        }}>
          {hint}
        </div>
      )}

      {/* Buttons */}
      {!solved && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button
            onClick={moveLeft}
            disabled={left >= right - 1}
            style={{
              padding: "10px 20px",
              background: left >= right - 1 ? "rgba(59,130,246,0.03)" : "rgba(59,130,246,0.1)",
              border: `1px solid ${left >= right - 1 ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.35)"}`,
              borderRadius: 5, cursor: left >= right - 1 ? "not-allowed" : "pointer",
              fontSize: 11, color: left >= right - 1 ? "#1e3a5f" : "#3b82f6",
              fontFamily: "inherit", letterSpacing: "0.08em",
              transition: "all 0.12s",
            }}
          >
            MOVE LEFT →
          </button>
          <button
            onClick={moveRight}
            disabled={right <= left + 1}
            style={{
              padding: "10px 20px",
              background: right <= left + 1 ? "rgba(239,68,68,0.03)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${right <= left + 1 ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.35)"}`,
              borderRadius: 5, cursor: right <= left + 1 ? "not-allowed" : "pointer",
              fontSize: 11, color: right <= left + 1 ? "#5f1e1e" : "#ef4444",
              fontFamily: "inherit", letterSpacing: "0.08em",
              transition: "all 0.12s",
            }}
          >
            ← MOVE RIGHT
          </button>
        </div>
      )}

      {/* Solved message */}
      {solved && (
        <div style={{
          padding: "16px 24px",
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 6,
          fontSize: 11, color: "#22c55e",
          letterSpacing: "0.08em", textAlign: "center",
          lineHeight: 1.8,
        }}>
          PAIR FOUND: [{left}] + [{right}] = {TARGET}
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            {checks} CHECKS vs {ARRAY.length} LINEAR SCAN — O(n) NOT O(n²)
          </span>
        </div>
      )}

      {/* Explanation footer */}
      <div style={{
        marginTop: 24, width: "100%", maxWidth: 480,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414",
        borderRadius: 4,
        fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        SORTED → SUM TOO SMALL: ONLY LEFT++ CAN INCREASE IT · SUM TOO BIG: ONLY RIGHT-- CAN DECREASE IT
      </div>
    </div>
  );
}
