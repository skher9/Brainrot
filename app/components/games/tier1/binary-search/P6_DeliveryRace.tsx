"use client";
import { useEffect, useRef, useCallback } from "react";
import type { GameProps } from "./types";

// Delivery piles: how many km each delivery takes
const PILES = [3, 6, 7, 11];
const HOURS = 8; // must deliver all within HOURS hours
// Minimum speed: ceil(11/1)=11 but need total <= 8 → min speed where sum(ceil(p/s)) <= H
function minSpeed(): number {
  for (let s = 1; s <= 15; s++) {
    const hours = PILES.reduce((acc, p) => acc + Math.ceil(p / s), 0);
    if (hours <= HOURS) return s;
  }
  return 15;
}
const ANSWER = minSpeed();

export default function P6_DeliveryRace({ onSolve, onAttempt }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const solvedRef = useRef(false);

  const destroy = useCallback(() => {
    if (gameRef.current) {
      (gameRef.current as { destroy: (r: boolean) => void }).destroy(true);
      gameRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !containerRef.current) return;

      const W = containerRef.current.clientWidth || 800;
      const H = containerRef.current.clientHeight || 500;

      class DeliveryScene extends Phaser.Scene {
        private left = 1;
        private right = 15;
        private mid = -1;
        private bars: Phaser.GameObjects.Container[] = [];
        private busy = false;
        private msgText?: Phaser.GameObjects.Text;
        private pilesText?: Phaser.GameObjects.Text;

        constructor() { super({ key: "DeliveryScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#0a0a0a");

          this.pilesText = this.add.text(W / 2, 28, `deliveries: [${PILES.join(", ")}] km  |  ${HOURS}h deadline`, {
            fontFamily: "monospace", fontSize: 11, color: "#475569",
          }).setOrigin(0.5);

          this.buildSpeedBars();

          this.msgText = this.add.text(W / 2, H - 28, "select a speed", {
            fontFamily: "monospace", fontSize: 11, color: "#374151",
          }).setOrigin(0.5, 1);

          this.input.on("pointerdown", this.onClick, this);
        }

        buildSpeedBars() {
          const speeds = 15;
          const barW = Math.floor((W - 60) / speeds);
          const barMaxH = 120;
          const baseY = H / 2 + 40;

          for (let s = 1; s <= speeds; s++) {
            const hours = PILES.reduce((acc, p) => acc + Math.ceil(p / s), 0);
            const barH = Math.max(10, Math.floor((hours / 20) * barMaxH));
            const x = 30 + (s - 1) * barW + barW / 2;

            const c = this.add.container(x, baseY);

            const bar = this.add.graphics();
            bar.fillStyle(0x1a1a2e, 1);
            bar.fillRect(-barW / 2 + 1, -barH, barW - 2, barH);
            bar.lineStyle(1, 0x1e1e1e, 1);
            bar.strokeRect(-barW / 2 + 1, -barH, barW - 2, barH);

            const lbl = this.add.text(0, 8, `s${s}`, {
              fontFamily: "monospace", fontSize: "9px", color: "#374151",
            }).setOrigin(0.5, 0);

            const hoursLbl = this.add.text(0, -barH - 6, `${hours}h`, {
              fontFamily: "monospace", fontSize: "8px", color: "#1e1e1e",
            }).setOrigin(0.5, 1);

            c.add([bar, lbl, hoursLbl]);
            c.setData("speed", s);
            c.setData("hours", hours);
            c.setSize(barW, barMaxH + 30);
            c.setInteractive();
            this.bars.push(c);
          }
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;
          const speeds = 15;
          const barW = Math.floor((W - 60) / speeds);
          const s = Math.floor((pointer.x - 30) / barW) + 1;
          if (s < 1 || s > speeds) return;
          this.trySpeed(s);
        }

        trySpeed(clicked: number) {
          this.busy = true;
          this.mid = clicked;
          onAttempt();

          const hours = PILES.reduce((acc, p) => acc + Math.ceil(p / this.mid), 0);
          const canFinish = hours <= HOURS;

          this.highlightBar(this.mid, canFinish ? 0x22c55e : 0xef4444);

          const hoursLbl = this.bars[this.mid - 1].list[2] as Phaser.GameObjects.Text;
          hoursLbl.setStyle({ color: canFinish ? "#22c55e" : "#ef4444" });

          setTimeout(() => {
            if (canFinish) {
              if (this.mid === this.left || !this.canFinishAt(this.mid - 1)) {
                // Minimum found
                this.msgText!.setText(`minimum speed: ${this.mid} km/h`).setStyle({ color: "#22c55e" });
                solvedRef.current = true;
                this.time.delayedCall(700, () => onSolve());
              } else {
                this.right = this.mid;
                this.dimBarsRight(this.mid + 1);
                this.msgText!.setText(`speed ${this.mid} works (${hours}h) — try slower`);
              }
            } else {
              this.left = this.mid + 1;
              this.dimBarsLeft(this.mid);
              this.msgText!.setText(`speed ${this.mid} too slow (${hours}h > ${HOURS}h) — go faster`);
            }
            this.busy = false;
          }, 500);
        }

        canFinishAt(s: number): boolean {
          return PILES.reduce((acc, p) => acc + Math.ceil(p / s), 0) <= HOURS;
        }

        highlightBar(s: number, color: number) {
          const c = this.bars[s - 1];
          const hours = PILES.reduce((acc, p) => acc + Math.ceil(p / s), 0);
          const barW = Math.floor((W - 60) / 15);
          const barMaxH = 120;
          const barH = Math.max(10, Math.floor((hours / 20) * barMaxH));
          const bar = c.list[0] as Phaser.GameObjects.Graphics;
          bar.clear();
          bar.fillStyle(color, 0.15);
          bar.fillRect(-barW / 2 + 1, -barH, barW - 2, barH);
          bar.lineStyle(1, color, 0.5);
          bar.strokeRect(-barW / 2 + 1, -barH, barW - 2, barH);
        }

        dimBarsLeft(upTo: number) {
          for (let s = 1; s < upTo; s++) {
            const lbl = this.bars[s - 1].list[1] as Phaser.GameObjects.Text;
            lbl.setStyle({ color: "#1e1e1e" });
          }
        }

        dimBarsRight(from: number) {
          for (let s = from; s <= 15; s++) {
            const lbl = this.bars[s - 1].list[1] as Phaser.GameObjects.Text;
            lbl.setStyle({ color: "#1e1e1e" });
          }
        }
      }

      destroy();
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: W,
        height: H,
        parent: containerRef.current,
        backgroundColor: "#0a0a0a",
        scene: DeliveryScene,
      });
    }

    init();
    return () => { cancelled = true; destroy(); };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", cursor: "pointer" }} />;
}
