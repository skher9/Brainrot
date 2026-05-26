"use client";

import { useState, useEffect } from "react";
import { generateBubbleSortSteps, SortStep } from "@/lib/bubbleSort";
import { Corners, Magnetic, fireBurst } from "@/components/Effects";
import { Play, ArrowRight, Live } from "@/components/Glyphs";

const COLD_ARRAY = [64, 34, 25, 12, 22, 11, 90];
const MAX_VAL = Math.max(...COLD_ARRAY);

const BAR_PALETTE = [
  { top: "#c4b5fd", bot: "#5b21b6", glowC: "rgba(167,139,250,0.45)" },
  { top: "#a5f3fc", bot: "#0e7490", glowC: "rgba(103,232,249,0.35)" },
  { top: "#fde68a", bot: "#92400e", glowC: "rgba(246,196,83,0.4)"  },
  { top: "#fda4af", bot: "#9f1239", glowC: "rgba(251,113,133,0.35)" },
  { top: "#6ee7b7", bot: "#065f46", glowC: "rgba(110,231,183,0.35)" },
  { top: "#93c5fd", bot: "#1d4ed8", glowC: "rgba(147,197,253,0.3)"  },
  { top: "#fed7aa", bot: "#7c2d12", glowC: "rgba(254,215,170,0.3)"  },
];

