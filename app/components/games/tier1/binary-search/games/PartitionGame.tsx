"use client";
import { useCallback, useEffect, useState } from "react";
import { wrongSound, completionSound } from "@/lib/sounds";
import { isValidPartition } from "@/lib/binarySearchValidator";

interface Props {
  onSolve: (attempts: number) => void;
  onAttempt?: () => void;
}

function genProblem() {
  const m = 3 + Math.floor(Math.random() * 4);
  const n = 3 + Math.floor(Math.random() * 4);
  const arrA: number[] = [];
  const arrB: number[] = [];
  let v = 1 + Math.floor(Math.random() * 6);
  for (let i = 0; i < m; i++) {
    arrA.push(v);
    v += 1 + Math.floor(Math.random() * 6);
  }
  v = 1 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) {
    arrB.push(v);
    v += 1 + Math.floor(Math.random() * 7);
  }
  arrB.sort((a, b) => a - b);
  return { arrA, arrB };
}

const S: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
};

export default function PartitionGame({ onSolve, onAttempt }: Props) {
  const [arrA, setArrA] = useState<number[]>([]);
  const [arrB, setArrB] = useState<number[]>([]);
  const [partitionA, setPartitionA] = useState(0);
  const [phase, setPhase] = useState<"searching" | "complete">("searching");
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("");
  const [wrongAnim, setWrongAnim] = useState(false);

  const init = useCallback(() => {
    const g = genProblem();
    setArrA(g.arrA);
    setArrB(g.arrB);
    setPartitionA(Math.floor(g.arrA.length / 2));
    setPhase("searching");
    setAttempts(0);
    setMessage("Click gaps in Array A to place partition. Array B adjusts automatically.");
  }, []);

  useEffect(() => { init(); }, [init]);

  const m = arrA.length;
  const n = arrB.length;
  const halfLen = Math.floor((m + n + 1) / 2);
  const partitionB = halfLen - partitionA;

  const maxLeftA = partitionA === 0 ? -Infinity : arrA[partitionA - 1];
  const minRightA = partitionA === m ? Infinity : arrA[partitionA];
  const maxLeftB = partitionB === 0 ? -Infinity : arrB[partitionB - 1];
  const minRightB = partitionB === n ? Infinity : arrB[partitionB];

  const cond1 = maxLeftA <= minRightB;
  const cond2 = maxLeftB <= minRightA;
  const bothValid = cond1 && cond2;

  const handlePartitionClick = (idx: number) => {
    if (phase !== "searching") return;
    if (idx < 0 || idx > m) return;
    setPartitionA(idx);
  };

  const handleConfirm = () => {
    if (phase !== "searching") return;
    const result = isValidPartition(arrA, arrB, partitionA);
    const next = attempts + 1;
    setAttempts(next);
    if (result.valid) {
      completionSound();
      setPhase("complete");
      setMessage(`✓ Valid! Median = ${result.median}. Left half = right elements from both arrays combined.`);
      onSolve(next);
    } else {
      wrongSound();
      setWrongAnim(true);
      onAttempt?.();
      setTimeout(() => setWrongAnim(false), 400);
      setMessage(result.feedback);
    }
  };

  const renderArray = (arr: number[], partition: number, isA: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em" }}>
        ARRAY {isA ? "A" : "B"} — partition at {partition}
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {Array.from({ length: arr.length + 1 }, (_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            {/* Gap / partition hit zone */}
            <div
              onClick={() => isA ? handlePartitionClick(i) : undefined}
              style={{
                width: i === partition ? 4 : 8,
                height: 48,
                background: i === partition
                  ? bothValid ? "rgba(34,197,94,0.7)" : "rgba(234,179,8,0.7)"
                  : "transparent",
                cursor: isA && phase === "searching" ? "pointer" : "default",
                borderRadius: 2,
                flexShrink: 0,
                transition: "all 0.1s",
              }}
            />
            {i < arr.length && (
              <div style={{
                width: 44, height: 48,
                background: i < partition
                  ? "rgba(59,130,246,0.12)"
                  : "rgba(249,115,22,0.08)",
                border: `1.5px solid ${i < partition ? "rgba(59,130,246,0.35)" : "rgba(249,115,22,0.3)"}`,
                borderRadius: 3,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 2,
                transform: wrongAnim ? "translateX(2px)" : "none",
                transition: "transform 0.05s, background 0.1s",
              }}>
                <span style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{arr[i]}</span>
                <span style={{ fontSize: 7, color: "#374151" }}>[{i}]</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Left / right labels */}
      {partition > 0 || partition < arr.length ? (
        <div style={{ display: "flex", fontSize: 9, color: "#374151", gap: 4 }}>
          <span style={{ color: "#3b82f6" }}>← LEFT ({partition} elem)</span>
          <span style={{ color: "#f97316", marginLeft: 4 }}>RIGHT ({arr.length - partition} elem) →</span>
        </div>
      ) : null}
    </div>
  );

  return (
    <div style={{ ...S, display: "flex", flexDirection: "column", gap: 14 }}>
      {arrA.length > 0 && (
        <>
          {renderArray(arrA, partitionA, true)}
          {renderArray(arrB, partitionB, false)}
        </>
      )}

      {/* Validation panel */}
      {arrA.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
          padding: "10px 12px",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 4,
        }}>
          <div style={{ fontSize: 11, color: cond1 ? "#22c55e" : "#ef4444" }}>
            {cond1 ? "✓" : "✗"} maxL_A ({maxLeftA === -Infinity ? "−∞" : maxLeftA}) ≤ minR_B ({minRightB === Infinity ? "+∞" : minRightB})
          </div>
          <div style={{ fontSize: 11, color: cond2 ? "#22c55e" : "#ef4444" }}>
            {cond2 ? "✓" : "✗"} maxL_B ({maxLeftB === -Infinity ? "−∞" : maxLeftB}) ≤ minR_A ({minRightA === Infinity ? "+∞" : minRightA})
          </div>
          <div style={{ fontSize: 9, color: "#475569", gridColumn: "span 2" }}>
            partA={partitionA} | partB={partitionB} | halfLen={halfLen}
          </div>
        </div>
      )}

      {phase === "searching" && (
        <button onClick={handleConfirm} style={{
          padding: "10px 0",
          background: bothValid ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.06)",
          border: `1px solid ${bothValid ? "rgba(34,197,94,0.4)" : "rgba(234,179,8,0.25)"}`,
          borderRadius: 4,
          color: bothValid ? "#22c55e" : "#eab308",
          cursor: "pointer", fontFamily: "inherit", fontSize: 12, letterSpacing: "0.05em",
          transition: "all 0.15s",
        }}>
          {bothValid ? "✓ CONFIRM VALID PARTITION" : "SUBMIT PARTITION"}
        </button>
      )}

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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10, color: "#475569" }}>ATTEMPTS: {attempts}</div>
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
