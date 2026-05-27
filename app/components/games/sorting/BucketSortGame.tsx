"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { useHints } from "@/lib/useHints";
import { useProgress } from "@/lib/useProgress";
import { getModuleConfig, getNextModule } from "@/lib/sorting/gameConfigs";
import { bucketCorrectBucket, shuffle } from "@/lib/sorting/algorithms";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import { useRouter } from "next/navigation";

const SLUG = "bucket-sort";
const CONFIG = getModuleConfig(SLUG)!;
const TOTAL_LEVELS = CONFIG.levels.length;
const W = 820, H = 440;
const NUM_BUCKETS = 10;
const BKT_W = 58, BKT_H = 110;
const BKT_Y = H - BKT_H - 30;
const BALL_R = 18;
const CANNON_Y = 80;

function bucketX(b: number): number { return 14 + b * (BKT_W + 4); }

interface Ball {
  id: number;
  value: number; // 0.0 – 0.99
  x: number;
  y: number;
  placed: boolean;
  bucket: number;
  inBucketIdx: number;
}

interface BucketState {
  balls: Ball[];
  buckets: number[][]; // bucket idx → sorted values
  phase: "distribute" | "collect" | "done";
  collectNext: number;
  result: number[];
  ops: number;
  dragging: { ball: Ball; ox: number; oy: number } | null;
  inBucketSort: boolean; // whether currently doing within-bucket sort
  activeBucket: number;
}

function makeBalls(count: number): Ball[] {
  const vals = Array.from({ length: count }, () => Math.round(Math.random() * 99) / 100);
  return vals.map((value, id) => ({
    id, value,
    x: 40 + (id % 10) * 72,
    y: 24 + Math.floor(id / 10) * 50,
    placed: false, bucket: -1, inBucketIdx: -1,
  }));
}

