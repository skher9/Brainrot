"use client";
// LC #410 — GRID ZERO: find minimum truck capacity via binary search on answer space
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N = 8;
const K = 3;
const TRUCK_COLORS = [0x3b82f6, 0xf97316, 0xa855f7];
const TIMER_TOTAL = 90;

function generateDistricts(): number[] {
  let arr: number[];
  do {
    arr = Array.from({ length: N }, () => 3 + Math.floor(Math.random() * 13));
  } while (Math.max(...arr) > arr.reduce((a, b) => a + b, 0) * 0.6);
  return arr;
}

function canLoad(districts: number[], cap: number, k: number): boolean {
  let trucks = 1, cur = 0;
  for (const d of districts) {
    if (d > cap) return false;
    if (cur + d > cap) { if (++trucks > k) return false; cur = d; }
    else cur += d;
  }
  return true;
}

function optimalCap(districts: number[], k: number): number {
  let lo = Math.max(...districts), hi = districts.reduce((a, b) => a + b, 0);
  while (lo < hi) { const mid = (lo + hi) >> 1; if (canLoad(districts, mid, k)) hi = mid; else lo = mid + 1; }
  return lo;
}

function trucksNeeded(districts: number[], cap: number): { count: number; overflowAt: number } {
  let trucks = 1, cur = 0, overflowAt = -1;
  for (let i = 0; i < N; i++) {
    const d = districts[i];
    if (cur + d > cap) {
      trucks++;
      cur = d;
      if (trucks > K && overflowAt === -1) overflowAt = i;
    } else {
      cur += d;
    }
  }
  return { count: trucks, overflowAt };
}

