"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import VisualiserLayout from "@/components/VisualiserLayout";
import { StatsModal, CompletionStats } from "@/components/games/sorting/StatsModal";
import { useHints } from "@/lib/useHints";
import { useProgress } from "@/lib/useProgress";
import { getModuleConfig, getNextModule } from "@/lib/sorting/gameConfigs";
import { mergeNextSide, shuffle } from "@/lib/sorting/algorithms";
import { correctSound, wrongSound, completionSound } from "@/lib/sounds";
import { useRouter } from "next/navigation";

const SLUG = "merge-sort";
const CONFIG = getModuleConfig(SLUG)!;
const TOTAL_LEVELS = CONFIG.levels.length;

// ─── Merge sort tree types ────────────────────────────────────────────────────

interface TreeNode {
  id: string;
  values: number[];
  left?: TreeNode;
  right?: TreeNode;
  merged?: number[];
  depth: number;
  x: number;
  y: number;
}

function buildTree(values: number[], depth = 0, id = "root"): TreeNode {
  if (values.length <= 1) return { id, values, depth, x: 0, y: 0 };
  const mid = Math.floor(values.length / 2);
  return {
    id,
    values,
    depth,
    x: 0, y: 0,
    left: buildTree(values.slice(0, mid), depth + 1, id + "L"),
    right: buildTree(values.slice(mid), depth + 1, id + "R"),
  };
}

function layoutTree(node: TreeNode, x: number, y: number, spread: number) {
  node.x = x;
  node.y = y;
  if (node.left) layoutTree(node.left, x - spread, y + 90, spread / 2);
  if (node.right) layoutTree(node.right, x + spread, y + 90, spread / 2);
}

// ─── Canvas merge sort game ───────────────────────────────────────────────────

type GamePhase = "split" | "merge" | "done";

interface MergeState {
  array: number[];
  tree: TreeNode;
  currentNode: TreeNode | null;
  phase: GamePhase;
  mergeLeft: number[];
  mergeRight: number[];
  mergedSoFar: number[];
  li: number;
  ri: number;
  ops: number;
}

const W = 820, H = 500;
const BLOCK_W = 36, BLOCK_H = 36;

