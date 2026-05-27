"use client";
import { useCallback, useEffect, useState } from "react";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import {
  isValidMidPlacement,
  getBinarySearchFeedback,
  isValidPointerMove,
} from "@/lib/binarySearchValidator";

type Mechanic = "classic_binary_search" | "modified_binary_search";
type Phase = "set-mid" | "rotated-q1" | "rotated-q2" | "move-left" | "move-right" | "complete";
type Feedback = "higher" | "lower" | "found" | "not-found";

interface Props {
  mechanic: Mechanic;
  onSolve: (attempts: number) => void;
  onAttempt?: () => void;
}

function genSortedArray(): { array: number[]; target: number } {
  const n = 8 + Math.floor(Math.random() * 5);
  const arr: number[] = [];
  let cur = 10 + Math.floor(Math.random() * 40);
  for (let i = 0; i < n; i++) {
    arr.push(cur);
    cur += 3 + Math.floor(Math.random() * 12);
  }
  const present = Math.random() < 0.8;
  const target = present ? arr[Math.floor(Math.random() * n)] : cur + 5;
  return { array: arr, target };
}

function genRotatedArray(): { array: number[]; target: number } {
  const n = 7 + Math.floor(Math.random() * 4);
  const sorted: number[] = [];
  let cur = 1 + Math.floor(Math.random() * 10);
  for (let i = 0; i < n; i++) {
    sorted.push(cur);
    cur += 2 + Math.floor(Math.random() * 8);
  }
  const pivot = 1 + Math.floor(Math.random() * (n - 2));
  const rotated = [...sorted.slice(pivot), ...sorted.slice(0, pivot)];
  const present = Math.random() < 0.8;
  const target = present ? rotated[Math.floor(Math.random() * n)] : sorted[0] - 3;
  return { array: rotated, target };
}

const S: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
};

