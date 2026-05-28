"use client";
// LC #704 — Binary Search. 32 vault doors. Click to crack. Wrong doors fly off. You ARE the search.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

function makeValues(): number[] {
  const vals: number[] = [];
  let v = 1 + Math.floor(Math.random() * 10);
  for (let i = 0; i < 32; i++) {
    vals.push(v);
    v += 2 + Math.floor(Math.random() * 9);
  }
  return vals;
}

function emitToolUsed(tool: string, complexity: string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("bs-tool-used", { detail: { tool, complexity } }));
}

type DoorRef = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  idx: number;
};

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
      const VALUES = makeValues();
      const N = VALUES.length; // 32
      const TARGET_IDX = Math.floor(Math.random() * N);
      const TARGET_VAL = VALUES[TARGET_IDX];

      class VaultScene extends Phaser.Scene {
        private doors: DoorRef[] = [];
        private left = 0;
        private right = N - 1;
        private busy = false;
        private moves = 0;
        private statusText!: Phaser.GameObjects.Text;
        private movesText!: Phaser.GameObjects.Text;
        private remainText!: Phaser.GameObjects.Text;
        private midHint!: Phaser.GameObjects.Text;

        constructor() { super({ key: "VaultScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#030608");
          this.buildHUD();
          this.spawnDoors(false);
        }

        buildHUD() {
          // Top bar — taller to fit instructions
          const bar = this.add.graphics().setDepth(10);
          bar.fillStyle(0x020406, 1);
          bar.fillRect(0, 0, W, 68);
          bar.lineStyle(1, 0x0a1a2a, 1);
          bar.lineBetween(0, 68, W, 68);

          this.add.text(16, 10, "// VAULT HEIST", {
            fontFamily: "monospace", fontSize: "9px", color: "#0d2030",
          }).setDepth(11);

          this.add.text(W / 2, 8, `TARGET SERIAL: ${TARGET_VAL}`, {
            fontFamily: "monospace", fontSize: "15px", color: "#3b82f6", fontStyle: "bold",
          }).setOrigin(0.5, 0).setDepth(11);

          this.movesText = this.add.text(W - 16, 10, "MOVES: 0", {
            fontFamily: "monospace", fontSize: "9px", color: "#1a2a3a",
          }).setOrigin(1, 0).setDepth(11);

          // Instruction line
          this.add.text(W / 2, 30, "32 VAULT DOORS, SORTED LOW → HIGH  ·  CLICK ANY DOOR TO REVEAL ITS SERIAL", {
            fontFamily: "monospace", fontSize: "8px", color: "#1a3a50",
          }).setOrigin(0.5, 0).setDepth(11);

          this.add.text(W / 2, 46, "TOO LOW = TARGET IS TO THE RIGHT  ·  TOO HIGH = TARGET IS TO THE LEFT  ·  FIND IT IN AS FEW CLICKS AS POSSIBLE", {
            fontFamily: "monospace", fontSize: "8px", color: "#0d2030",
          }).setOrigin(0.5, 0).setDepth(11);

          this.statusText = this.add.text(W / 2, H - 28, "CLICK ANY DOOR", {
            fontFamily: "monospace", fontSize: "10px", color: "#1a3050",
          }).setOrigin(0.5).setDepth(11);

          this.remainText = this.add.text(W / 2, H - 14, "32 VAULTS REMAINING", {
            fontFamily: "monospace", fontSize: "8px", color: "#0a1820",
          }).setOrigin(0.5).setDepth(11);

          this.midHint = this.add.text(W / 2, H - 42, "", {
            fontFamily: "monospace", fontSize: "8px", color: "#1a2a3a",
          }).setOrigin(0.5).setDepth(11);
        }

        spawnDoors(animate: boolean) {
          // destroy old
          for (const d of this.doors) d.container.destroy();
          this.doors = [];

          const count = this.right - this.left + 1;
          const padX = 16;
          const totalW = W - padX * 2;
          const dw = Math.floor(totalW / count);
          const dh = Math.min(130, H * 0.46);
          const dy = H * 0.56;
          const midI = Math.floor((this.left + this.right) / 2);

          for (let i = 0; i < count; i++) {
            const realIdx = this.left + i;
            const targetX = padX + i * dw + dw / 2;
            const isMid = realIdx === midI;

            const c = this.add.container(animate ? (i < count / 2 ? -60 : W + 60) : targetX, dy);
            const bg = this.add.graphics();
            const isTarget = VALUES[realIdx] === TARGET_VAL;
            this.drawDoor(bg, dw, dh, isMid, false);

            const fontSize = count <= 2 ? 28 : count <= 4 ? 22 : count <= 8 ? 16 : count <= 16 ? 12 : 9;
            const txt = this.add.text(0, 0, VALUES[realIdx].toString(), {
              fontFamily: "monospace",
              fontSize: `${fontSize}px`,
              color: isMid ? "#4a90c0" : "#1e4060",
            }).setOrigin(0.5);

            c.add([bg, txt]);
            c.setSize(dw - 2, dh);
            c.setInteractive({ cursor: "pointer" });
            c.setData("idx", realIdx);

            const door: DoorRef = { container: c, bg, txt, idx: realIdx };

            ((door, dw, dh, isMid) => {
              door.container.on("pointerover", () => {
                if (this.busy) return;
                this.drawDoor(door.bg, dw, dh, isMid, true);
                door.txt.setStyle({ color: "#60b0e8" });
              });
              door.container.on("pointerout", () => {
                if (this.busy) return;
                this.drawDoor(door.bg, dw, dh, isMid, false);
                door.txt.setStyle({ color: isMid ? "#4a90c0" : "#1e4060" });
              });
              door.container.on("pointerdown", () => this.crack(door, dw, dh));
            })(door, dw, dh, isMid);

            this.doors.push(door);

            if (animate) {
              this.tweens.add({
                targets: c, x: targetX,
                duration: 200 + i * 8, ease: "Back.Out",
              });
            }
          }

          const remaining = this.right - this.left + 1;
          this.remainText.setText(`${remaining} VAULT${remaining !== 1 ? "S" : ""} REMAINING`);

          this.midHint.setText("");
        }

        drawDoor(g: Phaser.GameObjects.Graphics, dw: number, dh: number, isMid: boolean, hover: boolean) {
          g.clear();
          if (hover) {
            g.fillStyle(0x0d2a42, 1);
            g.fillRoundedRect(-dw / 2 + 1, -dh / 2, dw - 2, dh, 4);
            g.lineStyle(1, 0x3b82f6, 0.8);
            g.strokeRoundedRect(-dw / 2 + 1, -dh / 2, dw - 2, dh, 4);
          } else if (isMid) {
            g.fillStyle(0x0a1e30, 1);
            g.fillRoundedRect(-dw / 2 + 1, -dh / 2, dw - 2, dh, 4);
            g.lineStyle(1, 0x1e4a6a, 1);
            g.strokeRoundedRect(-dw / 2 + 1, -dh / 2, dw - 2, dh, 4);
          } else {
            g.fillStyle(0x080e16, 1);
            g.fillRoundedRect(-dw / 2 + 1, -dh / 2, dw - 2, dh, 4);
            g.lineStyle(1, 0x0d1e2e, 1);
            g.strokeRoundedRect(-dw / 2 + 1, -dh / 2, dw - 2, dh, 4);
          }
          // handle dot
          if (dw > 14) {
            g.fillStyle(isMid ? 0x1e4a6a : 0x0d1e2e, 1);
            g.fillCircle(dw / 4, dh / 4, Math.max(2, dw / 10));
          }
        }

        crack(door: DoorRef, dw: number, dh: number) {
          if (this.busy || solvedRef.current) return;
          this.busy = true;
          this.moves++;
          this.movesText.setText(`MOVES: ${this.moves}`);
          onAttempt();
          playSound("click");
          emitToolUsed("Binary Search", "O(log n)");

          const val = VALUES[door.idx];

          if (val === TARGET_VAL) {
            solvedRef.current = true;
            door.bg.clear();
            door.bg.fillStyle(0x001a08, 1);
            door.bg.fillRoundedRect(-dw / 2 + 1, -dh / 2, dw - 2, dh, 4);
            door.bg.lineStyle(2, 0x22c55e, 1);
            door.bg.strokeRoundedRect(-dw / 2 + 1, -dh / 2, dw - 2, dh, 4);
            door.txt.setStyle({ color: "#22c55e", fontSize: "24px" });

            this.statusText.setText(`VAULT ${TARGET_VAL} CRACKED — ${this.moves} MOVE${this.moves !== 1 ? "S" : ""}`).setStyle({ color: "#22c55e" });
            this.remainText.setText(this.moves <= 5 ? "OPTIMAL ✓" : "").setStyle({ color: "#22c55e" });
            emitReaction("BURST", "🎯 CRACKED", door.container.x, door.container.y);
            playSound("solve");

            this.tweens.add({
              targets: door.container, scaleX: 1.25, scaleY: 1.25,
              duration: 160, yoyo: true, repeat: 2,
              onComplete: () => this.time.delayedCall(500, () => onSolve()),
            });
            return;
          }

          const tooLow = val < TARGET_VAL;

          if (tooLow) {
            this.statusText.setText(`[${val}] TOO LOW — TARGET IS TO THE RIGHT →`).setStyle({ color: "#f97316" });
            emitReaction("SLIDE_RIGHT", "TOO LOW →", door.container.x, door.container.y - 30);
            playSound("wrong");

            const toFly = this.doors.filter(d => d.idx <= door.idx);
            const keep = this.doors.filter(d => d.idx > door.idx);

            let done = 0;
            for (const d of toFly) {
              this.tweens.add({
                targets: d.container, x: -120, alpha: 0,
                duration: 280, ease: "Cubic.In",
                onComplete: () => {
                  d.container.destroy();
                  done++;
                  if (done === toFly.length) {
                    this.left = door.idx + 1;
                    this.doors = keep;
                    this.afterEliminate();
                  }
                },
              });
            }
            if (toFly.length === 0) this.afterEliminate();
          } else {
            this.statusText.setText(`[${val}] TOO HIGH — TARGET IS TO THE LEFT ←`).setStyle({ color: "#a855f7" });
            emitReaction("SLIDE_LEFT", "← TOO HIGH", door.container.x, door.container.y - 30);
            playSound("wrong");

            const toFly = this.doors.filter(d => d.idx >= door.idx);
            const keep = this.doors.filter(d => d.idx < door.idx);

            let done = 0;
            for (const d of toFly) {
              this.tweens.add({
                targets: d.container, x: W + 120, alpha: 0,
                duration: 280, ease: "Cubic.In",
                onComplete: () => {
                  d.container.destroy();
                  done++;
                  if (done === toFly.length) {
                    this.right = door.idx - 1;
                    this.doors = keep;
                    this.afterEliminate();
                  }
                },
              });
            }
            if (toFly.length === 0) this.afterEliminate();
          }
        }

        afterEliminate() {
          if (this.left > this.right) {
            this.statusText.setText("SEARCH FAILED — this shouldn't happen").setStyle({ color: "#ef4444" });
            this.busy = false;
            return;
          }
          this.time.delayedCall(80, () => {
            this.repositionDoors();
          });
        }

        repositionDoors() {
          const count = this.right - this.left + 1;
          const padX = 16;
          const totalW = W - padX * 2;
          const dw = Math.floor(totalW / count);
          const dh = Math.min(130, H * 0.46);
          const dy = H * 0.56;
          const midI = Math.floor((this.left + this.right) / 2);
          const fontSize = count <= 2 ? 28 : count <= 4 ? 22 : count <= 8 ? 16 : count <= 16 ? 12 : 9;

          let pending = count;

          for (let i = 0; i < count; i++) {
            const door = this.doors[i];
            const realIdx = door.idx;
            const isMid = realIdx === midI;
            const targetX = padX + i * dw + dw / 2;

            door.bg.clear();
            this.drawDoor(door.bg, dw, dh, isMid, false);
            door.txt.setStyle({
              fontSize: `${fontSize}px`,
              color: isMid ? "#4a90c0" : "#1e4060",
            });
            door.container.setSize(dw - 2, dh);
            door.container.y = dy;

            this.tweens.add({
              targets: door.container, x: targetX,
              duration: 240, ease: "Back.Out",
              onComplete: () => {
                pending--;
                if (pending === 0) {
                  this.rewireListeners(dw, dh, midI);
                  this.busy = false;
                  const remaining = this.right - this.left + 1;
                  this.remainText.setText(`${remaining} VAULT${remaining !== 1 ? "S" : ""} REMAINING`).setStyle({ color: "#0a1820" });
                  if (remaining === 1) {
                    this.statusText.setText("ONE VAULT LEFT — CRACK IT").setStyle({ color: "#3b82f6" });
                  }
                }
              },
            });
          }

          if (count === 0) { this.busy = false; }
        }

        rewireListeners(dw: number, dh: number, midI: number) {
          for (const door of this.doors) {
            door.container.removeAllListeners();
            door.container.setInteractive({ cursor: "pointer" });
            const isMid = door.idx === midI;
            ((d, dw, dh, isMid) => {
              d.container.on("pointerover", () => {
                if (this.busy) return;
                this.drawDoor(d.bg, dw, dh, isMid, true);
                d.txt.setStyle({ color: "#60b0e8" });
              });
              d.container.on("pointerout", () => {
                if (this.busy) return;
                this.drawDoor(d.bg, dw, dh, isMid, false);
                d.txt.setStyle({ color: isMid ? "#4a90c0" : "#1e4060" });
              });
              d.container.on("pointerdown", () => this.crack(d, dw, dh));
            })(door, dw, dh, isMid);
          }
        }
      }

      if (gameRef.current) { gameRef.current.destroy(); gameRef.current = null; }
      const g = new Phaser.Game({
        type: Phaser.AUTO, width: W, height: H,
        parent: containerRef.current!, backgroundColor: "#030608",
        scene: VaultScene, render: { antialias: true },
        input: { mouse: { preventDefaultWheel: false } },
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
