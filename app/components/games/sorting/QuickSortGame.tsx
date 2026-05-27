"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { useHints } from "@/lib/useHints";
import { useProgress } from "@/lib/useProgress";
import { getModuleConfig, getNextModule } from "@/lib/sorting/gameConfigs";
import { quickPassengerLane, quickBestPivot, shuffle } from "@/lib/sorting/algorithms";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import { useRouter } from "next/navigation";

const SLUG = "quick-sort";
const CONFIG = getModuleConfig(SLUG)!;
const TOTAL_LEVELS = CONFIG.levels.length;

const W = 840, H = 460;
const PERSON_W = 52, PERSON_H = 68;
const LINE_Y = 220;
const LEFT_X = 80, RIGHT_X = W - 80 - PERSON_W;
const PIVOT_Y = LINE_Y - 90;

interface Passenger {
  id: number;
  value: number;
  x: number;
  y: number;
  lane: "left" | "right" | "pivot" | "queue" | null;
  placed: boolean;
}

interface QuickState {
  originalArr: number[];
  queue: number[][];
  currentGroup: number[];
  pivotVal: number;
  pivotIdx: number;
  passengers: Passenger[];
  leftPlaced: number[];
  rightPlaced: number[];
  ops: number;
  phase: "choose-pivot" | "partition" | "done";
  selected: number | null;
  recursionTree: Array<{ group: number[]; pivot: number; depth: number }>;
}

function makePassengers(arr: number[]): Passenger[] {
  return arr.map((value, id) => ({
    id,
    value,
    x: 120 + id * (PERSON_W + 16),
    y: LINE_Y,
    lane: "queue",
    placed: false,
  }));
}

