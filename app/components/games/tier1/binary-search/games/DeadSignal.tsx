"use client";
// LC #162 — Find Peak Element. 14 mountains, 5 power cells.
// Scan Peak (O(1)/scan, 1 cell): exact height only.
// Scan + Neighbors (O(1)/scan, 2 cells): mountain + both neighbors.
// Thermal Overview (O(n), 3 cells, once): rough heat gradient, no exact values.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N = 14;
const MAX_CELLS = 5;

function makePeakHeights(): number[] {
  const h: number[] = new Array(N).fill(0);
  const peakIdx = 2 + Math.floor(Math.random() * (N - 4));
  for (let i = 0; i <= peakIdx; i++) {
    h[i] = Math.floor((i / peakIdx) * 80) + 20 + Math.floor(Math.random() * 15);
  }
  for (let i = peakIdx + 1; i < N; i++) {
    const descent = (i - peakIdx) / (N - peakIdx);
    h[i] = Math.floor(h[peakIdx] * (1 - descent)) + 10 + Math.floor(Math.random() * 12);
  }
  h[peakIdx] = Math.max(h[peakIdx], 95 + Math.floor(Math.random() * 10));
  return h;
}

function isPeak(h: number[], i: number): boolean {
  const leftOk = i === 0 || h[i] > h[i - 1];
  const rightOk = i === N - 1 || h[i] > h[i + 1];
  return leftOk && rightOk;
}

function emitToolUsed(tool: string, complexity: string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("bs-tool-used", { detail: { tool, complexity } }));
}

