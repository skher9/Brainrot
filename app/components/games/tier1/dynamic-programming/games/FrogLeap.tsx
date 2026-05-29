"use client";
import { useState, useCallback, useRef } from "react";
import type { GameProps } from "../types";

function playTone(freq: number, type: OscillatorType = "sine", dur = 0.12) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}

const PAD_COUNT = 7;
const HOP_FREQS = [220, 262, 330, 392, 494, 587, 698];

function initDp(): number[] {
  const dp = new Array(PAD_COUNT).fill(-1);
  dp[0] = 1;
  dp[1] = 1;
  return dp;
}

export default function FrogLeap({ onSolve, onAttempt }: GameProps) {
  const [frogPos, setFrogPos] = useState(0);
  const [dp, setDp] = useState<number[]>(initDp);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [justHopped, setJustHopped] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const hasAttempted = useRef(false);
  const solvedRef = useRef(false);

  const canHop = (target: number) => {
    if (solved) return false;
    return (target === frogPos + 1 || target === frogPos + 2) && target < PAD_COUNT;
  };

  const hop = useCallback((target: number) => {
    if (!canHop(target) || solved) return;

    if (!hasAttempted.current) {
      hasAttempted.current = true;
      onAttempt();
    }

    playTone(HOP_FREQS[target], "sine", 0.18);

    const newDp = [...dp];
    if (newDp[target] === -1) {
      const prev1 = newDp[target - 1] > 0 ? newDp[target - 1] : 0;
      const prev2 = target >= 2 && newDp[target - 2] > 0 ? newDp[target - 2] : 0;
      newDp[target] = prev1 + prev2;
    }

    const newVisited = new Set(visited);
    newVisited.add(target);

    setDp(newDp);
    setVisited(newVisited);
    setFrogPos(target);
    setJustHopped(target);
    setTimeout(() => setJustHopped(null), 400);

    if (target === PAD_COUNT - 1 && !solvedRef.current) {
      solvedRef.current = true;
      setSolved(true);
      playTone(880, "sine", 0.4);
      setTimeout(() => playTone(1108, "sine", 0.4), 150);
      setTimeout(() => onSolve(), 1000);
    }
  }, [frogPos, dp, visited, solved, onAttempt, onSolve]);

  const reset = useCallback(() => {
    setFrogPos(0);
    setDp(initDp());
    setVisited(new Set([0]));
    setJustHopped(null);
    setSolved(false);
    solvedRef.current = false;
    hasAttempted.current = false;
  }, []);

  const padAngles = Array.from({ length: PAD_COUNT }, (_, i) => {
    const t = i / (PAD_COUNT - 1);
    return -0.25 + t * 0.5;
  });

  return (
    <>
      <style>{`
        @keyframes fl-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.5); transform: scale(1); }
          50% { box-shadow: 0 0 0 8px rgba(129,140,248,0); transform: scale(1.06); }
        }
        @keyframes fl-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.22); }
          100% { transform: scale(1); }
        }
        @keyframes fl-frog-bounce {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fl-number-in {
          0% { transform: scale(0) translateY(6px); opacity: 0; }
          70% { transform: scale(1.15) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0px); opacity: 1; }
        }
        @keyframes fl-win-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.6); }
          50% { box-shadow: 0 0 24px 8px rgba(129,140,248,0.25); }
        }
      `}</style>

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        minHeight: "100%",
        background: "#0a0a0a",
        padding: "24px 16px 20px",
        fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
        color: "#e5e7eb",
        gap: 0,
        boxSizing: "border-box",
        userSelect: "none",
      }}>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#6b7280", marginBottom: 4 }}>
            FROG LEAP
          </div>
          <div style={{ fontSize: 11, color: "#4b5563", letterSpacing: 1 }}>
            CLIMB STAIRS — CLICK A LIT PAD TO HOP (+1 OR +2)
          </div>
        </div>

        <div style={{
          width: "100%",
          maxWidth: 560,
          background: "linear-gradient(180deg, #0d1a2e 0%, #060d1a 100%)",
          border: "1px solid #0f2040",
          borderRadius: 16,
          padding: "32px 16px 20px",
          position: "relative",
          minHeight: 200,
        }}>

          <div style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 8,
            paddingBottom: 24,
          }}>
            {Array.from({ length: PAD_COUNT }, (_, i) => {
              const isCurrent = frogPos === i;
              const isHoppable = canHop(i);
              const isVisited = visited.has(i);
              const isJustHopped = justHopped === i;

              const arcOffset = Math.sin((i / (PAD_COUNT - 1)) * Math.PI) * 18;

              let padColor = "#1a3a1a";
              if (isCurrent) padColor = "#2a4a2a";
              else if (isVisited) padColor = "#1e3a1e";
              else if (isHoppable) padColor = "#1a2060";

              let borderColor = "#2a5a2a";
              if (isCurrent) borderColor = "#4a9a4a";
              else if (isHoppable) borderColor = "#818cf8";
              else if (isVisited) borderColor = "#2a5a2a";
              else borderColor = "#0f2a0f";

              return (
                <div
                  key={i}
                  onClick={() => hop(i)}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: arcOffset,
                    cursor: isHoppable ? "pointer" : "default",
                  }}
                >
                  <div style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    background: padColor,
                    border: `2px solid ${borderColor}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    animation: isCurrent
                      ? "fl-frog-bounce 1s ease-in-out infinite"
                      : isHoppable
                      ? "fl-pulse 1.2s ease-in-out infinite"
                      : isJustHopped
                      ? "fl-pop 0.4s ease"
                      : "none",
                    transition: "background 0.2s, border-color 0.2s",
                  }}>
                    {isCurrent && (
                      <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 2 }}>🐸</div>
                    )}
                    <div style={{
                      fontSize: isCurrent ? 9 : 10,
                      color: isCurrent ? "#6ee7a0" : isHoppable ? "#a5b4fc" : isVisited ? "#4ade80" : "#374151",
                      fontWeight: 600,
                      letterSpacing: 0.5,
                    }}>
                      {i}
                    </div>
                  </div>

                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isVisited
                      ? (isCurrent ? "#a5b4fc" : "#4ade80")
                      : isHoppable
                      ? "#818cf8"
                      : "#374151",
                    minHeight: 16,
                    animation: isJustHopped && dp[i] !== -1 ? "fl-number-in 0.35s ease" : "none",
                  }}>
                    {dp[i] !== -1 ? dp[i] : "?"}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            borderTop: "1px solid #0f2040",
            paddingTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 9,
            color: "#4b5563",
            letterSpacing: 1,
          }}>
            <span>PAD {frogPos} → PAD 6</span>
            <span style={{ color: dp[6] !== -1 ? "#818cf8" : "#4b5563" }}>
              {dp[6] !== -1 ? `WAYS TO REACH PAD 6: ${dp[6]}` : "WAYS TO REACH PAD 6: ?"}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 400,
          }}>
            {Array.from({ length: PAD_COUNT }, (_, i) => (
              <div key={i} style={{
                padding: "4px 8px",
                background: dp[i] !== -1 ? "rgba(129,140,248,0.08)" : "transparent",
                border: `1px solid ${dp[i] !== -1 ? "rgba(129,140,248,0.3)" : "#1e1e1e"}`,
                borderRadius: 4,
                fontSize: 10,
                color: dp[i] !== -1 ? "#818cf8" : "#374151",
                transition: "all 0.3s",
              }}>
                dp[{i}]={dp[i] !== -1 ? dp[i] : "?"}
              </div>
            ))}
          </div>

          {solved && (
            <div style={{
              marginTop: 8,
              textAlign: "center",
              animation: "fl-win-glow 1.5s ease-in-out infinite",
            }}>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#818cf8",
                letterSpacing: 3,
                marginBottom: 10,
              }}>
                REACHED PAD 6 — {dp[6]} WAYS EXIST
              </div>
              <button
                onClick={reset}
                style={{
                  padding: "6px 20px",
                  background: "rgba(129,140,248,0.1)",
                  border: "1px solid rgba(129,140,248,0.4)",
                  borderRadius: 6,
                  color: "#818cf8",
                  fontSize: 10,
                  letterSpacing: 2,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                [ RESET ]
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