function BucketCanvas({ level, onComplete, watchMode }: {
  level: number; onComplete: (ops: number) => void; watchMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const doneRef = useRef(false);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<{ text: string; alpha: number; correct: boolean } | null>(null);
  const stateRef = useRef<BucketState | null>(null);

  const ballCount = level >= 5 ? 18 : 12;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    doneRef.current = false;

    const balls = makeBalls(ballCount);
    stateRef.current = {
      balls,
      buckets: Array.from({ length: NUM_BUCKETS }, () => []),
      phase: "distribute",
      collectNext: 0,
      result: [],
      ops: 0,
      dragging: null,
      inBucketSort: false,
      activeBucket: -1,
    };

    // L3: pre-distribute
    if (level === 3) {
      balls.forEach((b) => {
        const bkt = bucketCorrectBucket(b.value);
        b.placed = true; b.bucket = bkt;
        stateRef.current!.buckets[bkt].push(b.value);
      });
      stateRef.current!.phase = "collect";
    }

    function handleMouseMove(e: MouseEvent) {
      const s = stateRef.current;
      if (!s?.dragging) return;
      const rect = canvas!.getBoundingClientRect();
      s.dragging.ball.x = (e.clientX - rect.left) * (W / rect.width) - s.dragging.ox;
      s.dragging.ball.y = (e.clientY - rect.top) * (H / rect.height) - s.dragging.oy;
    }

    function handleMouseDown(e: MouseEvent) {
      if (watchMode || !stateRef.current || stateRef.current.phase !== "distribute") return;
      const rect = canvas!.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      const ball = [...stateRef.current.balls].reverse().find((b) => !b.placed &&
        Math.sqrt((mx - b.x - BALL_R) ** 2 + (my - b.y - BALL_R) ** 2) < BALL_R + 6);
      if (ball) {
        stateRef.current.dragging = { ball, ox: mx - ball.x, oy: my - ball.y };
      }
    }

    function handleMouseUp() {
      const s = stateRef.current;
      if (!s?.dragging) return;
      const ball = s.dragging.ball;
      s.dragging = null;

      let droppedBkt = -1;
      for (let b = 0; b < NUM_BUCKETS; b++) {
        const bx = bucketX(b);
        if (ball.x + BALL_R > bx && ball.x + BALL_R < bx + BKT_W && ball.y + BALL_R * 2 > BKT_Y - 10) {
          droppedBkt = b;
          break;
        }
      }

      const correct = bucketCorrectBucket(ball.value);
      s.ops++;

      if (droppedBkt === correct) {
        correctSound();
        ball.placed = true; ball.bucket = droppedBkt;
        s.buckets[droppedBkt].push(ball.value);
        ball.x = bucketX(droppedBkt) + 4;
        ball.y = BKT_Y + 4 + (s.buckets[droppedBkt].length - 1) * 20;
        flashRef.current = { text: `✓ BUCKET ${droppedBkt}`, alpha: 1, correct: true };

        if (s.balls.every((b) => b.placed)) {
          s.phase = "collect";
          s.collectNext = 0;
        }
      } else if (droppedBkt >= 0) {
        wrongSound();
        ball.x = 40 + (ball.id % 10) * 72;
        ball.y = 24 + Math.floor(ball.id / 10) * 50;
        flashRef.current = { text: `WRONG — BUCKET ${correct}`, alpha: 1, correct: false };
      } else {
        ball.x = 40 + (ball.id % 10) * 72;
        ball.y = 24 + Math.floor(ball.id / 10) * 50;
      }
    }

    function handleClick(e: MouseEvent) {
      const s = stateRef.current;
      if (!s || s.phase !== "collect" || doneRef.current) return;
      const rect = canvas!.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top) * (H / rect.height);

      for (let b = 0; b < NUM_BUCKETS; b++) {
        const bx = bucketX(b);
        if (cx > bx && cx < bx + BKT_W && cy > BKT_Y - 10 && cy < BKT_Y + BKT_H) {
          if (b === s.collectNext) {
            correctSound();
            const sorted = [...s.buckets[b]].sort((a, c) => a - c);
            s.result.push(...sorted);
            s.buckets[b] = [];
            s.collectNext++;
            s.ops++;
            flashRef.current = { text: `✓ COLLECTED ${b}`, alpha: 1, correct: true };
            if (s.collectNext >= NUM_BUCKETS && !doneRef.current) {
              doneRef.current = true;
              completionSound();
              setTimeout(() => onComplete(s.ops), 500);
            }
          } else {
            wrongSound();
            flashRef.current = { text: `NEED BUCKET ${s.collectNext} FIRST`, alpha: 1, correct: false };
          }
          break;
        }
      }
    }

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    if (!watchMode) canvas.addEventListener("click", handleClick);

    if (watchMode) {
      const autoStep = () => {
        const s = stateRef.current;
        if (!s || doneRef.current) return;
        if (s.phase === "distribute") {
          const ball = s.balls.find((b) => !b.placed);
          if (ball) {
            const bkt = bucketCorrectBucket(ball.value);
            ball.placed = true; ball.bucket = bkt;
            s.buckets[bkt].push(ball.value);
            ball.x = bucketX(bkt) + 4;
            ball.y = BKT_Y + 4 + (s.buckets[bkt].length - 1) * 20;
            s.ops++;
            if (s.balls.every((b) => b.placed)) s.phase = "collect";
          }
        } else {
          if (s.collectNext < NUM_BUCKETS) {
            const sorted = [...s.buckets[s.collectNext]].sort((a, b) => a - b);
            s.result.push(...sorted);
            s.buckets[s.collectNext] = [];
            s.collectNext++;
            s.ops++;
            if (s.collectNext >= NUM_BUCKETS && !doneRef.current) {
              doneRef.current = true;
              completionSound();
              setTimeout(() => onComplete(s.ops), 500);
              return;
            }
          }
        }
        if (!doneRef.current) watchTimerRef.current = setTimeout(autoStep, 300);
      };
      watchTimerRef.current = setTimeout(autoStep, 700);
    }

    function render() {
      animRef.current = requestAnimationFrame(render);
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0c0a10");
      bg.addColorStop(1, "#07060a");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      if (!s) return;

      // Carnival string lights
      for (let x = 0; x < W; x += 50) {
        ctx.fillStyle = `hsl(${(x * 3) % 360},70%,55%)`;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Buckets
      for (let b = 0; b < NUM_BUCKETS; b++) {
        const bx = bucketX(b);
        const isNext = s.phase === "collect" && b === s.collectNext;
        const isEmpty = s.buckets[b].length === 0;
        ctx.fillStyle = isNext ? "rgba(0,229,255,0.1)" : isEmpty && s.phase === "collect" ? "rgba(110,231,183,0.04)" : "rgba(255,255,255,0.03)";
        ctx.strokeStyle = isNext ? "#00e5ff" : "rgba(255,255,255,0.1)";
        ctx.lineWidth = isNext ? 2 : 1;
        ctx.roundRect(bx, BKT_Y, BKT_W, BKT_H, 6);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = isNext ? "#00e5ff" : "rgba(232,244,255,0.3)";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${b * 10}-${b * 10 + 9}%`, bx + BKT_W / 2, BKT_Y + BKT_H - 6);

        // Values in bucket
        s.buckets[b].forEach((val, i) => {
          const vy = BKT_Y + 8 + i * 18;
          if (vy + 12 > BKT_Y + BKT_H - 16) return;
          ctx.fillStyle = `hsl(${Math.round(val * 360)},60%,45%)`;
          ctx.roundRect(bx + 4, vy, BKT_W - 8, 14, 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "8px monospace";
          ctx.fillText(val.toFixed(2), bx + BKT_W / 2, vy + 10);
        });
      }

      // Unplaced balls
      s.balls.filter((b) => !b.placed).forEach((ball) => {
        const isDragging = s.dragging?.ball === ball;
        ctx.globalAlpha = isDragging ? 0.85 : 1;
        const grd = ctx.createRadialGradient(ball.x + BALL_R, ball.y + BALL_R, 0, ball.x + BALL_R, ball.y + BALL_R, BALL_R);
        const hue = Math.round(ball.value * 360);
        grd.addColorStop(0, `hsl(${hue},65%,55%)`);
        grd.addColorStop(1, `hsl(${hue},65%,30%)`);
        ctx.beginPath();
        ctx.arc(ball.x + BALL_R, ball.y + BALL_R, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
        ctx.strokeStyle = isDragging ? "#fff" : "rgba(255,255,255,0.2)";
        ctx.lineWidth = isDragging ? 2 : 1;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ball.value.toFixed(2), ball.x + BALL_R, ball.y + BALL_R);
        ctx.textBaseline = "alphabetic";
        ctx.globalAlpha = 1;
      });

      // Result
      if (s.result.length > 0) {
        ctx.fillStyle = "rgba(232,244,255,0.25)";
        ctx.font = "8px monospace";
        ctx.textAlign = "left";
        ctx.fillText("SORTED:", 8, H - 10);
        s.result.slice(0, 14).forEach((val, i) => {
          ctx.fillStyle = `hsl(${Math.round(val * 360)},55%,40%)`;
          ctx.roundRect(56 + i * 52, H - 22, 48, 16, 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "8px monospace";
          ctx.textAlign = "center";
          ctx.fillText(val.toFixed(2), 56 + i * 52 + 24, H - 8);
        });
      }

      // Phase label
      ctx.fillStyle = "#f6c453";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`PHASE: ${s.phase.toUpperCase()}  OPS: ${s.ops}`, W / 2, 20);

      if (s.phase === "collect" && !doneRef.current) {
        ctx.fillStyle = "#00e5ff";
        ctx.font = "10px monospace";
        ctx.fillText(`CLICK BUCKETS IN ORDER — NEXT: ${s.collectNext}`, W / 2, 36);
      }

      // Flash
      if (flashRef.current) {
        flashRef.current.alpha -= 0.022;
        if (flashRef.current.alpha <= 0) flashRef.current = null;
        else {
          ctx.globalAlpha = flashRef.current.alpha;
          ctx.fillStyle = flashRef.current.correct ? "#6ee7b7" : "#fb7185";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.fillText(flashRef.current.text, W / 2, BKT_Y - 12);
          ctx.globalAlpha = 1;
        }
      }

      if (doneRef.current) {
        ctx.fillStyle = "rgba(6,8,20,0.78)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#f6c453";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText("CARNIVAL SORTED!", W / 2, H / 2);
        ctx.textAlign = "left";
      }
    }

    render();
    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
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
      style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}
    />
  );
}

export default function BucketSortGame() {
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
    optimalOperations: 22,
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
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "#f6c453", padding: "3px 10px", background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4 }}>
              LEVEL {currentLevel} — {levelConfig.name.toUpperCase()}
            </span>
          </div>
          <BucketCanvas key={currentLevel} level={currentLevel} onComplete={handleLevelComplete} watchMode={levelConfig.isWatchMode} />
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 13, color: "rgba(232,244,255,0.55)", margin: 0 }}>{levelConfig.description}</p>
          </div>
        </div>
      </VisualiserLayout>
      <AnimatePresence>
        {showStats && (
          <StatsModal stats={stats} baseXP={levelConfig.baseXP} onClose={() => router.push("/")} onNextModule={() => nextModule && router.push(`/learn/sorting/${nextModule.slug}`)} nextModule={nextModule} />
        )}
      </AnimatePresence>
    </>
  );
}
