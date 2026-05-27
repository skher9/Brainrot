"use client";
import { useCallback, useEffect, useState } from "react";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";

type Mechanic = "find_first_true" | "binary_search_on_condition";

interface Props {
  mechanic: Mechanic;
  onSolve: (attempts: number) => void;
  onAttempt?: () => void;
}

interface NeighborInfo {
  leftHigher: boolean | null;
  rightHigher: boolean | null;
}

function genContaminatedBatch() {
  const n = 16 + Math.floor(Math.random() * 8); // 16-24
  const answer = 2 + Math.floor(Math.random() * (n - 2)); // first contaminated
  const budget = Math.ceil(Math.log2(n)) + 2;
  return { n, answer, budget, isMountain: false };
}

function genMountain() {
  const n = 12 + Math.floor(Math.random() * 8);
  const arr: number[] = [];
  const peakIdx = 2 + Math.floor(Math.random() * (n - 4));
  // ascending then descending
  let val = 10 + Math.floor(Math.random() * 30);
  for (let i = 0; i < n; i++) {
    arr.push(val);
    if (i < peakIdx) val += 5 + Math.floor(Math.random() * 20);
    else val -= 5 + Math.floor(Math.random() * 15);
  }
  const budget = Math.ceil(Math.log2(n)) + 1;
  return { n, answer: peakIdx, budget, arr, isMountain: true };
}

const S: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
};

