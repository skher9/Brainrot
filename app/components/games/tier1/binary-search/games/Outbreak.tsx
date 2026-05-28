"use client";
// LC #278 — First Bad Version. 3 tool modes: Binary Search / Linear Scan / Random Sample.
// Linear Scan uses 2.5s/test → 50s total for N=20 > 45s ooze timer: forces failure.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N = 20;

function emitToolUsed(tool: string, complexity: string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("bs-tool-used", { detail: { tool, complexity } }));
}

function randFirstInfected() { return 3 + Math.floor(Math.random() * 14); }

export default function Outbreak({ onSolve, onAttempt }: GameProps) {
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
      const FIRST_INFECTED = randFirstInfected();
      const OOZE_SECONDS = 45;
      const COST_PER_SCAN = 2.5;

      class OutbreakScene extends Phaser.Scene {
        private chambers: Phaser.GameObjects.Container[] = [];
        private revealed: Map<number, boolean> = new Map();
        private left = 0;
        private right = N - 1;
        private toolMode = "Binary Search";
        private busy = false;
        private oozeRemaining = OOZE_SECONDS;
        private oozeGraphic!: Phaser.GameObjects.Graphics;
        private oozeTimer?: Phaser.Time.TimerEvent;
        private statusText!: Phaser.GameObjects.Text;
        private rangeText!: Phaser.GameObjects.Text;
        private oozeBar!: Phaser.GameObjects.Graphics;
        private toolSelectHandler!: (e: Event) => void;

        constructor() { super({ key: "OutbreakScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#050409");
          this.drawBg();
          this.buildChambers();
          this.buildHUD();
          this.startOozeTimer();

          this.toolSelectHandler = (e: Event) => {
            this.toolMode = (e as CustomEvent).detail.tool as string;
          };
          window.addEventListener("bs-tool-select", this.toolSelectHandler);
          this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener("bs-tool-select", this.toolSelectHandler);
          });

          this.input.on("pointerdown", this.onClick, this);
        }

        drawBg() {
          const g = this.add.graphics();
          g.lineStyle(1, 0x080210, 1);
          for (let x = 0; x < W; x += 50) g.lineBetween(x, 0, x, H);
          for (let y = 0; y < H; y += 50) g.lineBetween(0, y, W, y);
        }

        buildChambers() {
          const pad = 14;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.9, 78);
          const baseY = H * 0.48;

          for (let i = 0; i < N; i++) {
            const x = pad + i * bw + bw / 2;
            const c = this.add.container(x, baseY);
            const bg = this.add.graphics();
            bg.fillStyle(0x0c0c18, 1);
            bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            bg.lineStyle(1, 0x1a1a40, 1);
            bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            const num = this.add.text(0, 4, String(i), {
              fontFamily: "monospace", fontSize: "8px", color: "#1a1a3a",
            }).setOrigin(0.5);
            const icon = this.add.text(0, -10, "?", {
              fontFamily: "monospace", fontSize: "13px", color: "#1a1a3a",
            }).setOrigin(0.5).setName("icon");
            c.add([bg, num, icon]);
            c.setSize(bw - 2, bh);
            c.setInteractive({ cursor: "pointer" });
            c.setData("index", i);
            this.chambers.push(c);
          }
        }

        buildHUD() {
          const bar = this.add.graphics();
          bar.fillStyle(0x020204, 1);
          bar.fillRect(0, 0, W, 44);
          bar.lineStyle(1, 0x140a28, 1);
          bar.lineBetween(0, 44, W, 44);
          this.add.text(16, 12, "// OUTBREAK", {
            fontFamily: "monospace", fontSize: "10px", color: "#1a0830",
          });
          this.add.text(W / 2, 12, "FIND FIRST INFECTED CHAMBER", {
            fontFamily: "monospace", fontSize: "10px", color: "#3a0a60",
          }).setOrigin(0.5, 0);

          // Ooze timer bar
          this.oozeBar = this.add.graphics().setDepth(2);
          this.oozeGraphic = this.add.graphics().setDepth(5);
          this.statusText = this.add.text(W / 2, H - 36, "CLICK A CHAMBER TO TEST IT", {
            fontFamily: "monospace", fontSize: "10px", color: "#2a1050",
          }).setOrigin(0.5);
          this.rangeText = this.add.text(W / 2, H - 20, `[0, ${N - 1}]`, {
            fontFamily: "monospace", fontSize: "9px", color: "#1a0830",
          }).setOrigin(0.5);
        }

        startOozeTimer() {
          this.drawOoze();
          this.oozeTimer = this.time.addEvent({
            delay: 100, loop: true,
            callback: () => {
              if (solvedRef.current) return;
              this.oozeRemaining -= 0.1;
              this.drawOoze();
              if (this.oozeRemaining <= 0) {
                this.oozeTimer?.remove();
                this.statusText.setText("OOZE REACHED YOU — RETRY").setStyle({ color: "#cc0066" });
                playSound("alarm");
                this.showRetry();
              }
            },
          });
        }

        drawOoze() {
          const pct = Math.max(0, this.oozeRemaining / OOZE_SECONDS);
          const oozeLeft = W * pct;

          // progress bar at top
          this.oozeBar.clear();
          this.oozeBar.fillStyle(0x660033, 0.4);
          this.oozeBar.fillRect(oozeLeft, 44, W - oozeLeft, 3);

          // ooze overlay from right
          this.oozeGraphic.clear();
          for (let i = 0; i < 6; i++) {
            this.oozeGraphic.fillStyle(0x660033, 0.04 + i * 0.03);
            this.oozeGraphic.fillRect(oozeLeft + i * 4, 47, W - oozeLeft - i * 4, H - 47);
          }

          // color shift warning when close
          if (pct < 0.3) {
            this.rangeText.setStyle({ color: "#660033" });
          }
        }

        costOoze() {
          this.oozeRemaining = Math.max(0.1, this.oozeRemaining - COST_PER_SCAN);
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;

          const pad = 14;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.9, 78);
          const baseY = H * 0.48;

          let clicked = -1;
          for (let i = 0; i < N; i++) {
            if (this.revealed.has(i)) continue;
            const cx = pad + i * bw + bw / 2;
            if (Math.abs(pointer.x - cx) < bw / 2 && Math.abs(pointer.y - baseY) < bh / 2 + 6) {
              clicked = i;
              break;
            }
          }
          if (clicked < 0) return;

          // Tool-specific behavior
          if (this.toolMode === "Random Sample") {
            // Random: pick a random unrevealed chamber instead
            const unrevealed = Array.from({ length: N }, (_, i) => i).filter(i => !this.revealed.has(i));
            if (unrevealed.length === 0) return;
            clicked = unrevealed[Math.floor(Math.random() * unrevealed.length)];
            emitReaction("INSIGHT", "⚂ RANDOM", pointer.x, pointer.y);
          }

          this.busy = true;
          onAttempt();
          this.costOoze();
          playSound("click");

          const toolComplexity = this.toolMode === "Binary Search" ? "O(log n)" : this.toolMode === "Linear Scan" ? "O(n)" : "O(?)";
          emitToolUsed(this.toolMode, toolComplexity);

          const isInfected = clicked >= FIRST_INFECTED;
          this.revealed.set(clicked, isInfected);
          this.revealChamber(clicked, isInfected, () => {
            if (this.toolMode === "Linear Scan") {
              // Linear scan behavior: always go right from clicked
              // This eventually finds it but uses all ooze time
              if (!isInfected) {
                this.left = clicked + 1;
              } else {
                this.right = clicked;
              }
            } else if (this.toolMode === "Binary Search") {
              if (isInfected) this.right = clicked;
              else this.left = clicked + 1;
            } else {
              // random — still binary search logic but random midpoint
              if (isInfected) this.right = clicked;
              else this.left = clicked + 1;
            }

            this.rangeText.setText(`[${this.left}, ${this.right}]`);

            if (this.left === this.right) {
              this.onFound(this.left);
            } else {
              const hint = isInfected
                ? `INFECTED — narrow left [${this.left}..${this.right}]`
                : `CLEAN — narrow right [${this.left}..${this.right}]`;
              this.statusText.setText(hint).setStyle({ color: isInfected ? "#660033" : "#1a5030" });
              emitReaction(isInfected ? "DANGER" : "SLIDE_RIGHT", isInfected ? "☣ INFECTED" : "✓ CLEAN", pointer.x, pointer.y);
              playSound(isInfected ? "danger" : "correct");
              this.busy = false;
            }
          });
        }

        revealChamber(i: number, infected: boolean, done: () => void) {
          const pad = 14;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.9, 78);
          const c = this.chambers[i];
          const bg = c.list[0] as Phaser.GameObjects.Graphics;
          bg.clear();
          if (infected) {
            bg.fillStyle(0x330011, 1);
            bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            bg.lineStyle(1, 0xcc0033, 1);
            bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            (c.getByName("icon") as Phaser.GameObjects.Text).setText("☣").setStyle({ color: "#cc0033" });
          } else {
            bg.fillStyle(0x001a0a, 1);
            bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            bg.lineStyle(1, 0x22c55e, 0.5);
            bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            (c.getByName("icon") as Phaser.GameObjects.Text).setText("✓").setStyle({ color: "#22c55e" });
          }
          this.tweens.add({
            targets: c, scaleX: 1.08, scaleY: 1.08, duration: 80, yoyo: true,
            onComplete: () => this.time.delayedCall(150, done),
          });
        }

        onFound(idx: number) {
          solvedRef.current = true;
          this.oozeTimer?.remove();
          playSound("solve");
          const pad = 14;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.9, 78);
          const c = this.chambers[idx];
          const bg = c.list[0] as Phaser.GameObjects.Graphics;
          bg.clear();
          bg.fillStyle(0x440011, 1);
          bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
          bg.lineStyle(2, 0xff0044, 1);
          bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
          (c.getByName("icon") as Phaser.GameObjects.Text).setText("☣").setStyle({ color: "#ff0044", fontSize: "15px" });
          this.statusText.setText(`PATIENT ZERO: CHAMBER [${idx}] — ISOLATED`).setStyle({ color: "#ff4488" });
          emitReaction("BURST", "☣ CONTAINED", c.x, c.y);
          this.tweens.add({
            targets: c, scaleX: 1.2, scaleY: 1.2, duration: 250, yoyo: true,
            onComplete: () => this.time.delayedCall(500, () => onSolve()),
          });
        }

        showRetry() {
          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.75);
          ov.fillRect(0, 0, W, H);
          this.add.text(W / 2, H / 2 - 20, "CONTAINMENT FAILED", {
            fontFamily: "monospace", fontSize: "12px", color: "#cc0033",
          }).setOrigin(0.5).setDepth(21);
          this.add.text(W / 2, H / 2 + 4, "LINEAR SCAN took too long — use Binary Search next time", {
            fontFamily: "monospace", fontSize: "9px", color: "#660022",
          }).setOrigin(0.5).setDepth(21);
          const btn = this.add.text(W / 2, H / 2 + 28, "[ RETRY ]", {
            fontFamily: "monospace", fontSize: "12px", color: "#a855f7",
            backgroundColor: "#050409", padding: { x: 16, y: 7 },
          }).setOrigin(0.5).setDepth(21).setInteractive({ cursor: "pointer" });
          btn.on("pointerdown", () => { solvedRef.current = false; this.scene.restart(); });
        }
      }

      if (gameRef.current) { gameRef.current.destroy(); gameRef.current = null; }
      const g = new Phaser.Game({
        type: Phaser.AUTO, width: W, height: H,
        parent: containerRef.current!, backgroundColor: "#050409",
        scene: OutbreakScene, render: { antialias: true },
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
