"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { useHints } from "@/lib/useHints";
import { useProgress } from "@/lib/useProgress";
import { getModuleConfig, getNextModule } from "@/lib/sorting/gameConfigs";
import { heapBubbleUpTarget, heapSiftDownTarget, shuffle } from "@/lib/sorting/algorithms";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import { useRouter } from "next/navigation";

const SLUG = "heap-sort";
const CONFIG = getModuleConfig(SLUG)!;
const TOTAL_LEVELS = CONFIG.levels.length;
const W = 820, H = 480;
const NODE_R = 24;

function treeX(idx: number, total: number): number {
  const level = Math.floor(Math.log2(idx + 1));
  const levelStart = Math.pow(2, level) - 1;
  const levelCount = Math.pow(2, level);
  const posInLevel = idx - levelStart;
  const spacing = W / (levelCount + 1);
  return spacing * (posInLevel + 1);
}

function treeY(idx: number): number {
  const level = Math.floor(Math.log2(idx + 1));
  return 60 + level * 90;
}

interface HeapState {
  heap: (number | null)[];
  heapSize: number;
  sorted: number[];
  phase: "build" | "extract" | "done";
  selected: number | null;
  ops: number;
  insertQueue: number[];
  lastInserted: number | null;
}

function HeapCanvas({ level, onComplete, watchMode, minHeap = false }: {
  level: number; onComplete: (ops: number) => void; watchMode: boolean; minHeap?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<HeapState | null>(null);
  const animRef = useRef(0);
  const flashRef = useRef<{ text: string; alpha: number; correct: boolean } | null>(null);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);
  const shakeRef = useRef(0);

  function compare(a: number, b: number): boolean {
    return minHeap ? a < b : a > b; // min heap: child < parent is violation
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    doneRef.current = false;

    const values = shuffle(Array.from({ length: 8 }, (_, i) => i + 1));
    stateRef.current = {
      heap: [],
      heapSize: 0,
      sorted: [],
      phase: "build",
      selected: null,
      ops: 0,
      insertQueue: [...values],
      lastInserted: null,
    };

    // For extract-only levels: pre-build the heap
    if (level === 3) {
      const h = [...values];
      // Simple heapify
      for (let i = Math.floor(h.length / 2) - 1; i >= 0; i--) {
        let cur = i;
        while (true) {
          const l = 2 * cur + 1, r = 2 * cur + 2;
          let best = cur;
          if (l < h.length && compare(h[l], h[best])) best = l;
          if (r < h.length && compare(h[r], h[best])) best = r;
          if (best === cur) break;
          [h[cur], h[best]] = [h[best], h[cur]];
          cur = best;
        }
      }
      stateRef.current.heap = h;
      stateRef.current.heapSize = h.length;
      stateRef.current.insertQueue = [];
      stateRef.current.phase = "extract";
    }

    function needsBubbleUp(heap: (number | null)[], idx: number): boolean {
      if (idx === 0) return false;
      const parent = Math.floor((idx - 1) / 2);
      const v = heap[idx]; const p = heap[parent];
      if (v === null || p === null) return false;
      return compare(v, p);
    }

    function needsSiftDown(heap: (number | null)[], idx: number, size: number): boolean {
      const l = 2 * idx + 1, r = 2 * idx + 2;
      const v = heap[idx];
      if (v === null) return false;
      if (l < size && heap[l] !== null && compare(heap[l]!, v)) return true;
      if (r < size && heap[r] !== null && compare(heap[r]!, v)) return true;
      return false;
    }

    function tryInsertNext() {
      const s = stateRef.current!;
      if (!s.insertQueue.length) return;
      const val = s.insertQueue.shift()!;
      s.heap.push(val);
      s.heapSize++;
      s.lastInserted = s.heap.length - 1;
    }

    // Insert first value
    if (stateRef.current.phase === "build" && stateRef.current.insertQueue.length) {
      tryInsertNext();
    }

    function handleClick(e: MouseEvent) {
      const s = stateRef.current;
      if (!s || doneRef.current) return;
      const rect = canvas!.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top) * (H / rect.height);

      if (s.phase === "build") {
        // Click a node
        const clicked = findClickedNode(cx, cy, s.heap, s.heapSize);
        if (clicked === null) return;

        if (s.selected === null) {
          s.selected = clicked;
          return;
        }

        // Second click: attempt swap
        const parent = Math.floor((s.selected - 1) / 2);
        const child = s.selected;

        if (clicked === parent && needsBubbleUp(s.heap, child)) {
          [s.heap[child], s.heap[parent]] = [s.heap[parent], s.heap[child]];
          s.ops++;
          correctSound();
          flashRef.current = { text: "✓ BUBBLED UP", alpha: 1, correct: true };
          s.lastInserted = parent;
          s.selected = null;

          if (!needsBubbleUp(s.heap, parent)) {
            // Heap property restored — insert next
            if (!s.insertQueue.length) {
              if (level === 2) {
                doneRef.current = true; completionSound();
                setTimeout(() => onComplete(s.ops), 500);
              } else {
                s.phase = "extract";
              }
            } else {
              tryInsertNext();
            }
          }
        } else if (clicked === parent) {
          wrongSound();
          shakeRef.current = 8;
          flashRef.current = { text: "NO VIOLATION", alpha: 1, correct: false };
          s.selected = null;
        } else {
          wrongSound();
          flashRef.current = { text: "CLICK PARENT", alpha: 1, correct: false };
          s.selected = null;
        }
      } else if (s.phase === "extract") {
        // Click root to extract
        if (s.selected === null) {
          const clicked = findClickedNode(cx, cy, s.heap, s.heapSize);
          if (clicked === 0) {
            // Extract
            const extracted = s.heap[0];
            if (extracted === null) return;
            s.heap[0] = s.heap[s.heapSize - 1]!;
            s.heap.pop();
            s.heapSize--;
            s.sorted.push(extracted);
            s.ops++;
            correctSound();
            flashRef.current = { text: `EXTRACTED: ${extracted}`, alpha: 1, correct: true };
            s.selected = null;
            if (s.heapSize === 0) {
              doneRef.current = true; completionSound();
              setTimeout(() => onComplete(s.ops), 500);
            } else {
              s.selected = -1; // signal: waiting for sift-down
            }
          } else {
            s.selected = clicked;
          }
          return;
        }

        if (s.selected === -1) {
          // User must sift down — click parent then correct child
          const clicked = findClickedNode(cx, cy, s.heap, s.heapSize);
          if (clicked === null) return;
          const target = heapSiftDownTarget(s.heap.filter((v): v is number => v !== null), 0, s.heapSize);
          if (target === null) {
            // Heap OK
            s.selected = null;
            if (!s.heapSize) {
              doneRef.current = true; completionSound();
              setTimeout(() => onComplete(s.ops), 500);
            }
            return;
          }

          if (clicked === target) {
            [s.heap[0], s.heap[target]] = [s.heap[target], s.heap[0]];
            s.ops++;
            correctSound();
            flashRef.current = { text: "✓ SIFTED DOWN", alpha: 1, correct: true };
            // Check if still needs sifting
            const stillNeeds = heapSiftDownTarget(s.heap.filter((v): v is number => v !== null), target, s.heapSize);
            if (!stillNeeds) s.selected = null;
          } else {
            wrongSound();
            shakeRef.current = 8;
            flashRef.current = { text: "WRONG CHILD", alpha: 1, correct: false };
          }
        }
      }
    }

    function findClickedNode(cx: number, cy: number, heap: (number | null)[], size: number): number | null {
      for (let i = 0; i < size; i++) {
        if (heap[i] === null) continue;
        const nx = treeX(i, size);
        const ny = treeY(i);
        if (Math.sqrt((cx - nx) ** 2 + (cy - ny) ** 2) < NODE_R + 8) return i;
      }
      return null;
    }

    if (!watchMode) canvas.addEventListener("click", handleClick);

    if (watchMode) {
      const autoStep = () => {
        const s = stateRef.current;
        if (!s || doneRef.current) return;

        if (s.phase === "build") {
          // Bubble up last inserted
          let cur = s.heapSize - 1;
          while (needsBubbleUp(s.heap, cur)) {
            const p = Math.floor((cur - 1) / 2);
            [s.heap[cur], s.heap[p]] = [s.heap[p], s.heap[cur]];
            s.ops++;
            cur = p;
          }
          if (s.insertQueue.length) {
            tryInsertNext();
          } else {
            s.phase = "extract";
          }
        } else {
          if (s.heapSize === 0) {
            doneRef.current = true; completionSound();
            setTimeout(() => onComplete(s.ops), 500);
            return;
          }
          const extracted = s.heap[0]!;
          s.heap[0] = s.heap[s.heapSize - 1]!;
          s.heap.pop(); s.heapSize--;
          s.sorted.push(extracted);
          s.ops++;
          // Sift down
          let cur = 0;
          const h = s.heap.filter((v): v is number => v !== null);
          while (true) {
            const t = heapSiftDownTarget(h, cur, s.heapSize);
            if (t === null) break;
            [h[cur], h[t]] = [h[t], h[cur]];
            s.heap[cur] = h[cur]; s.heap[t] = h[t];
            cur = t; s.ops++;
          }
          if (s.heapSize === 0) {
            doneRef.current = true; completionSound();
            setTimeout(() => onComplete(s.ops), 500);
            return;
          }
        }
        if (!doneRef.current) watchTimerRef.current = setTimeout(autoStep, 700);
      };
      watchTimerRef.current = setTimeout(autoStep, 800);
    }

    function render() {
      animRef.current = requestAnimationFrame(render);
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#100a05");
      bg.addColorStop(1, "#06040a");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      if (!s) return;

      // Draw edges
      for (let i = 1; i < s.heapSize; i++) {
        if (s.heap[i] === null) continue;
        const p = Math.floor((i - 1) / 2);
        ctx.strokeStyle = "rgba(167,139,250,0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(treeX(i, s.heapSize), treeY(i));
        ctx.lineTo(treeX(p, s.heapSize), treeY(p));
        ctx.stroke();
      }

      // Draw nodes
      for (let i = 0; i < s.heapSize; i++) {
        const val = s.heap[i];
        if (val === null) continue;
        const nx = treeX(i, s.heapSize);
        const ny = treeY(i);
        const isRoot = i === 0;
        const isSelected = s.selected === i || s.selected === -1 && isRoot;
        const isLast = s.lastInserted === i;

        const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, NODE_R);
        if (isRoot) {
          grd.addColorStop(0, "rgba(246,196,83,0.5)"); grd.addColorStop(1, "rgba(246,196,83,0.1)");
        } else if (isSelected) {
          grd.addColorStop(0, "rgba(0,229,255,0.4)"); grd.addColorStop(1, "rgba(0,229,255,0.05)");
        } else if (isLast) {
          grd.addColorStop(0, "rgba(167,139,250,0.5)"); grd.addColorStop(1, "rgba(167,139,250,0.1)");
        } else {
          grd.addColorStop(0, "rgba(60,40,80,0.7)"); grd.addColorStop(1, "rgba(30,20,50,0.4)");
        }

        ctx.beginPath(); ctx.arc(nx, ny, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
        ctx.strokeStyle = isRoot ? "#f6c453" : isSelected ? "#00e5ff" : "rgba(167,139,250,0.5)";
        ctx.lineWidth = isRoot || isSelected ? 2.5 : 1.5;
        ctx.stroke();

        ctx.fillStyle = isRoot ? "#f6c453" : "#c4b5fd";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(val), nx, ny);

        if (isRoot && s.phase === "extract") {
          // Crown
          ctx.fillStyle = "#f6c453";
          ctx.font = "14px monospace";
          ctx.fillText("♛", nx, ny - NODE_R - 10);
        }
      }

      // Sorted rack
      if (s.sorted.length > 0) {
        ctx.fillStyle = "rgba(232,244,255,0.2)";
        ctx.font = "9px monospace";
        ctx.textAlign = "left";
        ctx.fillText("SORTED HALL:", 20, H - 60);
        s.sorted.forEach((val, i) => {
          const sx = 120 + i * 38;
          ctx.fillStyle = "rgba(110,231,183,0.15)";
          ctx.strokeStyle = "rgba(110,231,183,0.4)";
          ctx.lineWidth = 1;
          ctx.roundRect(sx, H - 74, 32, 28, 4);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#6ee7b7";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(val), sx + 16, H - 60);
          ctx.textBaseline = "alphabetic";
        });
      }

      // Insert queue
      if (s.insertQueue.length > 0) {
        ctx.fillStyle = "rgba(232,244,255,0.2)";
        ctx.font = "9px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`QUEUE: ${s.insertQueue.join(" → ")}`, W - 12, H - 40);
      }

      // Phase + ops
      ctx.fillStyle = "rgba(232,244,255,0.3)";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`PHASE: ${s.phase.toUpperCase()}  OPS: ${s.ops}`, W - 12, 18);
      ctx.textAlign = "left";

      // Instructions
      if (!watchMode) {
        let hint = "";
        if (s.phase === "build") hint = s.selected === null ? "CLICK a node to select, then its parent to bubble up" : "Now click its PARENT";
        if (s.phase === "extract") hint = s.selected === null ? "CLICK the root (crown) to extract" : s.selected === -1 ? "CLICK the correct child to sift down" : "";
        ctx.fillStyle = "rgba(232,244,255,0.4)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(hint, W / 2, H - 20);
      }

      // Flash
      if (flashRef.current) {
        flashRef.current.alpha -= 0.02;
        if (flashRef.current.alpha <= 0) flashRef.current = null;
        else {
          ctx.globalAlpha = flashRef.current.alpha;
          ctx.fillStyle = flashRef.current.correct ? "#6ee7b7" : "#fb7185";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.fillText(flashRef.current.text, W / 2, H / 2 - 30);
          ctx.globalAlpha = 1;
        }
      }

      if (doneRef.current) {
        ctx.fillStyle = "rgba(6,8,20,0.78)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#f6c453";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText("KINGDOM SORTED!", W / 2, H / 2);
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
  }, [level, watchMode, minHeap]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
    />
  );
}