export default function PointerTraceGame({ mechanic, onSolve, onAttempt }: Props) {
  const [array, setArray] = useState<number[]>([]);
  const [target, setTarget] = useState(0);
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);
  const [mid, setMid] = useState<number | null>(null);
  const [eliminated, setEliminated] = useState<boolean[]>([]);
  const [phase, setPhase] = useState<Phase>("set-mid");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("");
  const [rotQ1, setRotQ1] = useState<"left" | "right" | null>(null);
  const [wrongQ1, setWrongQ1] = useState(false);
  const [wrongQ2, setWrongQ2] = useState(false);
  const [opCount, setOpCount] = useState(0);

  const init = useCallback(() => {
    const gen = mechanic === "classic_binary_search" ? genSortedArray() : genRotatedArray();
    setArray(gen.array);
    setTarget(gen.target);
    setLeft(0);
    setRight(gen.array.length - 1);
    setMid(null);
    setEliminated(new Array(gen.array.length).fill(false));
    setPhase("set-mid");
    setFeedback(null);
    setAttempts(0);
    setOpCount(0);
    setRotQ1(null);
    setWrongQ1(false);
    setWrongQ2(false);
    setMessage(
      mechanic === "modified_binary_search"
        ? "Rotated array detected. Pick MID — then identify which half is sorted."
        : "Set the MID pointer — click any element between LEFT and RIGHT."
    );
  }, [mechanic]);

  useEffect(() => { init(); }, [init]);

  const shake = (idx: number) => {
    setShakeIdx(idx);
    setTimeout(() => setShakeIdx(null), 400);
  };

  const handleBlockClick = (idx: number) => {
    if (phase === "complete" || phase === "rotated-q1" || phase === "rotated-q2") return;

    if (phase === "set-mid") {
      const { valid, reason } = isValidMidPlacement(left, right, idx);
      if (!valid) {
        wrongSound();
        shake(idx);
        setMessage(reason);
        setAttempts(a => a + 1);
        onAttempt?.();
        return;
      }
      setMid(idx);
      setOpCount(c => c + 1);

      if (mechanic === "modified_binary_search") {
        setPhase("rotated-q1");
        setMessage("Which half is normally sorted?");
        return;
      }

      const fb = getBinarySearchFeedback(array, target, idx);
      if (fb === "found") {
        completionSound();
        setFeedback("found");
        setPhase("complete");
        setMessage(`✓ Found! ${array[idx]} at index ${idx}.`);
        onSolve(attempts + 1);
        return;
      }
      setFeedback(fb);
      if (fb === "higher") {
        setPhase("move-left");
        setMessage(`Target (${target}) > arr[${idx}] (${array[idx]}). Move LEFT pointer right — click new LEFT position.`);
      } else {
        setPhase("move-right");
        setMessage(`Target (${target}) < arr[${idx}] (${array[idx]}). Move RIGHT pointer left — click new RIGHT position.`);
      }
    } else if (phase === "move-left") {
      if (mid === null) return;
      const { valid, reason } = isValidPointerMove({ array, target, left, right, mid, direction: "higher", clickedIndex: idx });
      if (!valid) {
        wrongSound();
        shake(idx);
        setMessage(reason);
        setAttempts(a => a + 1);
        onAttempt?.();
        return;
      }
      correctSound();
      const newElim = [...eliminated];
      for (let i = 0; i < idx; i++) newElim[i] = true;
      setEliminated(newElim);
      const newLeft = idx;
      setLeft(newLeft);
      setMid(null);
      setFeedback(null);
      setOpCount(c => c + 1);
      if (newLeft > right) {
        setPhase("complete");
        setFeedback("not-found");
        setMessage(`Search space exhausted. Target ${target} → return -1.`);
        onSolve(attempts + 1);
        return;
      }
      setPhase("set-mid");
      setMessage("LEFT pointer updated. Pick MID again.");
    } else if (phase === "move-right") {
      if (mid === null) return;
      const { valid, reason } = isValidPointerMove({ array, target, left, right, mid, direction: "lower", clickedIndex: idx });
      if (!valid) {
        wrongSound();
        shake(idx);
        setMessage(reason);
        setAttempts(a => a + 1);
        onAttempt?.();
        return;
      }
      correctSound();
      const newElim = [...eliminated];
      for (let i = idx + 1; i < array.length; i++) newElim[i] = true;
      setEliminated(newElim);
      const newRight = idx;
      setRight(newRight);
      setMid(null);
      setFeedback(null);
      setOpCount(c => c + 1);
      if (newRight < left) {
        setPhase("complete");
        setFeedback("not-found");
        setMessage(`Search space exhausted. Target ${target} → return -1.`);
        onSolve(attempts + 1);
        return;
      }
      setPhase("set-mid");
      setMessage("RIGHT pointer updated. Pick MID again.");
    }
  };

  const handleRotQ1 = (answer: "left" | "right") => {
    if (mid === null) return;
    const leftSorted = array[left] <= array[mid];
    const correct: "left" | "right" = leftSorted ? "left" : "right";
    setRotQ1(answer);
    if (answer !== correct) {
      wrongSound();
      setWrongQ1(true);
      setAttempts(a => a + 1);
      onAttempt?.();
      setMessage(`Wrong. ${correct === "left" ? "Left" : "Right"} half is sorted: arr[${left}]=${array[left]} ${leftSorted ? "≤" : ">"} arr[${mid}]=${array[mid]}`);
      setTimeout(() => { setWrongQ1(false); setRotQ1(null); }, 1600);
      return;
    }
    correctSound();
    setPhase("rotated-q2");
    setMessage("Is the target in that sorted half?");
  };

  const handleRotQ2 = (answer: boolean) => {
    if (mid === null) return;
    const leftSorted = array[left] <= array[mid];
    const targetInLeft = target >= array[left] && target <= array[mid];
    const targetInRight = target >= array[mid + 1 < array.length ? mid + 1 : mid] && target <= array[right];
    const targetInSortedHalf = leftSorted ? targetInLeft : targetInRight;

    if (answer !== targetInSortedHalf) {
      wrongSound();
      setWrongQ2(true);
      setAttempts(a => a + 1);
      onAttempt?.();
      setMessage(`Wrong. Target ${target} is ${targetInSortedHalf ? "" : "NOT "}in the sorted half.`);
      setTimeout(() => { setWrongQ2(false); }, 1600);
      return;
    }

    correctSound();
    setOpCount(c => c + 1);

    const fb = getBinarySearchFeedback(array, target, mid);
    if (fb === "found") {
      completionSound();
      setFeedback("found");
      setPhase("complete");
      setMessage(`✓ Found! ${array[mid]} at index ${mid}.`);
      onSolve(attempts + 1);
      return;
    }

    // If left sorted and target in left → go right=mid-1 (lower)
    // If left sorted and target NOT in left → go left=mid+1 (higher)
    const shouldGoRight = (leftSorted && !targetInSortedHalf) || (!leftSorted && targetInSortedHalf);
    if (shouldGoRight) {
      setFeedback("higher");
      setPhase("move-left");
      setMessage("Target is in the right half. Move LEFT pointer past mid.");
    } else {
      setFeedback("lower");
      setPhase("move-right");
      setMessage("Target is in the left half. Move RIGHT pointer before mid.");
    }
    setRotQ1(null);
  };

  const diffColor = (idx: number) => {
    if (eliminated[idx]) return "#2a2a2a";
    if (idx === mid) return "rgba(234,179,8,0.15)";
    if (idx === left && idx === right) return "rgba(91,33,182,0.2)";
    if (idx >= left && idx <= right) return "#1e1e1e";
    return "#141414";
  };

  const borderColor = (idx: number) => {
    if (idx === mid) return "#eab308";
    if (eliminated[idx]) return "#2a2a2a";
    if (idx === left) return "#3b82f6";
    if (idx === right) return "#f97316";
    if (idx >= left && idx <= right) return "#2a2a2a";
    return "#1e1e1e";
  };

  const isClickable = !["complete", "rotated-q1", "rotated-q2"].includes(phase);

  return (
    <div style={{ ...S, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Target + ops */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.12em" }}>
          TARGET: <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{target}</span>
        </div>
        <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em" }}>
          OPS: {opCount}  ATTEMPTS: {attempts}
        </div>
      </div>

      {/* Array blocks */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {array.map((val, idx) => (
          <button
            key={idx}
            onClick={() => handleBlockClick(idx)}
            style={{
              width: 52, height: 52,
              background: diffColor(idx),
              border: `1.5px solid ${borderColor(idx)}`,
              borderRadius: 4,
              cursor: isClickable && !eliminated[idx] && idx >= left && idx <= right ? "pointer" : "default",
              color: eliminated[idx] ? "#333" : idx === mid ? "#eab308" : "#e2e8f0",
              fontFamily: "inherit",
              fontSize: 13, fontWeight: 600,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 2,
              transition: "background 0.15s, border-color 0.15s, transform 0.05s",
              transform: shakeIdx === idx ? "translateX(4px)" : "none",
              opacity: eliminated[idx] ? 0.3 : 1,
              position: "relative",
            }}
          >
            <span>{val}</span>
            <span style={{ fontSize: 8, color: "#475569" }}>[{idx}]</span>
          </button>
        ))}
      </div>

      {/* Pointer labels */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {array.map((_, idx) => {
          const isL = idx === left && !eliminated[idx];
          const isR = idx === right && !eliminated[idx];
          const isM = idx === mid;
          return (
            <div key={idx} style={{ width: 52, textAlign: "center" }}>
              {isL && <div style={{ fontSize: 8, color: "#3b82f6", letterSpacing: "0.05em" }}>▲ L</div>}
              {isR && <div style={{ fontSize: 8, color: "#f97316", letterSpacing: "0.05em" }}>▲ R</div>}
              {isM && <div style={{ fontSize: 8, color: "#eab308", letterSpacing: "0.05em" }}>▲ M</div>}
              {!isL && !isR && !isM && <div style={{ fontSize: 8, color: "transparent" }}>–</div>}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, fontSize: 10, color: "#475569" }}>
        <span style={{ color: "#3b82f6" }}>■</span> LEFT
        <span style={{ color: "#f97316" }}>■</span> RIGHT
        <span style={{ color: "#eab308" }}>■</span> MID
      </div>

      {/* Phase message */}
      <div style={{
        padding: "10px 14px",
        background: phase === "complete" && feedback === "found"
          ? "rgba(34,197,94,0.08)"
          : phase === "complete"
            ? "rgba(100,116,139,0.08)"
            : "rgba(255,255,255,0.03)",
        border: `1px solid ${phase === "complete" && feedback === "found" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 4, fontSize: 12,
        color: phase === "complete" && feedback === "found" ? "#22c55e" : "#94a3b8",
        lineHeight: 1.5,
      }}>
        {message}
      </div>

      {/* Rotated Q1 */}
      {phase === "rotated-q1" && (
        <div style={{ display: "flex", gap: 8 }}>
          {(["left", "right"] as const).map(side => (
            <button key={side} onClick={() => handleRotQ1(side)}
              style={{
                flex: 1, padding: "10px 0",
                background: wrongQ1 && rotQ1 === side ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${wrongQ1 && rotQ1 === side ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 4, color: "#e2e8f0", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, letterSpacing: "0.05em",
              }}>
              {side.toUpperCase()} HALF SORTED
            </button>
          ))}
        </div>
      )}

      {/* Rotated Q2 */}
      {phase === "rotated-q2" && (
        <div style={{ display: "flex", gap: 8 }}>
          {([true, false] as const).map(ans => (
            <button key={String(ans)} onClick={() => handleRotQ2(ans)}
              style={{
                flex: 1, padding: "10px 0",
                background: wrongQ2 ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${wrongQ2 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 4, color: "#e2e8f0", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, letterSpacing: "0.05em",
              }}>
              {ans ? "YES — target is in sorted half" : "NO — target is in other half"}
            </button>
          ))}
        </div>
      )}

      {/* Reset */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={init}
          style={{
            padding: "6px 14px", background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4,
            color: "#64748b", cursor: "pointer", fontFamily: "inherit", fontSize: 11,
            letterSpacing: "0.1em",
          }}>
          RESET
        </button>
      </div>
    </div>
  );
}
