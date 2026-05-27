"use client";
import { useEffect, useRef } from "react";
import type { GameProps } from "./types";

// Package weights
const WEIGHTS = [1, 2, 3, 4, 5, 6, 7, 8];
const DAYS = 5;

function minCapacity(weights: number[], D: number): number {
  const lo = Math.max(...weights);
  const hi = weights.reduce((a, b) => a + b, 0);
  for (let c = lo; c <= hi; c++) {
    let days = 1, cur = 0;
    for (const w of weights) {
      if (cur + w > c) { days++; cur = 0; }
      cur += w;
    }
    if (days <= D) return c;
  }
  return hi;
}

const ANSWER = minCapacity(WEIGHTS, DAYS);
const MAX_CAP = WEIGHTS.reduce((a, b) => a + b, 0);
const MIN_CAP = Math.max(...WEIGHTS);

export default function P7_CargoShip({ onSolve, onAttempt }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    left: MIN_CAP,
    right: MAX_CAP,
    solved: false,
    busy: false,
    lastCap: -1,
    lastDays: -1,
    message: "click a capacity bar",
    eliminated: new Set<number>(),
  });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = container.clientWidth || 800;
    const H = container.clientHeight || 500;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d")!;
    const state = stateRef.current;

    const range = MAX_CAP - MIN_CAP + 1;
    const barW = Math.floor((W - 60) / range);
    const barMaxH = 120;
    const baseY = H / 2 + 40;

    function daysFor(cap: number): number {
      let days = 1, cur = 0;
      for (const w of WEIGHTS) {
        if (cur + w > cap) { days++; cur = 0; }
        cur += w;
      }
      return days;
    }

    function getBarX(cap: number) {
      return 30 + (cap - MIN_CAP) * barW + barW / 2;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);

      // Header
      ctx.fillStyle = "#475569";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`weights: [${WEIGHTS.join(",")}]  |  deliver in ${DAYS} days`, W / 2, 28);

      for (let cap = MIN_CAP; cap <= MAX_CAP; cap++) {
        const days = daysFor(cap);
        const barH = Math.max(8, Math.floor((days / (DAYS + 3)) * barMaxH));
        const x = getBarX(cap);
        const isElim = state.eliminated.has(cap);
        const isMid = cap === state.lastCap;

        ctx.globalAlpha = isElim ? 0.2 : 1;

        const canDo = days <= DAYS;
        ctx.fillStyle = isMid ? (canDo ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)") : "#111";
        roundRect(ctx, x - barW / 2 + 1, baseY - barH, barW - 2, barH, 3);
        ctx.fill();

        ctx.strokeStyle = isMid ? (canDo ? "#22c55e" : "#ef4444") : "#1e1e1e";
        ctx.lineWidth = 1;
        roundRect(ctx, x - barW / 2 + 1, baseY - barH, barW - 2, barH, 3);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = isElim ? "#1a1a1a" : "#374151";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`c${cap}`, x, baseY + 14);
        ctx.fillStyle = isElim ? "#111" : isMid ? (canDo ? "#22c55e" : "#ef4444") : "#1e1e1e";
        ctx.fillText(`${days}d`, x, baseY - barH - 4);
      }

      ctx.fillStyle = state.solved ? "#22c55e" : "#374151";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(state.message, W / 2, H - 20);

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    canvas.addEventListener("click", (e) => {
      if (state.solved || state.busy) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const cap = Math.floor((mx - 30) / barW) + MIN_CAP;
      if (cap < MIN_CAP || cap > MAX_CAP) return;
      if (state.eliminated.has(cap)) return;

      state.busy = true;
      onAttempt();

      const mid = cap;
      state.lastCap = mid;
      const days = daysFor(mid);
      state.lastDays = days;

      setTimeout(() => {
        if (days <= DAYS) {
          if (mid === state.left || daysFor(mid - 1) > DAYS) {
            state.solved = true;
            state.message = `minimum capacity: ${mid}`;
            setTimeout(() => onSolve(), 700);
          } else {
            state.right = mid;
            for (let c = mid + 1; c <= MAX_CAP; c++) state.eliminated.add(c);
            state.message = `cap ${mid} works (${days}d) — try less`;
          }
        } else {
          state.left = mid + 1;
          for (let c = MIN_CAP; c <= mid; c++) state.eliminated.add(c);
          state.message = `cap ${mid} not enough (${days}d > ${DAYS}d) — go higher`;
        }
        state.busy = false;
      }, 500);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", cursor: "pointer" }} />
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