function QuickCanvas({ level, onComplete, watchMode }: {
  level: number; onComplete: (ops: number) => void; watchMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<QuickState | null>(null);
  const animRef = useRef(0);
  const flashRef = useRef<{ text: string; alpha: number; correct: boolean } | null>(null);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    doneRef.current = false;

    const initialArr = shuffle(Array.from({ length: 8 }, (_, i) => i + 1));
    const pivotIdx = level <= 2 ? quickBestPivot(initialArr) : 0;
    const pivotVal = initialArr[pivotIdx];
    const rest = initialArr.filter((_, i) => i !== pivotIdx);
    const passengers = makePassengers(rest);

    stateRef.current = {
      originalArr: initialArr,
      queue: [initialArr],
      currentGroup: rest,
      pivotVal,
      pivotIdx,
      passengers,
      leftPlaced: [],
      rightPlaced: [],
      ops: 0,
      phase: level === 3 || level >= 4 ? "choose-pivot" : "partition",
      selected: null,
      recursionTree: [],
    };

    // If no pivot choice needed, set it
    if (stateRef.current.phase === "partition") {
      const pivot = passengers.find((p) => p.value === pivotVal);
      if (pivot) pivot.lane = "pivot";
    }

    function handleClick(e: MouseEvent) {
      const s = stateRef.current;
      if (!s || doneRef.current) return;
      const rect = canvas!.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top) * (H / rect.height);

      if (s.phase === "choose-pivot") {
        // Click on a passenger to choose as pivot
        const clicked = s.passengers.find((p) => !p.placed && !p.lane?.startsWith("left") && !p.lane?.startsWith("right") &&
          cx > p.x && cx < p.x + PERSON_W && cy > p.y && cy < p.y + PERSON_H);
        if (!clicked) return;
        s.pivotVal = clicked.value;
        clicked.lane = "pivot";
        clicked.x = W / 2 - PERSON_W / 2;
        clicked.y = PIVOT_Y;
        s.phase = "partition";
        correctSound();
        flashRef.current = { text: `PIVOT: ${clicked.value}`, alpha: 1, correct: true };
      } else if (s.phase === "partition") {
        // Click a passenger to select
        if (s.selected === null) {
          const clicked = s.passengers.find((p) => !p.placed && p.lane === "queue" &&
            cx > p.x && cx < p.x + PERSON_W && cy > p.y && cy < p.y + PERSON_H);
          if (!clicked) return;
          s.selected = clicked.id;
          return;
        }

        // Click a lane (left or right side)
        const passenger = s.passengers.find((p) => p.id === s.selected);
        if (!passenger) { s.selected = null; return; }

        let targetLane: "left" | "right" | null = null;
        if (cx < W / 2) targetLane = "left";
        else targetLane = "right";

        const correctLane = quickPassengerLane(passenger.value, s.pivotVal);
        s.ops++;

        if (targetLane === correctLane) {
          correctSound();
          passenger.lane = correctLane;
          passenger.placed = true;
          if (correctLane === "left") {
            s.leftPlaced.push(passenger.value);
            passenger.x = LEFT_X + s.leftPlaced.length * (PERSON_W + 8) - PERSON_W;
            passenger.y = LINE_Y;
          } else {
            s.rightPlaced.push(passenger.value);
            passenger.x = W / 2 + 60 + s.rightPlaced.length * (PERSON_W + 8) - PERSON_W;
            passenger.y = LINE_Y;
          }
          flashRef.current = { text: "✓ CORRECT LANE", alpha: 1, correct: true };
          s.selected = null;

          const remaining = s.passengers.filter((p) => !p.placed && p.lane !== "pivot");
          if (remaining.length === 0 && !doneRef.current) {
            doneRef.current = true;
            completionSound();
            setTimeout(() => onComplete(s.ops), 600);
          }
        } else {
          wrongSound();
          s.selected = null;
          flashRef.current = { text: "WRONG LANE", alpha: 1, correct: false };
        }
      }
    }

    if (!watchMode) canvas.addEventListener("click", handleClick);

    if (watchMode) {
      const autoStep = () => {
        const s = stateRef.current;
        if (!s || doneRef.current) return;
        if (s.phase === "choose-pivot") {
          const best = s.passengers[Math.floor(s.passengers.length / 2)];
          if (best) {
            s.pivotVal = best.value;
            best.lane = "pivot";
            best.x = W / 2 - PERSON_W / 2;
            best.y = PIVOT_Y;
            s.phase = "partition";
            s.ops++;
          }
        } else {
          const next = s.passengers.find((p) => !p.placed && p.lane === "queue");
          if (next) {
            const lane = quickPassengerLane(next.value, s.pivotVal);
            next.lane = lane;
            next.placed = true;
            if (lane === "left") {
              s.leftPlaced.push(next.value);
              next.x = LEFT_X + s.leftPlaced.length * (PERSON_W + 8) - PERSON_W;
              next.y = LINE_Y;
            } else {
              s.rightPlaced.push(next.value);
              next.x = W / 2 + 60 + s.rightPlaced.length * (PERSON_W + 8) - PERSON_W;
              next.y = LINE_Y;
            }
            s.ops++;
            const remaining = s.passengers.filter((p) => !p.placed && p.lane !== "pivot");
            if (remaining.length === 0 && !doneRef.current) {
              doneRef.current = true;
              completionSound();
              setTimeout(() => onComplete(s.ops), 600);
              return;
            }
          }
        }
        if (!doneRef.current) watchTimerRef.current = setTimeout(autoStep, 800);
      };
      watchTimerRef.current = setTimeout(autoStep, 900);
    }

    function drawPassenger(p: Passenger, selected: boolean) {
      const isPivot = p.lane === "pivot";
      const isSelected = selected;

      // Body
      ctx.fillStyle = isPivot ? "rgba(251,113,133,0.3)" : isSelected ? "rgba(0,229,255,0.3)" : "rgba(167,139,250,0.15)";
      ctx.strokeStyle = isPivot ? "#fb7185" : isSelected ? "#00e5ff" : "rgba(167,139,250,0.5)";
      ctx.lineWidth = isPivot ? 2.5 : isSelected ? 2 : 1.5;
      ctx.roundRect(p.x, p.y + 14, PERSON_W, PERSON_H - 14, 6);
      ctx.fill(); ctx.stroke();
      // Head
      ctx.beginPath();
      ctx.arc(p.x + PERSON_W / 2, p.y + 10, 12, 0, Math.PI * 2);
      ctx.fillStyle = isPivot ? "rgba(251,113,133,0.3)" : "rgba(167,139,250,0.15)";
      ctx.fill();
      ctx.strokeStyle = isPivot ? "#fb7185" : "rgba(167,139,250,0.4)";
      ctx.stroke();
      // Number
      ctx.fillStyle = isPivot ? "#fb7185" : isSelected ? "#00e5ff" : "#c4b5fd";
      ctx.font = `bold 16px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(p.value), p.x + PERSON_W / 2, p.y + PERSON_H / 2 + 8);
      ctx.textBaseline = "alphabetic";

      if (isPivot) {
        ctx.fillStyle = "#fb7185";
        ctx.font = "8px monospace";
        ctx.fillText("PIVOT", p.x + PERSON_W / 2, p.y - 4);
      }
    }

    function render() {
      animRef.current = requestAnimationFrame(render);
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0e0f1c");
      bg.addColorStop(1, "#070810");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Floor grid (checkerboard)
      for (let x = 0; x < W; x += 40) {
        for (let y = H - 80; y < H; y += 40) {
          ctx.fillStyle = (Math.floor(x / 40) + Math.floor(y / 40)) % 2 === 0
            ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.015)";
          ctx.fillRect(x, y, 40, 40);
        }
      }

      // Center divider
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(W / 2, 100); ctx.lineTo(W / 2, H - 60); ctx.stroke();
      ctx.setLineDash([]);

      // Lane labels
      ctx.fillStyle = "rgba(110,231,183,0.5)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("< PIVOT", W / 4, LINE_Y + PERSON_H + 24);
      ctx.fillStyle = "rgba(251,113,133,0.5)";
      ctx.fillText("> PIVOT", (3 * W) / 4, LINE_Y + PERSON_H + 24);

      if (s) {
        s.passengers.forEach((p) => {
          drawPassenger(p, p.id === s.selected);
        });

        // Checkpoint booth
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.roundRect(W / 2 - 30, PIVOT_Y - 30, 60, PERSON_H + 50, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(232,244,255,0.3)";
        ctx.font = "9px monospace";
        ctx.fillText("CHECKPOINT", W / 2, PIVOT_Y - 18);

        // Phase label
        ctx.fillStyle = "rgba(232,244,255,0.3)";
        ctx.font = "9px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`OPS: ${s.ops}  PHASE: ${s.phase}`, W - 12, 18);
        ctx.textAlign = "left";

        if (s.phase === "partition" && s.selected !== null) {
          ctx.fillStyle = "rgba(0,229,255,0.7)";
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          ctx.fillText("NOW CLICK: LEFT LANE  or  RIGHT LANE", W / 2, 30);
        } else if (s.phase === "partition" && !watchMode) {
          ctx.fillStyle = "rgba(232,244,255,0.35)";
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          ctx.fillText("SELECT a passenger, then click their lane", W / 2, 30);
        } else if (s.phase === "choose-pivot" && !watchMode) {
          ctx.fillStyle = "#fb7185";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.fillText("CLICK A PASSENGER TO SET AS PIVOT", W / 2, 30);
        }
      }

      // Flash
      if (flashRef.current) {
        flashRef.current.alpha -= 0.022;
        if (flashRef.current.alpha <= 0) flashRef.current = null;
        else {
          ctx.globalAlpha = flashRef.current.alpha;
          ctx.fillStyle = flashRef.current.correct ? "#6ee7b7" : "#fb7185";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.fillText(flashRef.current.text, W / 2, H / 2);
          ctx.globalAlpha = 1;
        }
      }

      if (doneRef.current) {
        ctx.fillStyle = "rgba(6,8,20,0.78)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#6ee7b7";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PARTITION COMPLETE!", W / 2, H / 2);
        ctx.textAlign = "left";
      }
    }

    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("click", handleClick);
      if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, watchMode]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
    />
  );
}

export default function QuickSortGame() {
  const router = useRouter();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showStats, setShowStats] = useState(false);
  const [totalOps, setTotalOps] = useState(0);
  const [startTime] = useState(Date.now());
  const { hintsUsed, useHint } = useHints(SLUG);
  const { upsert } = useProgress(SLUG, TOTAL_LEVELS);
  const nextModule = getNextModule(SLUG);
  const levelConfig = CONFIG.levels[currentLevel - 1];

  const handleLevelComplete = useCallback((ops: number) => {
    setTotalOps((p) => p + ops);
    upsert(currentLevel);
    if (currentLevel >= TOTAL_LEVELS) setShowStats(true);
  }, [currentLevel, upsert]);

  const stats: CompletionStats = {
    operationsUsed: totalOps,
    optimalOperations: 21,
    timeSeconds: Math.floor((Date.now() - startTime) / 1000),
    hintsUsed,
    moduleName: CONFIG.name,
    moduleSlug: SLUG,
  };

  return (
    <>
      <VisualiserLayout
        title={CONFIG.name}
        category="Sorting"
        slug={SLUG}
        totalSteps={TOTAL_LEVELS}
        currentStep={currentLevel}
        onNext={() => { if (currentLevel >= TOTAL_LEVELS) setShowStats(true); else setCurrentLevel((l) => l + 1); }}
        onPrev={() => setCurrentLevel((l) => Math.max(1, l - 1))}
        hints={CONFIG.hints}
        hintsUsed={hintsUsed}
        onUseHint={useHint}
      >
        <div style={{ padding: "24px 24px 80px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 14 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em",
              color: "#f6c453", padding: "3px 10px",
              background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4,
            }}>LEVEL {currentLevel} — {levelConfig.name.toUpperCase()}</span>
          </div>
          <QuickCanvas key={currentLevel} level={currentLevel} onComplete={handleLevelComplete} watchMode={levelConfig.isWatchMode} />
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 13, color: "rgba(232,244,255,0.55)", margin: 0 }}>{levelConfig.description}</p>
          </div>
        </div>
      </VisualiserLayout>
      <AnimatePresence>
        {showStats && (
          <StatsModal
            stats={stats}
            baseXP={levelConfig.baseXP}
            onClose={() => router.push("/")}
            onNextModule={() => nextModule && router.push(`/learn/sorting/${nextModule.slug}`)}
            nextModule={nextModule}
          />
        )}
      </AnimatePresence>
    </>
  );
}