export default function HeapSortGame() {
  const router = useRouter();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showStats, setShowStats] = useState(false);
  const [totalOps, setTotalOps] = useState(0);
  const [startTime] = useState(Date.now());
  const { hintsUsed, useHint } = useHints(SLUG);
  const { upsert } = useProgress(SLUG, TOTAL_LEVELS);
  const nextModule = getNextModule(SLUG);
  const levelConfig = CONFIG.levels[currentLevel - 1];
  const isMinHeap = currentLevel === 5;

  const handleLevelComplete = useCallback((ops: number) => {
    setTotalOps((p) => p + ops);
    upsert(currentLevel);
    if (currentLevel >= TOTAL_LEVELS) setShowStats(true);
  }, [currentLevel, upsert]);

  const stats: CompletionStats = {
    operationsUsed: totalOps,
    optimalOperations: 24,
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
        <div style={{ padding: "24px 24px 80px", maxWidth: 880, margin: "0 auto" }}>
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "#f6c453", padding: "3px 10px", background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4 }}>
              LEVEL {currentLevel} — {levelConfig.name.toUpperCase()}
            </span>
            {isMinHeap && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#6ee7b7", letterSpacing: "0.15em" }}>MIN HEAP MODE</span>}
          </div>
          <HeapCanvas key={currentLevel} level={currentLevel} onComplete={handleLevelComplete} watchMode={levelConfig.isWatchMode} minHeap={isMinHeap} />
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