function MergeCanvas({ level, onComplete, watchMode }: {
  level: number; onComplete: (ops: number) => void; watchMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<MergeState | null>(null);
  const animRef = useRef(0);
  const flashRef = useRef<{ text: string; alpha: number; correct: boolean } | null>(null);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  function findLeaves(node: TreeNode): TreeNode[] {
    if (!node.left && !node.right) return [node];
    const result: TreeNode[] = [];
    if (node.left) result.push(...findLeaves(node.left));
    if (node.right) result.push(...findLeaves(node.right));
    return result;
  }

  function findFirstUnsplitNode(node: TreeNode): TreeNode | null {
    if (node.values.length <= 1) return null;
    if (!node.left || !node.right) return node;
    const l = findFirstUnsplitNode(node.left);
    if (l) return l;
    return findFirstUnsplitNode(node.right);
  }

  function findFirstUnmergedPair(node: TreeNode): TreeNode | null {
    if (!node.left && !node.right) return null;
    if (node.left && node.right && !node.merged) {
      const leftDone = !node.left.left && !node.left.right;
      const rightDone = !node.right.left && !node.right.right;
      if (leftDone && rightDone) return node;
    }
    if (node.left) {
      const l = findFirstUnmergedPair(node.left);
      if (l) return l;
    }
    if (node.right) {
      const r = findFirstUnmergedPair(node.right);
      if (r) return r;
    }
    return null;
  }

  function checkDone(tree: TreeNode): boolean {
    if (!tree.merged) return false;
    return true;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    doneRef.current = false;

    const initialArr = shuffle(Array.from({ length: 8 }, (_, i) => i + 1));
    const tree = buildTree(initialArr);
    layoutTree(tree, W / 2, 50, 200);

    stateRef.current = {
      array: initialArr,
      tree,
      currentNode: null,
      phase: "split",
      mergeLeft: [], mergeRight: [], mergedSoFar: [],
      li: 0, ri: 0,
      ops: 0,
    };

    function handleClick(e: MouseEvent) {
      const s = stateRef.current;
      if (!s || doneRef.current) return;
      const rect = canvas!.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      if (s.phase === "split") {
        // Click on a splittable node
        const node = findClickedNode(s.tree, cx, cy);
        if (!node || node.values.length <= 1) {
          wrongSound();
          flashRef.current = { text: "ALREADY SPLIT", alpha: 1, correct: false };
          return;
        }
        // Check if it's the first unsplit (enforce depth-first)
        const expected = findFirstUnsplitNode(s.tree);
        if (expected && node.id !== expected.id) {
          wrongSound();
          flashRef.current = { text: "SPLIT TOP-DOWN", alpha: 1, correct: false };
          return;
        }
        correctSound();
        s.ops++;
        flashRef.current = { text: "SPLIT!", alpha: 1, correct: true };
        // Actually split: mark children as visible by setting values
        const mid = Math.floor(node.values.length / 2);
        if (!node.left) node.left = buildTree(node.values.slice(0, mid), node.depth + 1, node.id + "L");
        if (!node.right) node.right = buildTree(node.values.slice(mid), node.depth + 1, node.id + "R");
        layoutTree(s.tree, W / 2, 50, 200);

        // Check if all splits done
        const allLeaves = findLeaves(s.tree).every((n) => n.values.length <= 1);
        if (allLeaves) {
          if (level === 2) { // split only level
            doneRef.current = true;
            completionSound();
            setTimeout(() => onComplete(s.ops), 500);
          } else {
            s.phase = "merge";
          }
        }
      } else if (s.phase === "merge") {
        const mergeNode = findFirstUnmergedPair(s.tree);
        if (!mergeNode || !mergeNode.left || !mergeNode.right) return;

        const left = mergeNode.left.merged ?? mergeNode.left.values;
        const right = mergeNode.right.merged ?? mergeNode.right.values;

        if (s.mergeLeft.length === 0) {
          s.mergeLeft = [...left];
          s.mergeRight = [...right];
          s.mergedSoFar = [];
          s.li = 0; s.ri = 0;
          s.currentNode = mergeNode;
        }

        // User clicked which side to pick
        let pickedSide: 0 | 1 | null = null;
        // Check if clicked in left or right region of merge panel
        if (cy > H - 100) {
          if (cx < W / 2) pickedSide = 0;
          else pickedSide = 1;
        }

        if (pickedSide === null) return;

        const correctSide = mergeNextSide(s.mergeLeft, s.mergeRight, s.li, s.ri);
        if (pickedSide === correctSide) {
          correctSound();
          s.ops++;
          if (pickedSide === 0) { s.mergedSoFar.push(s.mergeLeft[s.li]); s.li++; }
          else { s.mergedSoFar.push(s.mergeRight[s.ri]); s.ri++; }
          flashRef.current = { text: "✓ CORRECT", alpha: 1, correct: true };

          if (s.li >= s.mergeLeft.length && s.ri >= s.mergeRight.length) {
            // Merge complete for this node
            mergeNode.merged = [...s.mergedSoFar];
            // Detach children to make it a leaf
            mergeNode.left = undefined;
            mergeNode.right = undefined;
            mergeNode.values = mergeNode.merged;
            s.mergeLeft = []; s.mergeRight = []; s.mergedSoFar = [];
            s.li = 0; s.ri = 0;
            s.currentNode = null;
            layoutTree(s.tree, W / 2, 50, 200);

            if (checkDone(s.tree)) {
              doneRef.current = true;
              completionSound();
              setTimeout(() => onComplete(s.ops), 500);
            }
          }
        } else {
          wrongSound();
          flashRef.current = { text: "PICK SMALLER", alpha: 1, correct: false };
        }
      }
    }

    if (!watchMode) canvas.addEventListener("click", handleClick);

    // Watch mode auto-play
    if (watchMode) {
      const autoStep = () => {
        const s = stateRef.current;
        if (!s || doneRef.current) return;

        if (s.phase === "split") {
          const node = findFirstUnsplitNode(s.tree);
          if (node) {
            const mid = Math.floor(node.values.length / 2);
            if (!node.left) node.left = buildTree(node.values.slice(0, mid), node.depth + 1, node.id + "L");
            if (!node.right) node.right = buildTree(node.values.slice(mid), node.depth + 1, node.id + "R");
            layoutTree(s.tree, W / 2, 50, 200);
            s.ops++;
            const allLeaves = findLeaves(s.tree).every((n) => n.values.length <= 1);
            if (allLeaves) s.phase = "merge";
          }
        } else {
          const mn = findFirstUnmergedPair(s.tree);
          if (mn && mn.left && mn.right) {
            const left = mn.left.merged ?? mn.left.values;
            const right = mn.right.merged ?? mn.right.values;
            const merged: number[] = [];
            let li = 0, ri = 0;
            while (li < left.length || ri < right.length) {
              const side = mergeNextSide(left, right, li, ri);
              if (side === 0) merged.push(left[li++]);
              else merged.push(right[ri++]);
            }
            mn.merged = merged;
            mn.left = undefined; mn.right = undefined; mn.values = merged;
            s.ops++;
            layoutTree(s.tree, W / 2, 50, 200);
            if (checkDone(s.tree)) {
              doneRef.current = true;
              completionSound();
              setTimeout(() => onComplete(s.ops), 500);
              return;
            }
          }
        }

        if (!doneRef.current) watchTimerRef.current = setTimeout(autoStep, 900);
      };
      watchTimerRef.current = setTimeout(autoStep, 800);
    }

    function findClickedNode(node: TreeNode, cx: number, cy: number): TreeNode | null {
      const hw = (node.values.length * (BLOCK_W + 4)) / 2;
      if (cx > node.x - hw && cx < node.x + hw && cy > node.y && cy < node.y + BLOCK_H + 10) {
        return node;
      }
      if (node.left) { const l = findClickedNode(node.left, cx, cy); if (l) return l; }
      if (node.right) { const r = findClickedNode(node.right, cx, cy); if (r) return r; }
      return null;
    }

    function drawNode(node: TreeNode) {
      const s = stateRef.current!;
      const isCurrent = s.currentNode?.id === node.id;
      const values = node.merged ?? node.values;

      // Draw connections first
      if (node.left) {
        ctx.strokeStyle = "rgba(167,139,250,0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y + BLOCK_H);
        ctx.lineTo(node.left.x, node.left.y);
        ctx.stroke();
        drawNode(node.left);
      }
      if (node.right) {
        ctx.strokeStyle = "rgba(167,139,250,0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y + BLOCK_H);
        ctx.lineTo(node.right.x, node.right.y);
        ctx.stroke();
        drawNode(node.right);
      }

      // Draw blocks
      const totalW = values.length * (BLOCK_W + 4) - 4;
      const startX = node.x - totalW / 2;
      values.forEach((val, i) => {
        const bx = startX + i * (BLOCK_W + 4);
        const by = node.y;
        const isMerged = !!node.merged;
        ctx.fillStyle = isMerged ? "rgba(110,231,183,0.2)" : isCurrent ? "rgba(246,196,83,0.2)" : "rgba(167,139,250,0.1)";
        ctx.strokeStyle = isMerged ? "rgba(110,231,183,0.6)" : isCurrent ? "#f6c453" : "rgba(167,139,250,0.4)";
        ctx.lineWidth = 1.5;
        ctx.roundRect(bx, by, BLOCK_W, BLOCK_H, 4);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = isMerged ? "#6ee7b7" : isCurrent ? "#f6c453" : "#c4b5fd";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(val), bx + BLOCK_W / 2, by + BLOCK_H / 2);
      });
    }

    function render() {
      animRef.current = requestAnimationFrame(render);
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#080b1a");
      bg.addColorStop(1, "#050710");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      if (s) drawNode(s.tree);

      // Merge panel at bottom (phase=merge)
      if (s?.phase === "merge" && s.mergeLeft.length > 0) {
        const panelY = H - 110;
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.roundRect(20, panelY, W - 40, 90, 8);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "rgba(232,244,255,0.3)";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText("CLICK TO PICK: LEFT", W / 4, panelY + 12);
        ctx.fillText("RIGHT", (3 * W) / 4, panelY + 12);

        // Left remaining
        s.mergeLeft.slice(s.li).forEach((v, i) => {
          const bx = W / 4 - ((s.mergeLeft.length - s.li) * (BLOCK_W + 4)) / 2 + i * (BLOCK_W + 4);
          const by = panelY + 22;
          ctx.fillStyle = s.li < s.mergeLeft.length && i === 0 ? "rgba(0,229,255,0.25)" : "rgba(167,139,250,0.15)";
          ctx.strokeStyle = i === 0 ? "#00e5ff" : "rgba(167,139,250,0.3)";
          ctx.lineWidth = 1.5;
          ctx.roundRect(bx, by, BLOCK_W, BLOCK_H, 4);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = i === 0 ? "#00e5ff" : "#c4b5fd";
          ctx.font = "bold 13px monospace";
          ctx.fillText(String(v), bx + BLOCK_W / 2, by + BLOCK_H / 2);
        });

        // Right remaining
        s.mergeRight.slice(s.ri).forEach((v, i) => {
          const bx = (3 * W) / 4 - ((s.mergeRight.length - s.ri) * (BLOCK_W + 4)) / 2 + i * (BLOCK_W + 4);
          const by = panelY + 22;
          ctx.fillStyle = s.ri < s.mergeRight.length && i === 0 ? "rgba(0,229,255,0.25)" : "rgba(167,139,250,0.15)";
          ctx.strokeStyle = i === 0 ? "#00e5ff" : "rgba(167,139,250,0.3)";
          ctx.roundRect(bx, by, BLOCK_W, BLOCK_H, 4);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = i === 0 ? "#00e5ff" : "#c4b5fd";
          ctx.font = "bold 13px monospace";
          ctx.fillText(String(v), bx + BLOCK_W / 2, by + BLOCK_H / 2);
        });

        // Merged so far
        ctx.fillStyle = "rgba(232,244,255,0.25)";
        ctx.font = "9px monospace";
        ctx.fillText("MERGED:", W / 2, panelY + 70);
        s.mergedSoFar.forEach((v, i) => {
          const bx = W / 2 - (s.mergedSoFar.length * (BLOCK_W + 4)) / 2 + i * (BLOCK_W + 4);
          ctx.fillStyle = "rgba(110,231,183,0.2)";
          ctx.strokeStyle = "#6ee7b7";
          ctx.roundRect(bx + 30, panelY + 56, BLOCK_W, BLOCK_H - 10, 3);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#6ee7b7";
          ctx.font = "bold 11px monospace";
          ctx.fillText(String(v), bx + 30 + BLOCK_W / 2, panelY + 56 + (BLOCK_H - 10) / 2);
        });
      }

      // Phase label
      if (s) {
        ctx.fillStyle = "rgba(232,244,255,0.3)";
        ctx.font = "9px monospace";
        ctx.textAlign = "right";
        ctx.letterSpacing = "2px";
        ctx.fillText(`PHASE: ${s.phase.toUpperCase()}  OPS: ${s.ops}`, W - 12, 18);
        ctx.textAlign = "left";
        ctx.letterSpacing = "0px";
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
          ctx.fillText(flashRef.current.text, W / 2, H / 2 - 20);
          ctx.globalAlpha = 1;
        }
      }

      if (doneRef.current) {
        ctx.fillStyle = "rgba(6,8,20,0.75)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#6ee7b7";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText("DISTRICTS MERGED!", W / 2, H / 2);
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

export default function MergeSortGame() {
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
          <div style={{ marginBottom: 14 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em",
              color: "#f6c453", padding: "3px 10px",
              background: "rgba(246,196,83,0.08)", border: "1px solid rgba(246,196,83,0.25)", borderRadius: 4,
            }}>
              LEVEL {currentLevel} — {levelConfig.name.toUpperCase()}
            </span>
          </div>
          <MergeCanvas
            key={currentLevel}
            level={currentLevel}
            onComplete={handleLevelComplete}
            watchMode={levelConfig.isWatchMode}
          />
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 13, color: "rgba(232,244,255,0.55)", margin: 0 }}>
              {levelConfig.description}
              {!levelConfig.isWatchMode && (levelConfig.level <= 2
                ? " Click nodes to split them evenly."
                : " Click LEFT or RIGHT side in the merge panel to pick the smaller value.")}
            </p>
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
