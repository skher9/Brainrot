"use client";
import { useCallback, useEffect, useState } from "react";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";

interface Props {
  onSolve: (attempts: number) => void;
  onAttempt?: () => void;
}

function genProblem() {
  const n = 7 + Math.floor(Math.random() * 4);
  const arr: number[] = [];
  let cur = 2 + Math.floor(Math.random() * 8);
  for (let i = 0; i < n; i++) {
    arr.push(cur);
    cur += 2 + Math.floor(Math.random() * 8);
  }
  // target: sometimes in array range (find insertion before equal), sometimes outside
  const inRange = Math.random() < 0.7;
  let target: number;
  if (inRange) {
    const idx = Math.floor(Math.random() * (n - 1));
    target = arr[idx] + 1;
    if (target === arr[idx + 1]) target = arr[idx + 1]; // test exact match
  } else {
    target = cur + Math.floor(Math.random() * 10);
  }
  // correct insertion index = first index where arr[i] >= target
  let correctIdx = n;
  for (let i = 0; i < n; i++) {
    if (arr[i] >= target) { correctIdx = i; break; }
  }
  return { arr, target, correctIdx };
}

const S: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
};

export default function DragInsertGame({ onSolve, onAttempt }: Props) {
  const [arr, setArr] = useState<number[]>([]);
  const [target, setTarget] = useState(0);
  const [correctIdx, setCorrectIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);
  const [gapIndex, setGapIndex] = useState(0); // gap appears BEFORE this index (0..n)
  const [phase, setPhase] = useState<"navigating" | "complete">("navigating");
  const [attempts, setAttempts] = useState(0);
  const [wrongAnim, setWrongAnim] = useState(false);
  const [steps, setSteps] = useState(0);
  const [message, setMessage] = useState("");

  const init = useCallback(() => {
    const g = genProblem();
    setArr(g.arr);
    setTarget(g.target);
    setCorrectIdx(g.correctIdx);
    setLeft(0);
    setRight(g.arr.length);
    setGapIndex(Math.floor(g.arr.length / 2));
    setPhase("navigating");
    setAttempts(0);
    setSteps(0);
    setWrongAnim(false);
    setMessage(`Find where to insert score ${g.target}. Use LEFT/RIGHT to navigate, then CONFIRM.`);
  }, []);

  useEffect(() => { init(); }, [init]);

  const mid = () => Math.floor((left + right) / 2);

  const handleLeft = () => {
    if (phase !== "navigating") return;
    const newRight = gapIndex;
    const newGap = Math.floor((left + newRight) / 2);
    setRight(newRight);
    setGapIndex(newGap);
    setSteps(s => s + 1);
    if (left === newRight) {
      setMessage(`Narrowed to index ${left}. Press CONFIRM to insert here.`);
    } else {
      setMessage(`Target might be to the LEFT. Gap moved to index ${newGap}.`);
    }
  };

  const handleRight = () => {
    if (phase !== "navigating") return;
    const newLeft = gapIndex;
    const newGap = Math.floor((newLeft + right) / 2);
    // If newLeft + right == newLeft (no movement), move gap to right
    const finalGap = newLeft === newGap ? right : newGap;
    setLeft(newLeft);
    setGapIndex(finalGap);
    setSteps(s => s + 1);
    if (newLeft === right) {
      setMessage(`Narrowed to index ${newLeft}. Press CONFIRM to insert here.`);
    } else {
      setMessage(`Target might be to the RIGHT. Gap moved to index ${finalGap}.`);
    }
  };

  const handleConfirm = () => {
    if (phase !== "navigating") return;
    if (gapIndex === correctIdx) {
      completionSound();
      setPhase("complete");
      setMessage(`✓ Correct! Patient with score ${target} inserted at index ${gapIndex}. ${steps + 1} comparisons vs ${arr.length} linear.`);
      onSolve(attempts + 1);
    } else {
      wrongSound();
      setWrongAnim(true);
      setAttempts(a => a + 1);
      onAttempt?.();
      setTimeout(() => setWrongAnim(false), 400);
      const direction = correctIdx > gapIndex ? "further RIGHT" : "further LEFT";
      setMessage(`Wrong position. Target ${target} should be ${direction}. Keep navigating.`);
    }
  };

  const n = arr.length;

  return (
    <div style={{ ...S, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Target patient */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.1em" }}>
          NEW PATIENT: <span style={{ color: "#e2e8f0", fontWeight: 700 }}>score {target}</span>
        </div>
        <div style={{ fontSize: 10, color: "#475569" }}>STEPS: {steps}  ATTEMPTS: {attempts}</div>
      </div>

      {/* Queue */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        {Array.from({ length: n + 1 }, (_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Gap indicator */}
            {i === gapIndex && (
              <div style={{
                width: phase === "complete" ? 48 : 6,
                height: 48,
                background: phase === "complete" ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)",
                border: `1px dashed ${phase === "complete" ? "#22c55e" : "#eab308"}`,
                borderRadius: 3,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "width 0.15s",
                minWidth: phase === "complete" ? 48 : 6,
              }}>
                {phase === "complete" && (
                  <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>{target}</span>
                )}
              </div>
            )}
            {/* Card */}
            {i < n && (
              <div style={{
                width: 48, height: 48,
                background: "#1a1a1a",
                border: "1.5px solid #2a2a2a",
                borderRadius: 3,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 1,
                transform: wrongAnim ? "translateX(3px)" : "none",
                transition: "transform 0.05s",
              }}>
                <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{arr[i]}</span>
                <span style={{ fontSize: 8, color: "#374151" }}>[{i}]</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      {phase === "navigating" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleLeft} style={{
            flex: 1, padding: "10px 0",
            background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: 4, color: "#3b82f6", cursor: "pointer", fontFamily: "inherit", fontSize: 12,
          }}>
            ← Target is to the LEFT
          </button>
          <button onClick={handleConfirm} style={{
            padding: "10px 16px",
            background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)",
            borderRadius: 4, color: "#eab308", cursor: "pointer", fontFamily: "inherit", fontSize: 12,
          }}>
            CONFIRM
          </button>
          <button onClick={handleRight} style={{
            flex: 1, padding: "10px 0",
            background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)",
            borderRadius: 4, color: "#f97316", cursor: "pointer", fontFamily: "inherit", fontSize: 12,
          }}>
            Target is to the RIGHT →
          </button>
        </div>
      )}

      {/* Message */}
      <div style={{
        padding: "10px 14px",
        background: phase === "complete" ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${phase === "complete" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 4, fontSize: 12,
        color: phase === "complete" ? "#22c55e" : "#94a3b8",
        lineHeight: 1.5,
      }}>
        {message}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={init} style={{
          padding: "6px 14px", background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4,
          color: "#64748b", cursor: "pointer", fontFamily: "inherit", fontSize: 11, letterSpacing: "0.1em",
        }}>
          RESET
        </button>
      </div>
    </div>
  );
}
