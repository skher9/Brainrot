"use client";
// LC #704 — Classic Binary Search. 3 tool modes: Binary Search / Linear Scan / Jump Search.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const VALUES = [3, 7, 12, 18, 24, 31, 39, 45, 52, 61, 70, 78, 85, 91, 97, 104];
const N = VALUES.length; // 16
const JUMP_STEP = 4; // √16

function emitToolUsed(tool: string, complexity: string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("bs-tool-used", { detail: { tool, complexity } }));
}

export default function VaultHeist({ onSolve, onAttempt }: GameProps) {
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
      const TARGET_IDX = Math.floor(Math.random() * N);
      const TARGET_VAL = VALUES[TARGET_IDX];

      class VaultScene extends Phaser.Scene {
        private blocks: Phaser.GameObjects.Container[] = [];
        private toolMode = "Binary Search";
        // BS state
        private left = 0;
        private right = N - 1;
        private mid = -1;
        private eliminated: Set<number> = new Set();
        // Jump state
        private jumpPos = JUMP_STEP - 1; // index 3
        private jumpPrev = 0;
        private jumpPhase: "jumping" | "stepping" = "jumping";
        private jumpStepIdx = 0;
        // shared
        private busy = false;
        private timeLeft = 60;
        // HUD
        private timerText!: Phaser.GameObjects.Text;
        private statusText!: Phaser.GameObjects.Text;
        private pointersText!: Phaser.GameObjects.Text;
        private droneWarned30 = false;
        private droneWarned10 = false;
        private timerEvent?: Phaser.Time.TimerEvent;
        // Tool UI
        private midGlow!: Phaser.GameObjects.Graphics;
        private bsLeftBtn?: Phaser.GameObjects.Text;
        private bsHereBtn?: Phaser.GameObjects.Text;
        private bsRightBtn?: Phaser.GameObjects.Text;
        private scanBtn?: Phaser.GameObjects.Text;
        private jumpNextBtn?: Phaser.GameObjects.Text;
        private jumpBackBtn?: Phaser.GameObjects.Text;
        private toolSelectHandler!: (e: Event) => void;

        constructor() { super({ key: "VaultScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#040810");
          this.drawGrid();
          this.buildBlocks();
          this.buildHUD();
          this.midGlow = this.add.graphics().setDepth(3);

          this.toolSelectHandler = (e: Event) => {
            const tool = (e as CustomEvent).detail.tool as string;
            if (tool === this.toolMode) return;
            this.toolMode = tool;
            this.clearToolUI();
            this.setupToolMode();
          };
          window.addEventListener("bs-tool-select", this.toolSelectHandler);

          this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener("bs-tool-select", this.toolSelectHandler);
          });

          this.setupToolMode();

          this.timerEvent = this.time.addEvent({
            delay: 1000, loop: true,
            callback: this.tick, callbackScope: this,
          });
        }

        drawGrid() {
          const g = this.add.graphics();
          g.lineStyle(1, 0x0a1a2a, 1);
          for (let x = 0; x < W; x += 40) g.lineBetween(x, 0, x, H);
          for (let y = 0; y < H; y += 40) g.lineBetween(0, y, W, y);
        }

        buildBlocks() {
          const pad = 16, cols = 8;
          const bw = Math.floor((W - pad * 2) / cols);
          const bh = Math.min(Math.floor((H * 0.55) / 2), 68);
          for (let i = 0; i < N; i++) {
            const col = i % cols, row = Math.floor(i / cols);
            const x = pad + col * bw + bw / 2;
            const y = H * 0.28 + row * (bh + 10);
            const c = this.add.container(x, y);
            const bg = this.add.graphics();
            bg.fillStyle(0x0d1a2a, 1);
            bg.fillRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);
            bg.lineStyle(1, 0x1a3a5a, 1);
            bg.strokeRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);
            const val = this.add.text(0, -3, VALUES[i].toString(), {
              fontFamily: "monospace", fontSize: "12px", color: "#2a5a7a",
            }).setOrigin(0.5);
            const idx = this.add.text(0, bh / 2 - 9, `[${i}]`, {
              fontFamily: "monospace", fontSize: "7px", color: "#0a1a2a",
            }).setOrigin(0.5);
            c.add([bg, val, idx]);
            c.setSize(bw - 4, bh);
            c.setData("index", i);
            this.blocks.push(c);
          }
        }

        buildHUD() {
          const bar = this.add.graphics();
          bar.fillStyle(0x020508, 1);
          bar.fillRect(0, 0, W, 44);
          bar.lineStyle(1, 0x0a2040, 1);
          bar.lineBetween(0, 44, W, 44);
          this.add.text(16, 13, "// VAULT HEIST", {
            fontFamily: "monospace", fontSize: "10px", color: "#0a2040",
          });
          this.add.text(W / 2, 13, `TARGET: ${TARGET_VAL}`, {
            fontFamily: "monospace", fontSize: "12px", color: "#3b82f6",
          }).setOrigin(0.5, 0);
          this.timerText = this.add.text(W - 14, 13, "60s", {
            fontFamily: "monospace", fontSize: "11px", color: "#22c55e",
          }).setOrigin(1, 0);
          this.statusText = this.add.text(W / 2, H - 32, "", {
            fontFamily: "monospace", fontSize: "10px", color: "#1a3a5a",
          }).setOrigin(0.5);
          this.pointersText = this.add.text(16, H - 18, `L[${this.left}]···R[${this.right}]`, {
            fontFamily: "monospace", fontSize: "9px", color: "#0a2030",
          });
        }

        setupToolMode() {
          if (this.toolMode === "Binary Search") this.setupBSMode();
          else if (this.toolMode === "Linear Scan") this.setupLinearMode();
          else if (this.toolMode === "Jump Search") this.setupJumpMode();
        }

        clearToolUI() {
          this.midGlow.clear();
          this.bsLeftBtn?.destroy(); this.bsLeftBtn = undefined;
          this.bsHereBtn?.destroy(); this.bsHereBtn = undefined;
          this.bsRightBtn?.destroy(); this.bsRightBtn = undefined;
          this.scanBtn?.destroy(); this.scanBtn = undefined;
          this.jumpNextBtn?.destroy(); this.jumpNextBtn = undefined;
          this.jumpBackBtn?.destroy(); this.jumpBackBtn = undefined;
        }

        // ── BINARY SEARCH MODE ───────────────────────────────────────────────
        setupBSMode() {
          if (this.left > this.right) return;
          this.mid = Math.floor((this.left + this.right) / 2);
          this.highlightMid(this.mid);
          this.statusText.setText(`MID=[${this.mid}] val=${VALUES[this.mid]}  — make your call`).setStyle({ color: "#3b82f6" });
          this.pointersText.setText(`L[${this.left}]···R[${this.right}]···mid[${this.mid}]`);

          const btnY = H - 56;
          const mkBtn = (x: number, text: string, col: string) =>
            this.add.text(x, btnY, text, {
              fontFamily: "monospace", fontSize: "11px", color: col,
              backgroundColor: "#050810", padding: { x: 14, y: 7 },
            }).setOrigin(0.5, 1).setDepth(5).setInteractive({ cursor: "pointer" });

          this.bsLeftBtn = mkBtn(W * 0.2, "← TOO HIGH", "#3b82f6");
          this.bsHereBtn = mkBtn(W * 0.5, "✓ FOUND HERE", "#22c55e");
          this.bsRightBtn = mkBtn(W * 0.8, "TOO LOW →", "#f97316");

          this.bsLeftBtn.on("pointerdown", () => this.bsChoice("left"));
          this.bsHereBtn.on("pointerdown", () => this.bsChoice("here"));
          this.bsRightBtn.on("pointerdown", () => this.bsChoice("right"));

          this.bsLeftBtn.on("pointerover", () => this.bsLeftBtn?.setStyle({ color: "#60a5fa" }));
          this.bsLeftBtn.on("pointerout", () => this.bsLeftBtn?.setStyle({ color: "#3b82f6" }));
          this.bsHereBtn.on("pointerover", () => this.bsHereBtn?.setStyle({ color: "#4ade80" }));
          this.bsHereBtn.on("pointerout", () => this.bsHereBtn?.setStyle({ color: "#22c55e" }));
          this.bsRightBtn.on("pointerover", () => this.bsRightBtn?.setStyle({ color: "#fb923c" }));
          this.bsRightBtn.on("pointerout", () => this.bsRightBtn?.setStyle({ color: "#f97316" }));
        }

        highlightMid(i: number) {
          const pad = 16, cols = 8;
          const bw = Math.floor((W - pad * 2) / cols);
          const bh = Math.min(Math.floor((H * 0.55) / 2), 68);
          const col = i % cols, row = Math.floor(i / cols);
          const x = pad + col * bw + bw / 2;
          const y = H * 0.28 + row * (bh + 10);
          this.midGlow.clear();
          this.midGlow.lineStyle(2, 0x3b82f6, 0.7);
          this.midGlow.strokeRoundedRect(x - bw / 2 + 2, y - bh / 2, bw - 4, bh, 4);
          this.midGlow.fillStyle(0x3b82f6, 0.06);
          this.midGlow.fillRoundedRect(x - bw / 2 + 2, y - bh / 2, bw - 4, bh, 4);
          // upward arrow
          this.midGlow.fillStyle(0x3b82f6, 0.8);
          this.midGlow.fillTriangle(x - 5, y + bh / 2 + 10, x + 5, y + bh / 2 + 10, x, y + bh / 2 + 2);
        }

        bsChoice(dir: "left" | "here" | "right") {
          if (this.busy || solvedRef.current) return;
          this.busy = true;
          onAttempt();
          emitToolUsed("Binary Search", "O(log n)");
          playSound("click");

          const midVal = VALUES[this.mid];

          if (dir === "here") {
            if (midVal === TARGET_VAL) {
              this.clearToolUI();
              this.onFound(this.mid);
            } else {
              this.penalize(16);
              this.flashStatus("NOT FOUND HERE — 16s PENALTY", "#ef4444");
              emitReaction("DANGER", "✗ WRONG BLOCK", this.blocks[this.mid].x, this.blocks[this.mid].y);
              playSound("wrong");
              this.time.delayedCall(800, () => { this.busy = false; });
            }
            return;
          }

          // "left" means user says target < mid → mid is too high
          const correctDir = dir === "left" ? TARGET_VAL < midVal : TARGET_VAL > midVal;

          if (correctDir) {
            const toElim: number[] = [];
            if (dir === "left") {
              for (let k = this.mid; k <= this.right; k++) toElim.push(k);
              this.right = this.mid - 1;
            } else {
              for (let k = this.left; k <= this.mid; k++) toElim.push(k);
              this.left = this.mid + 1;
            }
            for (const k of toElim) this.eliminated.add(k);

            const hint = dir === "left" ? `${midVal} > ${TARGET_VAL} — SEARCH LEFT` : `${midVal} < ${TARGET_VAL} — SEARCH RIGHT`;
            this.flashStatus(hint, "#4a8a6a");
            emitReaction(dir === "left" ? "SLIDE_LEFT" : "SLIDE_RIGHT", dir === "left" ? "← CORRECT" : "CORRECT →", W / 2, H * 0.5);
            playSound("correct");

            this.dimBlocks(toElim, () => {
              this.clearToolUI();
              if (this.left > this.right) {
                // shouldn't happen in well-played game
                this.busy = false;
              } else if (this.left === this.right && VALUES[this.left] === TARGET_VAL) {
                this.onFound(this.left);
              } else {
                this.setupBSMode();
                this.busy = false;
              }
            });
          } else {
            this.penalize(8);
            this.flashStatus("WRONG DIRECTION — 8s PENALTY", "#ef4444");
            emitReaction("DANGER", "✗ WRONG WAY", W / 2, H * 0.4);
            playSound("wrong");
            this.time.delayedCall(700, () => { this.busy = false; });
          }
        }

        // ── LINEAR SCAN MODE ─────────────────────────────────────────────────
        setupLinearMode() {
          this.statusText.setText("LINEAR SCAN: will check every block left to right").setStyle({ color: "#eab308" });
          this.scanBtn = this.add.text(W / 2, H - 52, "▶  START LINEAR SCAN", {
            fontFamily: "monospace", fontSize: "11px", color: "#eab308",
            backgroundColor: "#0a0800", padding: { x: 16, y: 8 },
          }).setOrigin(0.5, 1).setDepth(5).setInteractive({ cursor: "pointer" });

          this.scanBtn.on("pointerdown", () => {
            if (this.busy || solvedRef.current) return;
            this.scanBtn?.destroy(); this.scanBtn = undefined;
            this.busy = true;
            onAttempt();
            this.penalize(15);
            emitToolUsed("Linear Scan", "O(n)");
            emitReaction("DANGER", "−15s PENALTY", W / 2, H * 0.4);
            this.statusText.setText("SCANNING LEFT TO RIGHT...").setStyle({ color: "#eab308" });
            this.runLinearScan(0);
          });

          this.scanBtn.on("pointerover", () => this.scanBtn?.setStyle({ color: "#fbbf24" }));
          this.scanBtn.on("pointerout", () => this.scanBtn?.setStyle({ color: "#eab308" }));
        }

        runLinearScan(i: number) {
          if (i >= N) { this.busy = false; return; }
          this.highlightLinearStep(i);
          if (VALUES[i] === TARGET_VAL) {
            this.statusText.setText(`FOUND at [${i}] after ${i + 1} checks — LINEAR SCAN: O(n)`).setStyle({ color: "#22c55e" });
            this.onFound(i);
          } else {
            this.statusText.setText(`Scanning [${i}] = ${VALUES[i]}... target=${TARGET_VAL}`).setStyle({ color: "#886600" });
            this.time.delayedCall(260, () => this.runLinearScan(i + 1));
          }
        }

        highlightLinearStep(i: number) {
          const pad = 16, cols = 8;
          const bw = Math.floor((W - pad * 2) / cols);
          const bh = Math.min(Math.floor((H * 0.55) / 2), 68);
          const col = i % cols, row = Math.floor(i / cols);
          const x = pad + col * bw + bw / 2;
          const y = H * 0.28 + row * (bh + 10);
          this.midGlow.clear();
          this.midGlow.lineStyle(2, 0xeab308, 0.6);
          this.midGlow.strokeRoundedRect(x - bw / 2 + 2, y - bh / 2, bw - 4, bh, 4);
        }

        // ── JUMP SEARCH MODE ─────────────────────────────────────────────────
        setupJumpMode() {
          this.jumpPos = JUMP_STEP - 1; // 3
          this.jumpPrev = 0;
          this.jumpPhase = "jumping";
          this.jumpStepIdx = 0;
          this.showJumpUI();
        }

        showJumpUI() {
          this.jumpNextBtn?.destroy(); this.jumpBackBtn?.destroy();
          this.jumpNextBtn = undefined; this.jumpBackBtn = undefined;

          if (this.jumpPhase === "jumping") {
            const pos = Math.min(this.jumpPos, N - 1);
            this.highlightJump(pos);
            this.statusText.setText(`JUMP to [${pos}] = ${VALUES[pos]}  target=${TARGET_VAL}`).setStyle({ color: "#a855f7" });

            if (VALUES[pos] === TARGET_VAL) {
              this.clearToolUI();
              emitToolUsed("Jump Search", "O(√n)");
              this.onFound(pos);
              return;
            }

            if (VALUES[pos] < TARGET_VAL && this.jumpPos + JUMP_STEP < N) {
              this.jumpNextBtn = this.makeJumpBtn(W * 0.5, "JUMP → [" + Math.min(this.jumpPos + JUMP_STEP, N - 1) + "]", "#a855f7");
              this.jumpNextBtn.on("pointerdown", () => {
                if (this.busy || solvedRef.current) return;
                onAttempt(); playSound("click");
                this.jumpPrev = this.jumpPos + 1;
                this.jumpPos = Math.min(this.jumpPos + JUMP_STEP, N - 1);
                this.clearJumpBtns();
                this.showJumpUI();
              });
            } else {
              // overshoot or at end — start stepping back
              this.statusText.setText(`OVERSHOOT at [${pos}] — step back from [${this.jumpPrev}]`).setStyle({ color: "#f97316" });
              this.jumpPhase = "stepping";
              this.jumpStepIdx = this.jumpPrev;
              this.jumpNextBtn = this.makeJumpBtn(W * 0.5, `STEP to [${this.jumpStepIdx}] = ${VALUES[this.jumpStepIdx]}`, "#f97316");
              this.jumpNextBtn.on("pointerdown", () => {
                if (this.busy || solvedRef.current) return;
                onAttempt(); playSound("click");
                this.clearJumpBtns();
                this.doJumpStep();
              });
            }
          }
        }

        doJumpStep() {
          const i = this.jumpStepIdx;
          this.highlightJump(i);
          emitToolUsed("Jump Search", "O(√n)");

          if (VALUES[i] === TARGET_VAL) {
            this.clearToolUI();
            this.onFound(i);
          } else if (VALUES[i] > TARGET_VAL || i >= Math.min(this.jumpPos, N - 1)) {
            this.statusText.setText("NOT FOUND IN RANGE").setStyle({ color: "#ef4444" });
          } else {
            this.jumpStepIdx++;
            const nextI = this.jumpStepIdx;
            this.statusText.setText(`[${i}]=${VALUES[i]} ≠ target. STEP to [${nextI}]`).setStyle({ color: "#f97316" });
            this.jumpNextBtn = this.makeJumpBtn(W * 0.5, `STEP → [${nextI}]`, "#f97316");
            this.jumpNextBtn.on("pointerdown", () => {
              if (this.busy || solvedRef.current) return;
              onAttempt(); playSound("click");
              this.clearJumpBtns();
              this.doJumpStep();
            });
          }
        }

        makeJumpBtn(x: number, label: string, col: string) {
          const btn = this.add.text(x, H - 52, label, {
            fontFamily: "monospace", fontSize: "11px", color: col,
            backgroundColor: "#070408", padding: { x: 14, y: 7 },
          }).setOrigin(0.5, 1).setDepth(5).setInteractive({ cursor: "pointer" });
          btn.on("pointerover", () => btn.setAlpha(0.7));
          btn.on("pointerout", () => btn.setAlpha(1));
          return btn;
        }

        highlightJump(i: number) {
          const pad = 16, cols = 8;
          const bw = Math.floor((W - pad * 2) / cols);
          const bh = Math.min(Math.floor((H * 0.55) / 2), 68);
          const col = i % cols, row = Math.floor(i / cols);
          const x = pad + col * bw + bw / 2;
          const y = H * 0.28 + row * (bh + 10);
          this.midGlow.clear();
          this.midGlow.lineStyle(2, 0xa855f7, 0.7);
          this.midGlow.strokeRoundedRect(x - bw / 2 + 2, y - bh / 2, bw - 4, bh, 4);
          this.midGlow.fillStyle(0xa855f7, 0.06);
          this.midGlow.fillRoundedRect(x - bw / 2 + 2, y - bh / 2, bw - 4, bh, 4);
        }

        clearJumpBtns() {
          this.jumpNextBtn?.destroy(); this.jumpNextBtn = undefined;
          this.jumpBackBtn?.destroy(); this.jumpBackBtn = undefined;
        }

        // ── SHARED ────────────────────────────────────────────────────────────
        onFound(i: number) {
          solvedRef.current = true;
          this.timerEvent?.remove();
          playSound("solve");

          const pad = 16, cols = 8;
          const bw = Math.floor((W - pad * 2) / cols);
          const bh = Math.min(Math.floor((H * 0.55) / 2), 68);
          const block = this.blocks[i];
          const bg = block.list[0] as Phaser.GameObjects.Graphics;
          bg.clear();
          bg.fillStyle(0x001a0a, 1);
          bg.fillRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);
          bg.lineStyle(2, 0x22c55e, 1);
          bg.strokeRoundedRect(-bw / 2 + 2, -bh / 2, bw - 4, bh, 4);
          (block.list[1] as Phaser.GameObjects.Text).setStyle({ color: "#22c55e", fontSize: "14px" });

          this.statusText.setText(`VAULT [${i}] = ${TARGET_VAL} — CRACKED`).setStyle({ color: "#22c55e" });
          emitReaction("BURST", "🎯 CRACKED", block.x, block.y);

          this.tweens.add({
            targets: block, scaleX: 1.15, scaleY: 1.15,
            duration: 180, yoyo: true, repeat: 2,
            onComplete: () => this.time.delayedCall(400, () => onSolve()),
          });
        }

        penalize(seconds: number) {
          this.timeLeft = Math.max(1, this.timeLeft - seconds);
          this.timerText.setText(`${this.timeLeft}s`).setStyle({ color: "#ef4444" });
        }

        flashStatus(msg: string, col: string) {
          this.statusText.setText(msg).setStyle({ color: col });
        }

        dimBlocks(indices: number[], done: () => void) {
          let pending = indices.length;
          if (pending === 0) { done(); return; }
          for (const i of indices) {
            this.tweens.add({
              targets: this.blocks[i], alpha: 0.07, duration: 200,
              onComplete: () => { pending--; if (pending === 0) done(); },
            });
          }
        }

        tick() {
          if (solvedRef.current) return;
          this.timeLeft--;
          const col = this.timeLeft <= 10 ? "#ef4444" : this.timeLeft <= 20 ? "#eab308" : "#22c55e";
          this.timerText.setText(`${this.timeLeft}s`).setStyle({ color: col });

          if (this.timeLeft === 30 && !this.droneWarned30) {
            this.droneWarned30 = true;
            this.spawnDrone();
            playSound("alarm");
            emitReaction("DANGER", "⚠ DRONE PATROL", W / 2, H / 2);
          }
          if (this.timeLeft === 10 && !this.droneWarned10) {
            this.droneWarned10 = true;
            this.spawnDrone();
            playSound("alarm");
            emitReaction("DANGER", "⚠ CRITICAL", W / 2, H / 2);
          }
          if (this.timeLeft <= 0) {
            this.timerEvent?.remove();
            this.clearToolUI();
            this.statusText.setText("TIME EXPIRED — RETRY").setStyle({ color: "#ef4444" });
            this.showRetry();
          }
        }

        spawnDrone() {
          const g = this.add.graphics().setDepth(8);
          g.fillStyle(0xcc0000, 0.9);
          g.fillTriangle(0, -8, -10, 8, 10, 8);
          g.lineStyle(1, 0xff2222, 1);
          g.strokeTriangle(0, -8, -10, 8, 10, 8);
          g.setPosition(-30, 60);
          this.tweens.add({
            targets: g, x: W + 30, duration: 2500,
            onComplete: () => g.destroy(),
          });
          const laser = this.add.graphics().setDepth(7);
          laser.lineStyle(1, 0xff0000, 0.2);
          laser.lineBetween(0, 60, W, 60);
          this.time.delayedCall(2500, () => laser.destroy());
        }

        showRetry() {
          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.75);
          ov.fillRect(0, 0, W, H);
          this.add.text(W / 2, H / 2 - 20, "TIME EXPIRED", {
            fontFamily: "monospace", fontSize: "13px", color: "#ef4444",
          }).setOrigin(0.5).setDepth(21);
          const btn = this.add.text(W / 2, H / 2 + 20, "[ RETRY ]", {
            fontFamily: "monospace", fontSize: "13px", color: "#3b82f6",
            backgroundColor: "#050810", padding: { x: 18, y: 8 },
          }).setOrigin(0.5).setDepth(21).setInteractive({ cursor: "pointer" });
          btn.on("pointerdown", () => { solvedRef.current = false; this.scene.restart(); });
        }
      }

      if (gameRef.current) { gameRef.current.destroy(); gameRef.current = null; }
      const g = new Phaser.Game({
        type: Phaser.AUTO, width: W, height: H,
        parent: containerRef.current!, backgroundColor: "#040810",
        scene: VaultScene, render: { antialias: true },
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

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
