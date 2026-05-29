"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import type { GameProps } from "../types";

const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
const K = 3;

function generateArray(): number[] {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 20) + 1);
}

function findMaxAvgWindow(arr: number[], k: number): number {
  let sum = arr.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum = sum;
  for (let i = k; i < arr.length; i++) {
    sum += arr[i] - arr[i - k];
    if (sum > maxSum) maxSum = sum;
  }
  return maxSum;
}

function findMaxAvgStart(arr: number[], k: number): number {
  let sum = arr.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum = sum;
  let maxStart = 0;
  for (let i = k; i < arr.length; i++) {
    sum += arr[i] - arr[i - k];
    if (sum > maxSum) { maxSum = sum; maxStart = i - k + 1; }
  }
  return maxStart;
}

export default function TheScanner({ onSolve, onAttempt }: GameProps) {
  const [arr] = useState<number[]>(generateArray);
  const [windowStart, setWindowStart] = useState(0);
  const [bestSum, setBestSum] = useState(() => {
    const a = generateArray();
    return a.slice(0, K).reduce((s, v) => s + v, 0);
  });
  const [attempted, setAttempted] = useState(false);
  const [flash, setFlash] = useState<"none" | "error" | "success">("none");
  const [solved, setSolved] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const solvedRef = useRef(false);

  // Re-init bestSum once arr is set
  const initialSum = arr.slice(0, K).reduce((s, v) => s + v, 0);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      setBestSum(initialSum);
      setInitialized(true);
    }
  }, [initialized, initialSum]);

  const maxAvgStart = findMaxAvgStart(arr, K);
  const maxSum = findMaxAvgWindow(arr, K);

  const currentWindowSum = arr.slice(windowStart, windowStart + K).reduce((s, v) => s + v, 0);
  const currentAvg = currentWindowSum / K;

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      const t = setTimeout(() => onSolve(), 800);
      return () => clearTimeout(t);
    }
  }, [solved, onSolve]);

  function doAttempt() {
    if (!attempted) {
      setAttempted(true);
      onAttempt();
    }
  }

  const slideLeft = useCallback(() => {
    if (solved || windowStart === 0) return;
    doAttempt();
    const newStart = windowStart - 1;
    setWindowStart(newStart);
    const newSum = arr.slice(newStart, newStart + K).reduce((s, v) => s + v, 0);
    if (newSum > bestSum) setBestSum(newSum);
  }, [solved, windowStart, arr, bestSum]);

  const slideRight = useCallback(() => {
    if (solved || windowStart >= arr.length - K) return;
    doAttempt();
    const newStart = windowStart + 1;
    setWindowStart(newStart);
    const newSum = arr.slice(newStart, newStart + K).reduce((s, v) => s + v, 0);
    if (newSum > bestSum) setBestSum(newSum);
  }, [solved, windowStart, arr, bestSum]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") slideLeft();
      if (e.key === "ArrowRight") slideRight();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [slideLeft, slideRight]);

  function lockIn() {
    doAttempt();
    if (windowStart === maxAvgStart) {
      setFlash("success");
      setSolved(true);
    } else {
      setFlash("error");
      setShowCorrect(true);
      setTimeout(() => setFlash("none"), 600);
    }
  }

  const bestAvg = bestSum / K;
  const prevSum = windowStart > 0
    ? arr.slice(windowStart - 1, windowStart - 1 + K).reduce((s, v) => s + v, 0)
    : null;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      height: "100%", background: "#0a0a0a",
      fontFamily: MONO, userSelect: "none",
      overflowY: "auto", padding: "24px 16px 40px", boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 540, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>THE SCANNER</span>
          <span style={{ fontSize: 10, color: "#374151" }}>
            WINDOW SIZE: <span style={{ color: "#10b981", fontWeight: 700 }}>{K}</span>
          </span>
        </div>
        <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.06em", lineHeight: 1.7 }}>
          SLIDE THE WINDOW TO FIND THE SUBARRAY WITH MAXIMUM AVERAGE
          <br />
          USE ← → ARROWS OR BUTTONS BELOW
        </div>
      </div>

      {/* Best so far */}
      <div style={{
        marginBottom: 20,
        padding: "10px 24px",
        background: "rgba(16,185,129,0.06)",
        border: "1px solid rgba(16,185,129,0.2)",
        borderRadius: 6,
        fontSize: 13, fontWeight: 700,
        color: "#10b981", letterSpacing: "0.1em",
      }}>
        BEST: {bestAvg.toFixed(2)}
      </div>

      {/* Array with window highlight */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {arr.map((val, i) => {
          const inWindow = i >= windowStart && i < windowStart + K;
          const isLeft = i === windowStart;
          const isRight = i === windowStart + K - 1;
          let bg = "#111";
          let border = "1px solid #1e1e1e";
          let color = "#374151";
          if (flash === "success" && inWindow) {
            bg = "rgba(34,197,94,0.14)"; border = "1px solid rgba(34,197,94,0.5)"; color = "#22c55e";
          } else if (flash === "error" && inWindow) {
            bg = "rgba(239,68,68,0.14)"; border = "1px solid rgba(239,68,68,0.5)"; color = "#ef4444";
          } else if (inWindow) {
            bg = "rgba(16,185,129,0.1)"; border = "1px solid rgba(16,185,129,0.4)"; color = "#10b981";
          }

          return (
            <div key={i} style={{
              width: 44, height: 52,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: bg, border, borderRadius: 6,
              transition: "all 0.18s",
              position: "relative",
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color }}>{val}</span>
              <span style={{ fontSize: 7, color: inWindow ? "#10b981" : "#1e1e1e", letterSpacing: "0.04em" }}>
                [{i}]
              </span>
              {isLeft && (
                <span style={{ position: "absolute", top: -16, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "#10b981" }}>L</span>
              )}
              {isRight && (
                <span style={{ position: "absolute", top: -16, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "#10b981" }}>R</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Live formula */}
      <div style={{
        marginBottom: 16,
        padding: "10px 20px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid #1a1a1a",
        borderRadius: 6,
        fontSize: 12, color: "#64748b", letterSpacing: "0.06em",
        textAlign: "center", lineHeight: 1.8,
      }}>
        <span style={{ color: "#475569" }}>
          [{arr.slice(windowStart, windowStart + K).join(" + ")}] = {currentWindowSum}
        </span>
        {prevSum !== null && windowStart > 0 && (
          <span style={{ color: "#374151", fontSize: 10, marginLeft: 12 }}>
            (−{arr[windowStart - 1]} +{arr[windowStart + K - 1]})
          </span>
        )}
        <br />
        <span style={{ color: "#10b981", fontWeight: 700 }}>
          avg = {currentWindowSum} / {K} = {currentAvg.toFixed(2)}
        </span>
      </div>

      {/* Buttons */}
      {!solved && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button
            onClick={slideLeft}
            disabled={windowStart === 0}
            style={{
              padding: "10px 20px",
              background: windowStart === 0 ? "rgba(16,185,129,0.02)" : "rgba(16,185,129,0.08)",
              border: `1px solid ${windowStart === 0 ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.3)"}`,
              borderRadius: 5, cursor: windowStart === 0 ? "not-allowed" : "pointer",
              fontSize: 11, color: windowStart === 0 ? "#1a4a3a" : "#10b981",
              fontFamily: "inherit", letterSpacing: "0.08em",
              transition: "all 0.12s",
            }}
          >
            ← SLIDE LEFT
          </button>
          <button
            onClick={slideRight}
            disabled={windowStart >= arr.length - K}
            style={{
              padding: "10px 20px",
              background: windowStart >= arr.length - K ? "rgba(16,185,129,0.02)" : "rgba(16,185,129,0.08)",
              border: `1px solid ${windowStart >= arr.length - K ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.3)"}`,
              borderRadius: 5, cursor: windowStart >= arr.length - K ? "not-allowed" : "pointer",
              fontSize: 11, color: windowStart >= arr.length - K ? "#1a4a3a" : "#10b981",
              fontFamily: "inherit", letterSpacing: "0.08em",
              transition: "all 0.12s",
            }}
          >
            SLIDE RIGHT →
          </button>
        </div>
      )}

      {!solved && (
        <button
          onClick={lockIn}
          style={{
            padding: "10px 28px",
            background: flash === "error" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
            border: `1px solid ${flash === "error" ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"}`,
            borderRadius: 5, cursor: "pointer",
            fontSize: 11, color: flash === "error" ? "#ef4444" : "#10b981",
            fontFamily: "inherit", letterSpacing: "0.1em", fontWeight: 700,
            transition: "all 0.15s", marginBottom: 12,
          }}
        >
          LOCK IN
        </button>
      )}

      {showCorrect && !solved && (
        <div style={{
          padding: "10px 16px",
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 4, fontSize: 10, color: "#ef4444",
          letterSpacing: "0.06em", textAlign: "center",
        }}>
          NOT THE MAX — CORRECT WINDOW STARTS AT INDEX {maxAvgStart}
          <br />
          <span style={{ fontSize: 9, color: "#7f1d1d" }}>MAX AVG = {(maxSum / K).toFixed(2)}</span>
        </div>
      )}

      {solved && (
        <div style={{
          padding: "16px 24px",
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 6, fontSize: 11, color: "#22c55e",
          letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.8,
        }}>
          MAX AVERAGE WINDOW FOUND!
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            [{arr.slice(windowStart, windowStart + K).join(", ")}] → AVG {currentAvg.toFixed(2)}
          </span>
        </div>
      )}

      {/* Explanation footer */}
      <div style={{
        marginTop: 24, width: "100%", maxWidth: 540,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414",
        borderRadius: 4,
        fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        FIXED WINDOW: SUBTRACT LEFT ELEMENT, ADD RIGHT ELEMENT → O(n) NOT O(n·k)
      </div>
    </div>
  );
}