export default function ResourceConstraintGame({ mechanic, onSolve, onAttempt }: Props) {
  const [n, setN] = useState(20);
  const [answer, setAnswer] = useState(0);
  const [budget, setBudget] = useState(0);
  const [budgetUsed, setBudgetUsed] = useState(0);
  const [revealed, setRevealed] = useState<Map<number, boolean>>(new Map());
  const [neighborInfo, setNeighborInfo] = useState<Map<number, NeighborInfo>>(new Map());
  const [mountainArr, setMountainArr] = useState<number[]>([]);
  const [found, setFound] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lastRevealed, setLastRevealed] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("");
  const [hint3, setHint3] = useState(false);
  const [localAttempts, setLocalAttempts] = useState(0);

  const init = useCallback(() => {
    if (mechanic === "find_first_true") {
      const g = genContaminatedBatch();
      setN(g.n);
      setAnswer(g.answer);
      setBudget(g.budget);
    } else {
      const g = genMountain();
      setN(g.n);
      setAnswer(g.answer);
      setBudget(g.budget);
      setMountainArr(g.arr);
    }
    setBudgetUsed(0);
    setRevealed(new Map());
    setNeighborInfo(new Map());
    setFound(false);
    setFailed(false);
    setLastRevealed(null);
    setAttempts(0);
    setLocalAttempts(0);
    setHint3(false);
    setMessage(
      mechanic === "find_first_true"
        ? "Click a batch to test it. Find the first contaminated one within budget."
        : "Click a position to scan it. Battery shows elevation direction. Find the peak."
    );
  }, [mechanic]);

  useEffect(() => { init(); }, [init]);

  const handleClick = (idx: number) => {
    if (found || failed || revealed.has(idx)) return;

    const newBudgetUsed = budgetUsed + 1;
    setBudgetUsed(newBudgetUsed);
    setLastRevealed(idx);

    const newRev = new Map(revealed);

    if (mechanic === "find_first_true") {
      const contaminated = idx >= answer;
      newRev.set(idx, contaminated);
      setRevealed(newRev);

      if (contaminated) {
        // Found a contaminated — is it the first? Only if idx === answer or user confirmed
        // Let them find exact boundary
        if (idx === answer) {
          // Check if they know it's the first (no clean neighbor to the left unless answer===0)
          const allLeftClean = answer === 0 || (newRev.has(idx - 1) && !newRev.get(idx - 1));
          if (allLeftClean) {
            completionSound();
            setFound(true);
            setMessage(`✓ Found! Batch ${idx + 1} is the first contaminated. Used ${newBudgetUsed}/${budget} tests.`);
            onSolve(localAttempts + 1);
            return;
          }
        }
        setMessage(`Batch ${idx + 1} is CONTAMINATED 🔴. The first contamination is ≤ batch ${idx + 1}. Keep narrowing.`);
      } else {
        setMessage(`Batch ${idx + 1} is CLEAN 🟢. First contamination is > batch ${idx + 1}. Keep narrowing.`);
      }

      // Check if converged
      if (newBudgetUsed < budget) {
        // Auto-detect: if all batches before answer are revealed clean, and answer is revealed contaminated
        let found_ = false;
        if (newRev.has(answer) && newRev.get(answer)) {
          const leftOk = answer === 0 || (newRev.has(answer - 1) && !newRev.get(answer - 1));
          if (leftOk) { found_ = true; }
        }
        if (found_) {
          completionSound();
          setFound(true);
          setMessage(`✓ Found! Batch ${answer + 1} is the first contaminated. Used ${newBudgetUsed}/${budget} tests.`);
          onSolve(localAttempts + 1);
        }
      }
    } else {
      // Mountain mode — reveal elevation direction
      const arr = mountainArr;
      const isHigherThanRight = idx + 1 < arr.length ? arr[idx] > arr[idx + 1] : true;
      const isHigherThanLeft = idx - 1 >= 0 ? arr[idx] > arr[idx - 1] : true;
      newRev.set(idx, isHigherThanLeft && isHigherThanRight);
      const newNeighbor = new Map(neighborInfo);
      newNeighbor.set(idx, {
        leftHigher: idx - 1 >= 0 ? arr[idx] > arr[idx - 1] : null,
        rightHigher: idx + 1 < n ? arr[idx + 1] > arr[idx] : null,
      });
      setNeighborInfo(newNeighbor);
      setRevealed(newRev);

      if (isHigherThanLeft && isHigherThanRight) {
        completionSound();
        setFound(true);
        setMessage(`✓ Peak found at index ${idx}! Used ${newBudgetUsed}/${budget} battery.`);
        onSolve(localAttempts + 1);
        return;
      }

      const info = newNeighbor.get(idx)!;
      if (info.rightHigher) {
        setMessage(`Index ${idx}: right neighbor is higher → peak is to the right. Search right half.`);
      } else {
        setMessage(`Index ${idx}: left neighbor is higher (or at edge) → peak is to the left. Search left half.`);
      }
    }

    if (newBudgetUsed >= budget && !found) {
      wrongSound();
      setFailed(true);
      setMessage(
        mechanic === "find_first_true"
          ? `Budget exhausted! ${budget} tests used. Factory fined. Think in halves — try again.`
          : `Battery dead! ${budget} scans used. Try binary search — pick the middle. Try again.`
      );
      setLocalAttempts(a => a + 1);
      onAttempt?.();
    }

    // Auto hint after 3 linear attempts
    const newLocalAttempts = localAttempts + 1;
    setLocalAttempts(newLocalAttempts);
    if (newLocalAttempts >= 3 && !hint3) setHint3(true);
  };

  const maxHeight = 80;
  const barHeights = mountainArr.length > 0
    ? mountainArr.map(v => (v / Math.max(...mountainArr)) * maxHeight)
    : [];

  return (
    <div style={{ ...S, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Budget bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.1em" }}>
          {mechanic === "find_first_true" ? "BUDGET" : "BATTERY"}:
          <span style={{
            marginLeft: 8, fontWeight: 700,
            color: budget - budgetUsed <= 2 ? "#ef4444" : "#e2e8f0",
          }}>
            {budget - budgetUsed} / {budget} remaining
          </span>
        </div>
        <div style={{ fontSize: 10, color: "#475569" }}>n = {n}</div>
      </div>

      {/* Batch boxes (P2) */}
      {mechanic === "find_first_true" && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {Array.from({ length: n }, (_, idx) => {
            const rev = revealed.get(idx);
            const isContam = rev === true;
            const isClean = rev === false;
            return (
              <button
                key={idx}
                onClick={() => handleClick(idx)}
                style={{
                  width: 38, height: 38,
                  background: isContam ? "rgba(239,68,68,0.15)" : isClean ? "rgba(34,197,94,0.1)" : "#1a1a1a",
                  border: `1.5px solid ${isContam ? "#ef4444" : isClean ? "#22c55e" : lastRevealed === idx ? "#eab308" : "#2a2a2a"}`,
                  borderRadius: 3, cursor: revealed.has(idx) || found || failed ? "default" : "pointer",
                  color: isContam ? "#ef4444" : isClean ? "#22c55e" : "#475569",
                  fontFamily: "inherit", fontSize: 10, fontWeight: 700,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                }}>
                <span>{idx + 1}</span>
                <span style={{ fontSize: 8 }}>{isContam ? "✗" : isClean ? "✓" : "?"}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Mountain bars (P4) */}
      {mechanic === "binary_search_on_condition" && (
        <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 110 }}>
          {Array.from({ length: n }, (_, idx) => {
            const info = neighborInfo.get(idx);
            const isPeak = revealed.get(idx) === true;
            const isScanned = revealed.has(idx);
            return (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, cursor: isScanned || found || failed ? "default" : "pointer" }}
                onClick={() => !isScanned && !found && !failed && handleClick(idx)}>
                {/* Neighbor arrows */}
                <div style={{ height: 16, fontSize: 10, color: "#64748b", display: "flex", alignItems: "center", gap: 2 }}>
                  {info && (
                    <>
                      {info.leftHigher === false && <span style={{ color: "#3b82f6" }}>←</span>}
                      {info.rightHigher === true && <span style={{ color: "#f97316" }}>→</span>}
                      {isPeak && <span style={{ color: "#22c55e" }}>★</span>}
                    </>
                  )}
                </div>
                {/* Bar */}
                <div style={{
                  width: "100%", height: barHeights[idx] || 8,
                  background: isPeak ? "rgba(34,197,94,0.4)" : isScanned ? "rgba(234,179,8,0.3)" : "rgba(167,139,250,0.2)",
                  border: `1px solid ${isPeak ? "#22c55e" : isScanned ? "#eab308" : "rgba(167,139,250,0.3)"}`,
                  borderRadius: "2px 2px 0 0",
                }} />
                {/* Index */}
                <div style={{ fontSize: 7, color: "#374151", marginTop: 2 }}>{idx}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Message */}
      <div style={{
        padding: "10px 14px",
        background: found ? "rgba(34,197,94,0.08)" : failed ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${found ? "rgba(34,197,94,0.3)" : failed ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 4, fontSize: 12,
        color: found ? "#22c55e" : failed ? "#ef4444" : "#94a3b8",
        lineHeight: 1.5,
      }}>
        {message}
      </div>

      {hint3 && !found && (
        <div style={{ padding: "8px 12px", background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 4, fontSize: 11, color: "#d97706" }}>
          💡 Hint: Pick the element in the MIDDLE of your remaining search range. Each test eliminates half.
        </div>
      )}

      {failed && (
        <button onClick={init} style={{
          padding: "8px 0", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 4, color: "#ef4444", cursor: "pointer", fontFamily: "inherit", fontSize: 12, letterSpacing: "0.1em",
        }}>
          TRY AGAIN
        </button>
      )}

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