export default function GridZero({ onSolve, onAttempt }: GameProps) {
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
      const H = containerRef.current.clientHeight || 480;

      const DISTRICTS = generateDistricts();
      const OPTIMAL = optimalCap(DISTRICTS, K);
      const SUM = DISTRICTS.reduce((a, b) => a + b, 0);
      const MAX_D = Math.max(...DISTRICTS);

      const BOX_W = Math.min(60, Math.floor((W * 0.72) / N));
      const BOX_H = 76;
      const dStartX = Math.floor(W / 2 - (N * BOX_W) / 2);
      const dY = Math.floor(H * 0.28);
      const NL_Y = dY + BOX_H + 54;
      const CTRL_Y = H - 72;

      class GridZeroScene extends Phaser.Scene {
        private capacity = Math.round((MAX_D + SUM) / 2);
        private attempts = 0;
        private timeLeft = TIMER_TOTAL;
        private phase: "idle" | "deploying" | "feedback" | "win" | "over" = "idle";
        private guesses: { cap: number; feasible: boolean }[] = [];
        private timerEvent!: Phaser.Time.TimerEvent;

        private districtOverlays: Phaser.GameObjects.Graphics[] = [];
        private capTxt!: Phaser.GameObjects.Text;
        private timerTxt!: Phaser.GameObjects.Text;
        private attemptTxt!: Phaser.GameObjects.Text;
        private deployBtn!: Phaser.GameObjects.Text;
        private nlGfx!: Phaser.GameObjects.Graphics;
        private nlLabels: Phaser.GameObjects.Text[] = [];
        private nlVisible = false;
        private feedbackObjs: Phaser.GameObjects.GameObject[] = [];

        constructor() { super({ key: "GridZeroScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#06060f");
          this.drawBg();
          this.buildDistricts();
          this.buildControls();
          this.buildHeader();
          this.nlGfx = this.add.graphics().setDepth(5).setAlpha(0);
          this.startTimer();
        }

        drawBg() {
          const g = this.add.graphics().setDepth(0);
          g.lineStyle(1, 0x0a0a1a, 1);
          for (let x = 0; x < W; x += 36) g.lineBetween(x, 0, x, H);
          for (let y = 0; y < H; y += 36) g.lineBetween(0, y, W, y);
          // city silhouette hint
          const city = this.add.graphics().setDepth(0);
          city.fillStyle(0x080810, 1);
          const buildings = [30, 50, 40, 65, 45, 38, 55, 48, 36, 60, 42];
          buildings.forEach((bh, i) => {
            city.fillRect(i * (W / buildings.length), H - bh, W / buildings.length - 4, bh);
          });
        }

        buildDistricts() {
          const bp = this.add.graphics().setDepth(1);
          bp.fillStyle(0x0b0b1e, 1);
          bp.fillRect(dStartX - 8, dY - 28, N * BOX_W + 16, BOX_H + 44);
          bp.lineStyle(1, 0x1e1e40, 1);
          bp.strokeRect(dStartX - 8, dY - 28, N * BOX_W + 16, BOX_H + 44);

          this.add.text(W / 2, dY - 15, "CITY DISTRICTS — ASSIGN 3 TRUCKS TO CONSECUTIVE ZONES", {
            fontFamily: "monospace", fontSize: "8px", color: "#1a1a40", letterSpacing: 1,
          }).setOrigin(0.5).setDepth(2);

          for (let i = 0; i < N; i++) {
            const rx = dStartX + i * BOX_W;
            const box = this.add.graphics().setDepth(2);
            box.fillStyle(0x0d0d22, 1);
            box.fillRect(rx, dY, BOX_W, BOX_H);
            box.lineStyle(1, 0x1a1a40, 1);
            box.strokeRect(rx, dY, BOX_W, BOX_H);

            this.add.text(rx + BOX_W / 2, dY + BOX_H / 2 + 2, String(DISTRICTS[i]), {
              fontFamily: "monospace", fontSize: "20px", color: "#b0b0d8", fontStyle: "bold",
            }).setOrigin(0.5).setDepth(4);
            this.add.text(rx + BOX_W / 2, dY + BOX_H + 12, `D${i + 1}`, {
              fontFamily: "monospace", fontSize: "8px", color: "#22224a",
            }).setOrigin(0.5).setDepth(3);

            this.districtOverlays.push(this.add.graphics().setDepth(3));
          }
        }

        buildControls() {
          this.add.text(W / 2, CTRL_Y - 46, "MAX LOAD PER TRUCK", {
            fontFamily: "monospace", fontSize: "9px", color: "#1e1e44", letterSpacing: 3,
          }).setOrigin(0.5).setDepth(8);

          this.capTxt = this.add.text(W / 2, CTRL_Y - 20, `${this.capacity} MW`, {
            fontFamily: "monospace", fontSize: "26px", color: "#c8c8f0", fontStyle: "bold",
          }).setOrigin(0.5).setDepth(8);

          const mkBtn = (x: number, lbl: string, delta: number, col: string) => {
            const b = this.add.text(x, CTRL_Y - 20, lbl, {
              fontFamily: "monospace", fontSize: "13px", color: col,
              backgroundColor: "#0c0c20", padding: { x: 9, y: 6 },
            }).setOrigin(0.5).setDepth(8).setInteractive({ cursor: "pointer" });
            b.on("pointerdown", () => this.adjustCap(delta));
            b.on("pointerover", () => b.setAlpha(0.7));
            b.on("pointerout", () => b.setAlpha(1));
            return b;
          };

          mkBtn(W / 2 - 170, "−10", -10, "#555577");
          mkBtn(W / 2 - 118, "−1",  -1,  "#8888aa");
          mkBtn(W / 2 + 118, "+1",   1,  "#8888aa");
          mkBtn(W / 2 + 170, "+10", 10, "#555577");

          this.deployBtn = this.add.text(W / 2, CTRL_Y + 26, "   ▶  DEPLOY   ", {
            fontFamily: "monospace", fontSize: "14px", color: "#c8c8f0",
            backgroundColor: "#16163a", padding: { x: 22, y: 10 },
          }).setOrigin(0.5).setDepth(8).setInteractive({ cursor: "pointer" });
          this.deployBtn.on("pointerover", () => this.deployBtn.setStyle({ backgroundColor: "#22224e" }));
          this.deployBtn.on("pointerout", () => this.deployBtn.setStyle({ backgroundColor: "#16163a" }));
          this.deployBtn.on("pointerdown", () => { if (this.phase === "idle") this.doDeploy(); });
        }

        buildHeader() {
          const hg = this.add.graphics().setDepth(7);
          hg.fillStyle(0x000000, 0.55);
          hg.fillRect(0, 0, W, 34);

          this.add.text(14, 17, `SEARCH SPACE  [${MAX_D} … ${SUM}]`, {
            fontFamily: "monospace", fontSize: "9px", color: "#1e1e44",
          }).setOrigin(0, 0.5).setDepth(8);

          this.add.text(W / 2 - 88, 17, "STORM IN", {
            fontFamily: "monospace", fontSize: "9px", color: "#3a3a5a",
          }).setOrigin(0, 0.5).setDepth(8);

          this.timerTxt = this.add.text(W / 2 + 2, 17, `${TIMER_TOTAL}s`, {
            fontFamily: "monospace", fontSize: "16px", color: "#ef4444", fontStyle: "bold",
          }).setOrigin(0, 0.5).setDepth(8);

          this.attemptTxt = this.add.text(W - 14, 17, "0 attempts", {
            fontFamily: "monospace", fontSize: "9px", color: "#2a2a4a",
          }).setOrigin(1, 0.5).setDepth(8);
        }

        startTimer() {
          this.timerEvent = this.time.addEvent({
            delay: 1000, loop: true, callback: () => {
              if (this.phase === "win" || this.phase === "over" || solvedRef.current) return;
              this.timeLeft = Math.max(0, this.timeLeft - 1);
              const col = this.timeLeft <= 20 ? "#ef4444" : this.timeLeft <= 40 ? "#f97316" : "#6b7280";
              this.timerTxt.setText(`${this.timeLeft}s`).setStyle({ color: col, fontSize: "16px", fontStyle: "bold" });
              if (this.timeLeft <= 10) {
                this.cameras.main.flash(100, 80, 10, 10);
              }
              if (this.timeLeft === 0) this.gameOver();
            },
          });
        }

        adjustCap(delta: number) {
          if (this.phase !== "idle") return;
          this.capacity = Math.max(MAX_D, Math.min(SUM, this.capacity + delta));
          this.capTxt.setText(`${this.capacity} MW`);
        }

        doDeploy() {
          if (this.phase !== "idle" || solvedRef.current) return;
          this.phase = "deploying";
          this.attempts++;
          onAttempt();
          this.attemptTxt.setText(`${this.attempts} attempt${this.attempts !== 1 ? "s" : ""}`);

          this.districtOverlays.forEach(o => o.clear());

          const { count: trucksReq, overflowAt } = trucksNeeded(DISTRICTS, this.capacity);
          const feasible = trucksReq <= K;
          this.guesses.push({ cap: this.capacity, feasible });

          if (this.attempts >= 3 && !this.nlVisible) {
            this.nlVisible = true;
            this.tweens.add({ targets: this.nlGfx, alpha: 1, duration: 700, delay: 200 });
            this.add.text(W / 2, NL_Y + 30, "ANSWER SPACE — green = works, red = overload", {
              fontFamily: "monospace", fontSize: "8px", color: "#1a1a40",
            }).setOrigin(0.5).setDepth(4).setAlpha(0).setName("nl_hint");
            const hint = this.children.getByName("nl_hint") as Phaser.GameObjects.Text;
            if (hint) this.tweens.add({ targets: hint, alpha: 1, duration: 500, delay: 400 });
          }
          if (this.nlVisible) this.refreshNl();

          // Animate greedy truck deployment
          let truck = 0, cur = 0;
          const assignments: number[] = new Array(N).fill(0);
          let localTruck = 0, localCur = 0;
          for (let i = 0; i < N; i++) {
            const d = DISTRICTS[i];
            if (localCur + d > this.capacity) { localTruck++; localCur = d; }
            else localCur += d;
            assignments[i] = Math.min(localTruck, K - 1);
          }

          let idx = 0;
          const step = () => {
            if (idx >= N) {
              this.time.delayedCall(350, () => feasible ? this.onStable(trucksReq) : this.onBlackout(trucksReq, overflowAt));
              return;
            }
            const g = this.districtOverlays[idx];
            g.clear();
            const overloaded = !feasible && idx >= overflowAt && overflowAt >= 0;
            g.fillStyle(overloaded ? 0xff2222 : TRUCK_COLORS[assignments[idx]], overloaded ? 0.55 : 0.42);
            g.fillRect(dStartX + idx * BOX_W, dY, BOX_W, BOX_H);
            idx++;
            this.time.delayedCall(160, step);
          };
          step();
        }

        onStable(trucksUsed: number) {
          this.clearFeedback();
          if (this.capacity === OPTIMAL) { this.onWin(); return; }

          playSound("correct");
          emitReaction("SLIDE_LEFT", `${this.capacity}MW ✓`, W / 2, dY + BOX_H / 2);

          // Suggest binary search midpoint
          const maxFail = this.guesses.filter(g => !g.feasible).reduce((m, g) => Math.max(m, g.cap), MAX_D - 1);
          const suggest = Math.floor((maxFail + this.capacity) / 2);

          const ov = this.add.graphics().setDepth(14);
          ov.fillStyle(0x001a00, 0.82);
          ov.fillRect(0, H * 0.58, W, H * 0.26);
          this.feedbackObjs.push(ov);

          const f = (txt: string, y: number, col: string, size: string) => {
            const t = this.add.text(W / 2, y, txt, {
              fontFamily: "monospace", fontSize: size, color: col,
            }).setOrigin(0.5).setDepth(15).setAlpha(0);
            this.feedbackObjs.push(t);
            this.tweens.add({ targets: t, alpha: 1, duration: 300, delay: 80 });
          };

          f("GRID STABLE ✓", H * 0.65, "#22c55e", "17px");
          f(`${this.capacity} MW works — but can you go lower?`, H * 0.73, "#475569", "11px");
          if (suggest >= MAX_D && suggest < this.capacity - 1) {
            f(`Try: ${suggest} MW`, H * 0.79, "#3b82f6", "11px");
          }

          this.time.delayedCall(2600, () => { this.clearFeedback(); this.phase = "idle"; });
        }

        onBlackout(trucksNeeded_: number, overflowAt: number) {
          this.clearFeedback();
          playSound("wrong");
          emitReaction("DANGER", "OVERLOAD", W / 2, dY + BOX_H / 2);

          // Suggest binary search midpoint
          const minWork = this.guesses.filter(g => g.feasible).reduce((m, g) => Math.min(m, g.cap), SUM + 1);
          const suggest = minWork <= SUM ? Math.floor((this.capacity + minWork) / 2) : Math.floor((this.capacity + SUM) / 2);

          // Blackout: darken screen progressively
          const ov = this.add.graphics().setDepth(14);
          ov.fillStyle(0x000000, 0.88);
          ov.fillRect(0, 0, W, H);
          this.feedbackObjs.push(ov);

          // Red emergency glow — power is out
          const glow = this.add.graphics().setDepth(15).setAlpha(0);
          glow.fillStyle(0xcc0000, 0.06);
          glow.fillCircle(W * 0.15, H + 10, 240);
          glow.fillCircle(W * 0.85, H + 10, 240);
          this.tweens.add({ targets: glow, alpha: 1, duration: 350, delay: 200 });
          this.feedbackObjs.push(glow);

          const f = (txt: string, y: number, col: string, size: string) => {
            const t = this.add.text(W / 2, y, txt, {
              fontFamily: "monospace", fontSize: size, color: col,
            }).setOrigin(0.5).setDepth(16).setAlpha(0);
            this.feedbackObjs.push(t);
            this.tweens.add({ targets: t, alpha: 1, duration: 350, delay: 300 });
          };

          f("⚡  GRID FAILURE", H / 2 - 44, "#dc2626", "22px");
          f(`${this.capacity} MW — needed ${trucksNeeded_} trucks, have ${K}`, H / 2 - 12, "#7f1d1d", "11px");
          f("Minimum capacity must be HIGHER", H / 2 + 10, "#3a3a3a", "11px");
          if (suggest <= SUM) {
            f(`Try: ${suggest} MW`, H / 2 + 30, "#1d4ed8", "11px");
          }

          this.time.delayedCall(2400, () => {
            this.clearFeedback();
            this.districtOverlays.forEach(o => o.clear());
            this.phase = "idle";
          });
        }

        onWin() {
          if (solvedRef.current) return;
          solvedRef.current = true;
          this.phase = "win";
          this.timerEvent.remove(false);
          playSound("solve");
          emitReaction("BURST", `${OPTIMAL} MW`, W / 2, dY + BOX_H / 2);
          this.clearFeedback();

          // Victory pulse on districts
          this.cameras.main.flash(400, 0, 40, 0);

          this.time.delayedCall(700, () => {
            const ov = this.add.graphics().setDepth(20);
            ov.fillStyle(0x000000, 0.92);
            ov.fillRect(0, 0, W, H);

            const cy = H / 2 - 90;
            this.add.text(W / 2, cy, "MINIMUM LOAD FOUND", {
              fontFamily: "monospace", fontSize: "18px", color: "#22c55e", fontStyle: "bold", letterSpacing: 3,
            }).setOrigin(0.5).setDepth(21);
            this.add.text(W / 2, cy + 34, `${OPTIMAL} MW`, {
              fontFamily: "monospace", fontSize: "42px", color: "#fbbf24", fontStyle: "bold",
            }).setOrigin(0.5).setDepth(21);
            this.add.text(W / 2, cy + 76, "per truck — optimal assignment", {
              fontFamily: "monospace", fontSize: "11px", color: "#374151",
            }).setOrigin(0.5).setDepth(21);

            const optGuesses = Math.ceil(Math.log2(Math.max(2, SUM - MAX_D + 1)));
            const rows = [
              ["Your attempts:", `${this.attempts}`],
              [`Binary search limit:`, `≤${optGuesses} guesses`],
              [`Search space:`, `[${MAX_D} … ${SUM}]`],
              [`Time left:`, `${this.timeLeft}s`],
            ];
            rows.forEach(([k, v], i) => {
              this.add.text(W / 2 - 120, cy + 98 + i * 22, k, {
                fontFamily: "monospace", fontSize: "10px", color: "#2a2a4a",
              }).setDepth(21);
              this.add.text(W / 2 + 120, cy + 98 + i * 22, v, {
                fontFamily: "monospace", fontSize: "10px", color: "#9ca3af",
              }).setOrigin(1, 0).setDepth(21);
            });

            this.add.text(W / 2, cy + 192, `[${DISTRICTS.join(", ")}]  K=${K}`, {
              fontFamily: "monospace", fontSize: "9px", color: "#1a1a2e",
            }).setOrigin(0.5).setDepth(21);

            const btn = this.add.text(W / 2, cy + 216, "[ DEBRIEF → ]", {
              fontFamily: "monospace", fontSize: "13px", color: "#a855f7",
              backgroundColor: "#0d001a", padding: { x: 18, y: 9 },
            }).setOrigin(0.5).setDepth(22).setInteractive({ cursor: "pointer" });
            btn.on("pointerover", () => btn.setAlpha(0.75));
            btn.on("pointerout", () => btn.setAlpha(1));
            btn.on("pointerdown", () => onSolve());
          });
        }

        gameOver() {
          if (solvedRef.current) return;
          this.timerEvent.remove(false);
          this.phase = "over";
          this.clearFeedback();

          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.93);
          ov.fillRect(0, 0, W, H);

          this.add.text(W / 2, H / 2 - 44, "STORM HIT", {
            fontFamily: "monospace", fontSize: "22px", color: "#ef4444", fontStyle: "bold",
          }).setOrigin(0.5).setDepth(21);
          this.add.text(W / 2, H / 2 - 14, "GRID COLLAPSED", {
            fontFamily: "monospace", fontSize: "13px", color: "#7f1d1d",
          }).setOrigin(0.5).setDepth(21);
          this.add.text(W / 2, H / 2 + 12, `Optimal capacity was ${OPTIMAL} MW`, {
            fontFamily: "monospace", fontSize: "11px", color: "#374151",
          }).setOrigin(0.5).setDepth(21);
          this.add.text(W / 2, H / 2 + 30, `Binary search finds it in ≤${Math.ceil(Math.log2(Math.max(2, SUM - MAX_D + 1)))} guesses`, {
            fontFamily: "monospace", fontSize: "10px", color: "#2a2a4a",
          }).setOrigin(0.5).setDepth(21);

          const btn = this.add.text(W / 2, H / 2 + 60, "[ TRY AGAIN ]", {
            fontFamily: "monospace", fontSize: "12px", color: "#555577",
            backgroundColor: "#0d0d1a", padding: { x: 14, y: 8 },
          }).setOrigin(0.5).setDepth(22).setInteractive({ cursor: "pointer" });
          btn.on("pointerdown", () => { solvedRef.current = false; this.scene.restart(); });
        }

        refreshNl() {
          this.nlGfx.clear();
          this.nlLabels.forEach(t => t.destroy());
          this.nlLabels = [];

          const nlX = dStartX - 8;
          const nlW = N * BOX_W + 16;
          const range = SUM - MAX_D;
          if (range <= 0) return;

          const toX = (v: number) => nlX + ((v - MAX_D) / range) * nlW;

          const fails = this.guesses.filter(g => !g.feasible).map(g => g.cap);
          const works = this.guesses.filter(g => g.feasible).map(g => g.cap);
          const maxFail = fails.length ? Math.max(...fails) : -1;
          const minWork = works.length ? Math.min(...works) : -1;

          this.nlGfx.lineStyle(2, 0x1e1e40, 1);
          this.nlGfx.lineBetween(nlX, NL_Y, nlX + nlW, NL_Y);

          if (maxFail >= MAX_D) {
            this.nlGfx.fillStyle(0xef4444, 0.14);
            this.nlGfx.fillRect(nlX, NL_Y - 7, Math.max(0, toX(maxFail) - nlX + 5), 14);
          }
          if (minWork <= SUM) {
            this.nlGfx.fillStyle(0x22c55e, 0.14);
            this.nlGfx.fillRect(toX(minWork) - 5, NL_Y - 7, nlX + nlW - toX(minWork) + 5, 14);
          }

          for (const g of this.guesses) {
            this.nlGfx.fillStyle(g.feasible ? 0x22c55e : 0xef4444, 1);
            this.nlGfx.fillCircle(toX(g.cap), NL_Y, 5);
            const lbl = this.add.text(toX(g.cap), NL_Y - 14, String(g.cap), {
              fontFamily: "monospace", fontSize: "8px", color: g.feasible ? "#22c55e" : "#ef4444",
            }).setOrigin(0.5, 1).setDepth(6);
            this.nlLabels.push(lbl);
          }

          // Bounds
          const minLbl = this.add.text(toX(MAX_D), NL_Y + 10, String(MAX_D), {
            fontFamily: "monospace", fontSize: "7px", color: "#2a2a4a",
          }).setOrigin(0.5, 0).setDepth(6);
          const maxLbl = this.add.text(toX(SUM), NL_Y + 10, String(SUM), {
            fontFamily: "monospace", fontSize: "7px", color: "#2a2a4a",
          }).setOrigin(0.5, 0).setDepth(6);
          this.nlLabels.push(minLbl, maxLbl);
        }

        clearFeedback() {
          this.feedbackObjs.forEach(o => { if (o?.active) o.destroy(); });
          this.feedbackObjs = [];
        }
      }

      if (gameRef.current) { gameRef.current.destroy(); gameRef.current = null; }
      const game = new Phaser.Game({
        type: Phaser.AUTO, width: W, height: H,
        parent: containerRef.current!, backgroundColor: "#06060f",
        scene: GridZeroScene, render: { antialias: false },
      });
      gameRef.current = { destroy: () => game.destroy(true) };
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