export default function DeadSignal({ onSolve, onAttempt }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: () => void } | null>(null);
  const solvedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function init() {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !containerRef.current) return;

      const W = containerRef.current.clientWidth || 800;
      const H = containerRef.current.clientHeight || 500;

      const HEIGHTS = makePeakHeights();

      class DeadSignalScene extends Phaser.Scene {
        private mountains: Phaser.GameObjects.Container[] = [];
        private cellsLeft = MAX_CELLS;
        private cellText!: Phaser.GameObjects.Text;
        private statusText!: Phaser.GameObjects.Text;
        private rangeText!: Phaser.GameObjects.Text;
        private busy = false;
        private left = 0;
        private right = N - 1;
        private probed: Set<number> = new Set();
        private toolMode = "Scan Peak";
        private thermalUsed = false;
        private toolSelectHandler!: (e: Event) => void;

        constructor() { super({ key: "DeadSignalScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#030608");
          this.drawSky();
          this.buildMountains();
          this.buildHUD();

          this.toolSelectHandler = (e: Event) => {
            this.toolMode = (e as CustomEvent).detail.tool as string;
            this.updateToolHints();
          };
          window.addEventListener("bs-tool-select", this.toolSelectHandler);
          this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener("bs-tool-select", this.toolSelectHandler);
          });

          this.input.on("pointerdown", this.onClick, this);
        }

        drawSky() {
          const g = this.add.graphics();
          for (let i = 0; i < 10; i++) {
            g.fillStyle(0x001122, 0.03 + i * 0.02);
            g.fillRect(0, 0, W, H * 0.6);
          }
          g.lineStyle(1, 0x0a2040, 0.5);
          g.lineBetween(0, H * 0.62, W, H * 0.62);
          for (let s = 0; s < 60; s++) {
            g.fillStyle(0xaaaacc, 0.3 + Math.random() * 0.6);
            g.fillCircle(Math.random() * W, Math.random() * H * 0.55, 0.7);
          }
        }

        buildMountains() {
          const pad = 20;
          const mw = Math.floor((W - pad * 2) / N);
          const groundY = H * 0.72;
          const maxMH = H * 0.45;

          for (let i = 0; i < N; i++) {
            const cx = pad + i * mw + mw / 2;
            const mh = (HEIGHTS[i] / 110) * maxMH;
            const hw = Math.max(mw * 0.38, 10);
            const container = this.add.container(cx, groundY);

            const body = this.add.graphics();
            body.fillStyle(0x0a1828, 1);
            body.fillTriangle(-hw, 0, hw, 0, 0, -mh);
            body.lineStyle(1, 0x1a3050, 1);
            body.strokeTriangle(-hw, 0, hw, 0, 0, -mh);

            const heightLabel = this.add.text(0, -mh - 12, "", {
              fontFamily: "monospace", fontSize: "8px", color: "#0a2040",
            }).setOrigin(0.5).setName("hlabel");

            const ring = this.add.graphics().setName("ring").setVisible(false);

            const heatBar = this.add.graphics().setName("heatbar").setVisible(false);

            const idxLabel = this.add.text(0, 8, String(i), {
              fontFamily: "monospace", fontSize: "7px", color: "#0a1828",
            }).setOrigin(0.5);

            container.add([body, ring, heightLabel, heatBar, idxLabel]);
            container.setSize(mw - 2, mh + 20);
            container.setInteractive({ cursor: "pointer" });
            container.setData("index", i);
            this.mountains.push(container);

            container.on("pointerover", () => {
              if (this.busy || this.probed.has(i)) return;
              const b = container.list[0] as Phaser.GameObjects.Graphics;
              b.clear();
              b.fillStyle(0x0e2038, 1);
              b.fillTriangle(-hw, 0, hw, 0, 0, -mh);
              b.lineStyle(1, 0x2a5080, 1);
              b.strokeTriangle(-hw, 0, hw, 0, 0, -mh);
            });
            container.on("pointerout", () => {
              if (this.busy || this.probed.has(i)) return;
              const b = container.list[0] as Phaser.GameObjects.Graphics;
              b.clear();
              b.fillStyle(0x0a1828, 1);
              b.fillTriangle(-hw, 0, hw, 0, 0, -mh);
              b.lineStyle(1, 0x1a3050, 1);
              b.strokeTriangle(-hw, 0, hw, 0, 0, -mh);
            });
          }

          const gnd = this.add.graphics();
          gnd.fillStyle(0x050e18, 1);
          gnd.fillRect(0, groundY, W, H - groundY);
          gnd.lineStyle(1, 0x0a2030, 1);
          gnd.lineBetween(0, groundY, W, groundY);
        }

        buildHUD() {
          const bar = this.add.graphics();
          bar.fillStyle(0x020406, 1);
          bar.fillRect(0, 0, W, 44);
          bar.lineStyle(1, 0x0a2040, 1);
          bar.lineBetween(0, 44, W, 44);

          this.add.text(16, 12, "// DEAD SIGNAL", {
            fontFamily: "monospace", fontSize: "10px", color: "#0a2040",
          });
          this.add.text(W / 2, 10, "FIND THE PEAK SIGNAL", {
            fontFamily: "monospace", fontSize: "10px", color: "#1a4060",
          }).setOrigin(0.5, 0);

          this.cellText = this.add.text(W - 16, 12, `CELLS: ${MAX_CELLS}`, {
            fontFamily: "monospace", fontSize: "10px", color: "#22c55e",
          }).setOrigin(1, 0);

          this.statusText = this.add.text(W / 2, H - 36, "CLICK A MOUNTAIN TO PROBE", {
            fontFamily: "monospace", fontSize: "10px", color: "#0a2040",
          }).setOrigin(0.5);

          this.rangeText = this.add.text(W / 2, H - 20, `SEARCH: [${this.left}..${this.right}]`, {
            fontFamily: "monospace", fontSize: "9px", color: "#061828",
          }).setOrigin(0.5);
        }

        updateToolHints() {
          if (this.toolMode === "Thermal Overview") {
            if (this.thermalUsed) {
              this.statusText.setText("THERMAL USED — click mountain to scan").setStyle({ color: "#374151" });
            } else {
              this.statusText.setText("THERMAL: costs 3 cells — click any mountain to activate").setStyle({ color: "#f97316" });
            }
          } else if (this.toolMode === "Scan + Neighbors") {
            this.statusText.setText("SCAN + NEIGHBORS: costs 2 cells — reveals mountain + both neighbors").setStyle({ color: "#3b82f6" });
          } else {
            this.statusText.setText("SCAN PEAK: costs 1 cell — reveals exact height only").setStyle({ color: "#0a2040" });
          }
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;

          const pad = 20;
          const mw = Math.floor((W - pad * 2) / N);
          const groundY = H * 0.72;
          const maxMH = H * 0.45;

          for (let i = 0; i < N; i++) {
            const cx = pad + i * mw + mw / 2;
            const mh = (HEIGHTS[i] / 110) * maxMH;
            if (Math.abs(pointer.x - cx) < mw / 2 && pointer.y > groundY - mh - 15 && pointer.y < groundY + 10) {
              if (this.toolMode === "Thermal Overview") {
                this.doThermal(pointer.x, pointer.y);
              } else if (this.toolMode === "Scan + Neighbors") {
                this.doScanNeighbors(i, pointer.x, pointer.y);
              } else {
                this.doScanPeak(i, pointer.x, pointer.y);
              }
              return;
            }
          }
        }

        spendCells(n: number): boolean {
          if (this.cellsLeft < n) {
            this.statusText.setText(`NOT ENOUGH CELLS — need ${n}, have ${this.cellsLeft}`).setStyle({ color: "#ef4444" });
            return false;
          }
          this.cellsLeft -= n;
          this.cellText.setText(`CELLS: ${this.cellsLeft}`).setStyle({
            color: this.cellsLeft <= 1 ? "#ef4444" : this.cellsLeft <= 2 ? "#eab308" : "#22c55e",
          });
          return true;
        }

        doScanPeak(i: number, px: number, py: number) {
          if (this.probed.has(i)) return;
          if (!this.spendCells(1)) return;
          this.busy = true;
          onAttempt();
          emitToolUsed("Scan Peak", "O(1)/scan");
          playSound("beep");

          this.probed.add(i);
          const peak = isPeak(HEIGHTS, i);
          this.revealMountain(i, peak, false);

          const leftStr = i > 0 ? (HEIGHTS[i] > HEIGHTS[i - 1] ? "↑" : "↓") : "⊣";
          const rightStr = i < N - 1 ? (HEIGHTS[i] > HEIGHTS[i + 1] ? "↑" : "↓") : "⊢";

          if (peak) {
            this.onPeakFound(i, px, py);
          } else {
            const goRight = i < N - 1 && HEIGHTS[i + 1] > HEIGHTS[i];
            if (goRight) this.left = i + 1; else this.right = i;
            this.statusText.setText(`[${i}]:${HEIGHTS[i]}  ${leftStr}L ${rightStr}R — go ${goRight ? "RIGHT" : "LEFT"}`).setStyle({ color: "#4a8aaa" });
            this.rangeText.setText(`SEARCH: [${this.left}..${this.right}]`);
            emitReaction(goRight ? "SLIDE_RIGHT" : "SLIDE_LEFT", goRight ? "→ STRONGER" : "← STRONGER", px, py);
            playSound("correct");
            if (this.cellsLeft <= 0) {
              this.time.delayedCall(400, () => this.showRetry());
            } else {
              this.busy = false;
            }
          }
        }

        doScanNeighbors(i: number, px: number, py: number) {
          if (!this.spendCells(2)) return;
          this.busy = true;
          onAttempt();
          emitToolUsed("Scan + Neighbors", "O(1)/scan");
          playSound("beep");

          // reveal i, i-1, i+1
          const toReveal = [i - 1, i, i + 1].filter(idx => idx >= 0 && idx < N);
          for (const idx of toReveal) {
            if (!this.probed.has(idx)) {
              this.probed.add(idx);
              this.revealMountain(idx, isPeak(HEIGHTS, idx), false);
            }
          }

          const peak = isPeak(HEIGHTS, i);
          if (peak) {
            this.onPeakFound(i, px, py);
            return;
          }

          // also check if any neighbor is peak
          for (const idx of [i - 1, i + 1]) {
            if (idx >= 0 && idx < N && isPeak(HEIGHTS, idx)) {
              this.onPeakFound(idx, px, py);
              return;
            }
          }

          const goRight = i < N - 1 && HEIGHTS[i + 1] > HEIGHTS[i];
          if (goRight) this.left = Math.max(this.left, i + 1);
          else this.right = Math.min(this.right, i);

          this.statusText.setText(`SCANNED [${Math.max(0, i - 1)}..${Math.min(N - 1, i + 1)}] — go ${goRight ? "RIGHT" : "LEFT"}`).setStyle({ color: "#3b82f6" });
          this.rangeText.setText(`SEARCH: [${this.left}..${this.right}]`);
          emitReaction(goRight ? "SLIDE_RIGHT" : "SLIDE_LEFT", goRight ? "→ STRONGER" : "← STRONGER", px, py);
          playSound("correct");

          if (this.cellsLeft <= 0) {
            this.time.delayedCall(400, () => this.showRetry());
          } else {
            this.busy = false;
          }
        }

        doThermal(px: number, py: number) {
          if (this.thermalUsed) {
            this.statusText.setText("THERMAL ALREADY USED — choose Scan Peak or Scan + Neighbors").setStyle({ color: "#374151" });
            return;
          }
          if (!this.spendCells(3)) return;
          this.busy = true;
          onAttempt();
          emitToolUsed("Thermal Overview", "O(n)");
          playSound("beep");

          this.thermalUsed = true;
          emitReaction("INSIGHT", "🌡 THERMAL", px, py);

          const pad = 20;
          const mw = Math.floor((W - pad * 2) / N);
          const maxMH = H * 0.45;
          const maxH = Math.max(...HEIGHTS);

          // show heat gradient briefly on all mountains — rough only (no exact values)
          for (let i = 0; i < N; i++) {
            const ratio = HEIGHTS[i] / maxH; // 0..1
            const container = this.mountains[i];
            const mh = (HEIGHTS[i] / 110) * maxMH;
            const hw = Math.max(mw * 0.38, 10);

            // heat color: cold=dark blue, warm=orange, hot=red
            let col: number;
            if (ratio > 0.8) col = 0xef4444;
            else if (ratio > 0.6) col = 0xf97316;
            else if (ratio > 0.4) col = 0xeab308;
            else if (ratio > 0.2) col = 0x22d3ee;
            else col = 0x1e40af;

            const body = container.list[0] as Phaser.GameObjects.Graphics;
            body.clear();
            body.fillStyle(col, 0.35);
            body.fillTriangle(-hw, 0, hw, 0, 0, -mh);
            body.lineStyle(1, col, 0.6);
            body.strokeTriangle(-hw, 0, hw, 0, 0, -mh);

            // rough tier label (not exact height)
            const tier = ratio > 0.75 ? "███" : ratio > 0.5 ? "██" : ratio > 0.25 ? "█" : "▒";
            const hlabel = container.getByName("hlabel") as Phaser.GameObjects.Text;
            hlabel.setText(tier).setStyle({ color: `#${col.toString(16).padStart(6, "0")}`, fontSize: "7px" });
          }

          this.statusText.setText("THERMAL: rough gradient shown — exact values hidden. Act fast.").setStyle({ color: "#f97316" });

          // fade thermal after 2.5s, restore original mountain colors
          this.time.delayedCall(2500, () => {
            for (let i = 0; i < N; i++) {
              if (this.probed.has(i)) continue;
              const container = this.mountains[i];
              const mh = (HEIGHTS[i] / 110) * maxMH;
              const hw = Math.max(mw * 0.38, 10);
              const body = container.list[0] as Phaser.GameObjects.Graphics;
              body.clear();
              body.fillStyle(0x0a1828, 1);
              body.fillTriangle(-hw, 0, hw, 0, 0, -mh);
              body.lineStyle(1, 0x1a3050, 1);
              body.strokeTriangle(-hw, 0, hw, 0, 0, -mh);
              const hlabel = container.getByName("hlabel") as Phaser.GameObjects.Text;
              hlabel.setText("").setStyle({ color: "#0a2040" });
            }
            this.statusText.setText("THERMAL FADED — use Scan to narrow down").setStyle({ color: "#374151" });
          });

          if (this.cellsLeft <= 0) {
            this.time.delayedCall(400, () => this.showRetry());
          } else {
            this.busy = false;
          }
        }

        revealMountain(i: number, peak: boolean, skipStatusUpdate: boolean) {
          const pad = 20;
          const mw = Math.floor((W - pad * 2) / N);
          const maxMH = H * 0.45;
          const mh = (HEIGHTS[i] / 110) * maxMH;
          const hw = Math.max(mw * 0.38, 10);
          const container = this.mountains[i];

          const body = container.list[0] as Phaser.GameObjects.Graphics;
          body.clear();
          body.fillStyle(peak ? 0x001a10 : 0x0a1828, 1);
          body.fillTriangle(-hw, 0, hw, 0, 0, -mh);
          body.lineStyle(peak ? 2 : 1, peak ? 0x22c55e : 0x3a5080, 1);
          body.strokeTriangle(-hw, 0, hw, 0, 0, -mh);

          const ring = container.getByName("ring") as Phaser.GameObjects.Graphics;
          ring.setVisible(true);
          ring.lineStyle(1, peak ? 0x22c55e : 0x3a6090, 0.6);
          ring.strokeCircle(0, -mh, 12);

          const hlabel = container.getByName("hlabel") as Phaser.GameObjects.Text;
          hlabel.setText(String(HEIGHTS[i])).setStyle({ color: peak ? "#22c55e" : "#4a8aaa", fontSize: "9px" });
        }

        onPeakFound(i: number, px: number, py: number) {
          solvedRef.current = true;
          playSound("solve");
          this.statusText.setText(`PEAK SIGNAL AT [${i}] — STRENGTH ${HEIGHTS[i]}`).setStyle({ color: "#22c55e" });
          emitReaction("BURST", "📡 PEAK FOUND", px, py);

          this.tweens.add({
            targets: this.mountains[i],
            scaleX: 1.15, scaleY: 1.15,
            duration: 250, yoyo: true, repeat: 1,
            onComplete: () => this.time.delayedCall(600, () => onSolve()),
          });
        }

        showRetry() {
          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.75);
          ov.fillRect(0, 0, W, H);

          this.add.text(W / 2, H / 2 - 24, "POWER CELLS DEPLETED", {
            fontFamily: "monospace", fontSize: "12px", color: "#4a8aaa",
          }).setOrigin(0.5).setDepth(21);
          this.add.text(W / 2, H / 2 - 6, "Thermal Overview wastes cells — Scan Peak + binary logic uses only 4", {
            fontFamily: "monospace", fontSize: "9px", color: "#1a3a5a",
          }).setOrigin(0.5).setDepth(21);

          const btn = this.add.text(W / 2, H / 2 + 20, "[ RETRY ]", {
            fontFamily: "monospace", fontSize: "12px", color: "#3b82f6",
            backgroundColor: "#030608", padding: { x: 18, y: 8 },
          }).setOrigin(0.5).setDepth(21).setInteractive({ cursor: "pointer" });

          btn.on("pointerdown", () => {
            solvedRef.current = false;
            this.scene.restart();
          });
        }
      }

      if (gameRef.current) { gameRef.current.destroy(); gameRef.current = null; }
      const g = new Phaser.Game({
        type: Phaser.AUTO, width: W, height: H,
        parent: containerRef.current!, backgroundColor: "#030608",
        scene: DeadSignalScene, render: { antialias: true },
      });
      gameRef.current = { destroy: () => g.destroy(true) };
    }

    init();
    return () => {
      cancelled = true;
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", cursor: "crosshair" }} />;
}
