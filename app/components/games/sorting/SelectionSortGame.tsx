"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { useHints } from "@/lib/useHints";
import { useProgress } from "@/lib/useProgress";
import { getModuleConfig, getNextModule } from "@/lib/sorting/gameConfigs";
import { selectionMinIndex, selectionIsCorrectShot, shuffle } from "@/lib/sorting/algorithms";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import { useRouter } from "next/navigation";

const SLUG = "selection-sort";
const CONFIG = getModuleConfig(SLUG)!;
const TOTAL_LEVELS = CONFIG.levels.length;

// ─── Phaser scene logic ───────────────────────────────────────────────────────

interface Target {
  id: number;
  value: number;
  x: number;
  eliminated: boolean;
}

interface SceneState {
  targets: Target[];
  sortedRack: number[];
  currentStart: number;
  ops: number;
  phase: "playing" | "complete";
}

function initTargets(count: number): Target[] {
  const vals = shuffle(Array.from({ length: count }, (_, i) => i + 1));
  return vals.map((value, id) => ({ id, value, x: 0, eliminated: false }));
}

// ─── Canvas-based shooting range scene ────────────────────────────────────────

function SniperRange({
  level,
  onComplete,
  watchMode,
}: {
  level: number;
  onComplete: (ops: number) => void;
  watchMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SceneState>({
    targets: initTargets(level === 4 ? 8 : level === 5 ? 12 : 8),
    sortedRack: [],
    currentStart: 0,
    ops: 0,
    phase: "playing",
  });
  const mouseRef = useRef({ x: 0, y: 0 });
  const shakeRef = useRef(0);
  const animRef = useRef<number>(0);
  const slowRef = useRef(false);
  const flashRef = useRef<{ text: string; alpha: number; x: number; y: number } | null>(null);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const W = 900, H = 420;
  const RACK_W = 110;
  const RANGE_X = RACK_W + 20;
  const RANGE_W = W - RACK_X - 20;
  const TARGET_Y = 280;
  const TARGET_R = 28;

  function getTargetX(idx: number, total: number): number {
    const spacing = (W - RACK_W - 40) / (total + 1);
    return RACK_W + 30 + spacing * (idx + 1);
  }

  function minIdx(): number {
    const s = stateRef.current;
    const active = s.targets.filter((t) => !t.eliminated);
    if (!active.length) return -1;
    return active.reduce((a, b) => (b.value < a.value ? b : a)).id;
  }

  function shoot(targetId: number) {
    const s = stateRef.current;
    if (s.phase !== "playing") return;
    const target = s.targets.find((t) => t.id === targetId);
    if (!target || target.eliminated) return;

    const active = s.targets.filter((t) => !t.eliminated);
    const isCorrect = selectionIsCorrectShot(
      active.map((t) => t.value),
      0,
      active.findIndex((t) => t.id === targetId)
    );

    s.ops++;

    if (isCorrect) {
      correctSound();
      target.eliminated = true;
      s.sortedRack.push(target.value);
      flashRef.current = { text: "ELIMINATED", alpha: 1, x: target.x, y: TARGET_Y - 50 };
      const remaining = s.targets.filter((t) => !t.eliminated);
      if (!remaining.length) {
        s.phase = "complete";
        completionSound();
        setTimeout(() => onComplete(s.ops), 600);
      }
    } else {
      wrongSound();
      shakeRef.current = 10;
      flashRef.current = { text: "WRONG TARGET", alpha: 1, x: target.x, y: TARGET_Y - 50 };
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.style.cursor = "none";

    stateRef.current = {
      targets: initTargets(level === 5 ? 12 : 8),
      sortedRack: [],
      currentStart: 0,
      ops: 0,
      phase: "playing",
    };

    const total = stateRef.current.targets.length;
    stateRef.current.targets.forEach((t, i) => { t.x = getTargetX(i, total); });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      mouseRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleClick = (e: MouseEvent) => {
      if (watchMode) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      const s = stateRef.current;
      for (const t of s.targets) {
        if (t.eliminated) continue;
        const dx = cx - t.x, dy = cy - TARGET_Y;
        if (Math.sqrt(dx * dx + dy * dy) < TARGET_R + 8) {
          shoot(t.id);
          break;
        }
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    // Watch mode: AI auto-shoots
    if (watchMode) {
      const autoShoot = () => {
        const s = stateRef.current;
        if (s.phase !== "playing") return;
        const mid = minIdx();
        if (mid === -1) return;
        shoot(mid);
        if (s.phase === "playing") {
          watchTimerRef.current = setTimeout(autoShoot, 1400);
        }
      };
      watchTimerRef.current = setTimeout(autoShoot, 1200);
    }

    // Render loop
    function render() {
      animRef.current = requestAnimationFrame(render);
      const s = stateRef.current;

      ctx.clearRect(0, 0, W, H);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0a0c1a");
      bg.addColorStop(1, "#060810");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Ground line
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(RACK_W, TARGET_Y + TARGET_R + 8); ctx.lineTo(W, TARGET_Y + TARGET_R + 8); ctx.stroke();

      // Sorted rack
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.strokeStyle = "rgba(0,229,255,0.2)";
      ctx.lineWidth = 1;
      ctx.roundRect(4, 60, RACK_W - 8, H - 80, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(0,229,255,0.5)";
      ctx.font = "9px monospace";
      ctx.letterSpacing = "2px";
      ctx.fillText("SORTED", 14, 80);
      s.sortedRack.forEach((val, i) => {
        const ry = 95 + i * 26;
        ctx.fillStyle = "rgba(110,231,183,0.15)";
        ctx.roundRect(10, ry, RACK_W - 18, 22, 4);
        ctx.fill();
        ctx.fillStyle = "#6ee7b7";
        ctx.font = "bold 13px monospace";
        ctx.fillText(String(val).padStart(2, " "), 30, ry + 15);
      });

      // Targets
      const minId = minIdx();
      s.targets.forEach((t) => {
        if (t.eliminated) return;
        const isMin = t.id === minId;
        const pulse = isMin ? (Math.sin(Date.now() * 0.004) * 0.3 + 0.7) : 1;

        // Stand
        ctx.strokeStyle = "#3d2b1a";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(t.x, TARGET_Y + TARGET_R); ctx.lineTo(t.x, TARGET_Y + TARGET_R + 40); ctx.stroke();

        // Target circle
        const grd = ctx.createRadialGradient(t.x, TARGET_Y, 0, t.x, TARGET_Y, TARGET_R);
        if (isMin) {
          grd.addColorStop(0, `rgba(246,196,83,${0.6 * pulse})`);
          grd.addColorStop(1, `rgba(246,196,83,0.1)`);
        } else {
          grd.addColorStop(0, "rgba(60,40,80,0.8)");
          grd.addColorStop(1, "rgba(30,20,50,0.6)");
        }
        ctx.beginPath(); ctx.arc(t.x, TARGET_Y, TARGET_R, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
        ctx.strokeStyle = isMin ? `rgba(246,196,83,${pulse})` : "rgba(167,139,250,0.4)";
        ctx.lineWidth = isMin ? 2.5 : 1.5;
        ctx.stroke();

        // Value
        ctx.fillStyle = isMin ? "#f6c453" : "#c4b5fd";
        ctx.font = `bold ${TARGET_R * 0.75}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(t.value), t.x, TARGET_Y);

        // Min label
        if (isMin && !watchMode) {
          ctx.fillStyle = "rgba(246,196,83,0.8)";
          ctx.font = "9px monospace";
          ctx.fillText("MIN", t.x, TARGET_Y - TARGET_R - 10);
        }

        // Assisted aim: L2 shows subtle indicator
        if (level === 2 && isMin) {
          ctx.strokeStyle = `rgba(0,229,255,${0.4 * pulse})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.arc(t.x, TARGET_Y, TARGET_R + 12, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Flash text
      if (flashRef.current) {
        const f = flashRef.current;
        f.alpha -= 0.02;
        if (f.alpha <= 0) { flashRef.current = null; }
        else {
          ctx.globalAlpha = f.alpha;
          ctx.fillStyle = f.text === "WRONG TARGET" ? "#fb7185" : "#6ee7b7";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.fillText(f.text, f.x, f.y);
          ctx.globalAlpha = 1;
        }
      }

      // Shake offset
      let sx = 0, sy = 0;
      if (shakeRef.current > 0) {
        sx = (Math.random() - 0.5) * shakeRef.current;
        sy = (Math.random() - 0.5) * shakeRef.current;
        shakeRef.current -= 1;
      }

      // Crosshair
      if (!watchMode) {
        const mx = mouseRef.current.x + sx;
        const my = mouseRef.current.y + sy;
        ctx.strokeStyle = "rgba(0,229,255,0.9)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath(); ctx.moveTo(mx - 20, my); ctx.lineTo(mx + 20, my); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, my - 20); ctx.lineTo(mx, my + 20); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,229,255,0.7)"; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Watch mode: AI cursor
      if (watchMode) {
        const mid = minIdx();
        if (mid !== -1) {
          const t = stateRef.current.targets.find((t) => t.id === mid);
          if (t) {
            ctx.strokeStyle = "rgba(251,113,133,0.7)";
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(t.x - 20, TARGET_Y); ctx.lineTo(t.x + 20, TARGET_Y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(t.x, TARGET_Y - 20); ctx.lineTo(t.x, TARGET_Y + 20); ctx.stroke();
            ctx.beginPath(); ctx.arc(t.x, TARGET_Y, 6, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      // Op counter
      ctx.fillStyle = "rgba(232,244,255,0.4)";
      ctx.font = "11px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`OPS: ${s.ops}`, W - 12, 20);
      ctx.textAlign = "left";

      // Completion overlay
      if (s.phase === "complete") {
        ctx.fillStyle = "rgba(6,8,20,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#6ee7b7";
        ctx.font = "bold 28px var(--font-display, monospace)";
        ctx.textAlign = "center";
        ctx.fillText("RANGE CLEARED", W / 2, H / 2);
        ctx.fillStyle = "rgba(232,244,255,0.5)";
        ctx.font = "14px monospace";
        ctx.fillText(`${s.ops} shots fired`, W / 2, H / 2 + 36);
        ctx.textAlign = "left";
      }
    }

    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
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

// ─── Main game component ───────────────────────────────────────────────────────

export default function SelectionSortGame() {
  const router = useRouter();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showStats, setShowStats] = useState(false);
  const [totalOps, setTotalOps] = useState(0);
  const [startTime] = useState(Date.now());
  const { hintsUsed, useHint } = useHints(SLUG);
  const { upsert } = useProgress(SLUG, TOTAL_LEVELS);
  const nextModule = getNextModule(SLUG);

  const levelConfig = CONFIG.levels[currentLevel - 1];
  const isWatchMode = levelConfig.isWatchMode;

  const handleLevelComplete = useCallback((ops: number) => {
    setTotalOps((prev) => prev + ops);
    upsert(currentLevel);
    if (currentLevel >= TOTAL_LEVELS) {
      setShowStats(true);
    }
  }, [currentLevel, upsert]);

  const handleNext = () => {
    if (currentLevel >= TOTAL_LEVELS) { setShowStats(true); return; }
    setCurrentLevel((l) => l + 1);
  };

  const stats: CompletionStats = {
    operationsUsed: totalOps,
    optimalOperations: 7, // n-1 for 8 targets
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
        onNext={handleNext}
        onPrev={() => setCurrentLevel((l) => Math.max(1, l - 1))}
        hints={CONFIG.hints}
        hintsUsed={hintsUsed}
        onUseHint={useHint}
      >
        <div style={{ padding: "24px 24px 80px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em",
              color: "#f6c453", padding: "3px 10px",
              background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4,
            }}>
              LEVEL {currentLevel} — {levelConfig.name.toUpperCase()}
            </span>
            {isWatchMode && (
              <span style={{ marginLeft: 10, fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(232,244,255,0.35)", letterSpacing: "0.15em" }}>
                WATCH MODE · AI SHOOTS
              </span>
            )}
          </div>

          <SniperRange
            key={currentLevel}
            level={currentLevel}
            onComplete={handleLevelComplete}
            watchMode={isWatchMode}
          />

          {/* Level description */}
          <div style={{ marginTop: 14, padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 13, color: "rgba(232,244,255,0.6)", margin: 0 }}>
              {levelConfig.description}
              {!isWatchMode && " Click the minimum-value target to eliminate it."}
            </p>
          </div>

          {/* L4 complexity visual */}
          {currentLevel === 4 && (
            <ComplexityVisual />
          )}
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

function ComplexityVisual() {
  const [n, setN] = useState(8);
  const ops = n * (n - 1) / 2;
  const W = 400, H = 180;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#080b1a";
    ctx.fillRect(0, 0, W, H);

    // Plot O(n²) curve
    ctx.strokeStyle = "#f6c453";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 1; x <= 20; x++) {
      const px = (x / 20) * (W - 40) + 20;
      const py = H - 20 - ((x * x) / 400) * (H - 40);
      if (x === 1) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Current n marker
    const mx = (n / 20) * (W - 40) + 20;
    const my = H - 20 - ((n * n) / 400) * (H - 40);
    ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#00e5ff"; ctx.fill();

    // Axes
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, 10); ctx.lineTo(20, H - 20); ctx.lineTo(W - 10, H - 20); ctx.stroke();

    // Labels
    ctx.fillStyle = "rgba(232,244,255,0.4)";
    ctx.font = "9px monospace";
    ctx.fillText("n", W - 15, H - 10);
    ctx.fillText("ops", 2, 15);
    ctx.fillStyle = "#00e5ff";
    ctx.fillText(`n=${n}: ${ops} ops`, mx + 8, my - 6);
  }, [n, ops]);

  return (
    <div style={{ marginTop: 16, padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", color: "rgba(232,244,255,0.35)", marginBottom: 10 }}>
        O(N²) COMPLEXITY VISUALIZER
      </div>
      <canvas ref={canvasRef} width={W} height={H} style={{ width: "100%", maxWidth: W, borderRadius: 6 }} />
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(232,244,255,0.4)" }}>n = {n}</span>
        <input
          type="range" min={2} max={20} value={n}
          onChange={(e) => setN(Number(e.target.value))}
          style={{ flex: 1, accentColor: "#f6c453" }}
        />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#f6c453" }}>{ops} ops</span>
      </div>
    </div>
  );
}

// Suppress TS complaint about unused RANGE_X
const RACK_X = 0; void RACK_X;