function CornerTag({
  pos, label, sub, live,
}: {
  pos: React.CSSProperties;
  label: string;
  sub: string;
  live?: boolean;
}) {
  return (
    <div style={{
      position: "fixed", ...pos,
      display: "flex", flexDirection: "column", gap: 3,
      fontFamily: "var(--font-mono)",
      fontSize: 9, letterSpacing: "0.18em",
      color: "rgba(235,233,227,0.45)",
      zIndex: 5,
      pointerEvents: "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {live && <Live size={6} color="#fb7185" />}
        <span style={{ color: "rgba(246,196,83,0.7)" }}>{label}</span>
      </div>
      <span style={{ color: "rgba(235,233,227,0.3)", fontSize: 8 }}>{sub}</span>
    </div>
  );
}

function BarConsole({ stepIdx, steps }: { stepIdx: number; steps: SortStep[] }) {
  const step = steps[stepIdx];

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 720 }}>
      <Corners color="rgba(167,139,250,0.45)" size={12} thickness={1.2} />
      <div style={{
        background: "linear-gradient(180deg, rgba(167,139,250,0.04) 0%, rgba(0,0,0,0) 100%), rgba(12,12,20,0.5)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        padding: "28px 32px 20px",
        position: "relative",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
      }}>
        {/* Grid bg */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          opacity: 0.5,
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 30%, transparent 80%)",
          maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 80%)",
          pointerEvents: "none",
        }} />

        {/* Top label row */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 18, position: "relative",
        }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9,
            letterSpacing: "0.2em", color: "rgba(246,196,83,0.7)",
          }}>
            BUBBLE.SORT · PASS {Math.floor(stepIdx / 10) + 1}
          </span>
          <div style={{ display: "flex", gap: 5 }}>
            {steps.slice(0, 12).map((_, i) => (
              <span key={i} style={{
                width: 14, height: 2,
                background: i <= (stepIdx % 12) ? "#f6c453" : "rgba(255,255,255,0.1)",
                transition: "all 0.3s",
                display: "inline-block",
              }} />
            ))}
          </div>
        </div>

        {/* Bars */}
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 14,
          height: 220, position: "relative",
        }}>
          {step.array.map((val, i) => {
            const isComparing = step.comparing && (i === step.comparing[0] || i === step.comparing[1]);
            const isSorted = step.sortedIndices.includes(i);
            const isSwap = step.swapped && isComparing;
            const palette = BAR_PALETTE[i % BAR_PALETTE.length];
            const height = Math.max(20, (val / MAX_VAL) * 200);

            let top = palette.top, bot = palette.bot, glowC = palette.glowC, glow = 12;
            if (isSorted)   { top = "#6ee7b7"; bot = "#065f46"; glowC = "rgba(110,231,183,0.55)"; glow = 18; }
            if (isComparing){ top = "#fde68a"; bot = "#92400e"; glowC = "rgba(246,196,83,0.7)";  glow = 22; }
            if (isSwap)     { top = "#fda4af"; bot = "#9f1239"; glowC = "rgba(251,113,133,0.65)"; glow = 22; }

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div
                  className="bar-base"
                  style={{
                    width: 48,
                    height,
                    ["--bc-top" as string]: top,
                    ["--bc-bot" as string]: bot,
                    ["--bar-glow" as string]: glow + "px",
                    ["--bar-glow-c" as string]: glowC,
                    transition: "height 0.42s cubic-bezier(.16,1,.3,1), box-shadow 0.3s",
                  }}
                />
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.05em",
                  color: isComparing ? "#f6c453" : isSorted ? "#6ee7b7" : "rgba(235,233,227,0.3)",
                }}>
                  {String(val).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step caption */}
        <div style={{
          marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "relative",
        }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.4)",
          }}>
            STEP {String(stepIdx + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </span>
          <span style={{
            fontSize: 12, color: "rgba(235,233,227,0.55)",
            fontStyle: "italic", maxWidth: 480, textAlign: "right",
          }}>
            {step.description}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ColdOpen({ onStart }: { onStart: () => void }) {
  const [steps] = useState(() => generateBubbleSortSteps(COLD_ARRAY));
  const [stepIdx, setStepIdx] = useState(4);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setStepIdx((p) => (p + 1 >= steps.length ? 0 : p + 1)), 720);
    return () => clearInterval(t);
  }, [steps.length]);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "60px 24px 40px",
      position: "relative",
      background: "var(--bg-0)",
    }}>
      {/* Radial glow bg */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(124,58,237,0.07) 0%, transparent 70%)",
      }} />

      {/* Floating corner tags */}
      <CornerTag pos={{ top: 28, left: 28 }}  label="01 / 06" sub="initiating sequence" />
      <CornerTag pos={{ top: 28, right: 28 }} label="1,247 LIVE" sub="learners online" live />
      <CornerTag pos={{ bottom: 28, left: 28 }} label="BUBBLE.SORT" sub="dataset: 7 nodes" />
      <CornerTag pos={{ bottom: 28, right: 28 }} label="LATENCY 12MS" sub="render: stable" />

      {/* BRAINROT ACADEMY center label */}
      <div style={{
        position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 10,
        zIndex: 5,
      }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 9,
          color: "rgba(167,139,250,0.7)", letterSpacing: "0.3em",
        }}>◆ BRAINROT ACADEMY ◆</span>
      </div>

      {/* Center visual stack */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 36,
        maxWidth: 880, width: "100%",
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.8s cubic-bezier(.16,1,.3,1)",
        position: "relative", zIndex: 1,
      }}>
        {/* Display title */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.35em",
            color: "rgba(246,196,83,0.7)", marginBottom: 18,
          }}>
            <span style={{ color: "rgba(246,196,83,0.4)" }}>◇</span>
            &nbsp;&nbsp;ALGORITHMS, FELT IN THE FINGERS&nbsp;&nbsp;
            <span style={{ color: "rgba(246,196,83,0.4)" }}>◇</span>
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(56px, 9vw, 120px)",
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
            color: "#ebe9e3",
            marginBottom: 18,
            textShadow: "0 0 60px rgba(167,139,250,0.15)",
          }}>
            Rot{" "}
            <em style={{
              fontStyle: "italic",
              background: "linear-gradient(120deg,#f6c453 20%,#a78bfa 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>smarter.</em>
          </h1>
          <p style={{
            fontSize: 16, color: "rgba(235,233,227,0.55)",
            letterSpacing: "0.02em", maxWidth: 520, margin: "0 auto",
            lineHeight: 1.55,
          }}>
            A six-stage descent into bubble sort. Watch it. Drive it. Race it.
            Debug it. Survive the boss. Carry the pattern.
          </p>
        </div>

        {/* Animated bar console */}
        <BarConsole stepIdx={stepIdx} steps={steps} />

        {/* CTAs */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          flexWrap: "wrap", justifyContent: "center", marginTop: -8,
        }}>
          <Magnetic strength={0.25}>
            <button
              className="btn-primary chrome-edge"
              onClick={(e) => {
                fireBurst(e, 25, "XP");
                setTimeout(onStart, 220);
              }}
              style={{ padding: "14px 28px", fontSize: 14 }}
            >
              <Play size={12} color="#fff4d6" />
              Begin the descent
              <ArrowRight size={14} color="#fff4d6" />
            </button>
          </Magnetic>

          <Magnetic strength={0.2}>
            <button
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 22px", fontSize: 14,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "var(--radius-md)",
                color: "var(--ink-2)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--ink)";
                e.currentTarget.style.background = "var(--panel)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--ink-2)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              Tour the map
            </button>
          </Magnetic>
        </div>

        {/* Trust strip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 22,
          flexWrap: "wrap", justifyContent: "center", marginTop: 6,
        }}>
          {[
            { v: "6",     l: "STAGES"       },
            { v: "12",    l: "MIN AVG"       },
            { v: "1,247", l: "ONLINE NOW"    },
            { v: "94%",   l: "COMPLETE RATE" },
          ].map((s, i, arr) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 18,
                  color: "#ebe9e3", fontWeight: 600,
                }}>{s.v}</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9,
                  letterSpacing: "0.2em", color: "rgba(235,233,227,0.35)",
                }}>{s.l}</span>
              </div>
              {i < arr.length - 1 && (
                <span style={{ width: 1, height: 22, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
