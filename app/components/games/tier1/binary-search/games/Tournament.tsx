"use client";
// LC #35 — Search Insert Position. 3 tool modes.
// Check Each Fighter (O(n)): +3% noise per check. Binary Position Search (O(log n)): structured mid.
// Ask Neighbors (O(1)×3): 3 targeted asks. Riot at 100% noise.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N_FIGHTERS = 12;

function makeFighters() {
  const p: number[] = [];
  let cur = 2 + Math.floor(Math.random() * 8);
  for (let i = 0; i < N_FIGHTERS; i++) { cur += 3 + Math.floor(Math.random() * 12); p.push(cur); }
  return p;
}

function emitToolUsed(tool: string, complexity: string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("bs-tool-used", { detail: { tool, complexity } }));
}

export default function Tournament({ onSolve, onAttempt }: GameProps) {
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

      const FIGHTERS = makeFighters();
      let CHALLENGER: number;
      do { CHALLENGER = FIGHTERS[0] + Math.floor(Math.random() * (FIGHTERS[N_FIGHTERS - 1] - FIGHTERS[0])); }
      while (FIGHTERS.includes(CHALLENGER));
      const ANSWER = (() => { const i = FIGHTERS.findIndex(f => f >= CHALLENGER); return i === -1 ? N_FIGHTERS : i; })();

      class TournamentScene extends Phaser.Scene {
        private toolMode = "Binary Position Search";
        private left = 0;
        private right = N_FIGHTERS;
        private noiseLevel = 0; // 0–100
        private noisePct = 0; // fine-grained
        private comparisons: Map<number, "lt" | "gte"> = new Map();
        private neighborsLeft = 3; // Ask Neighbors uses
        private busy = false;
        private statusText!: Phaser.GameObjects.Text;
        private rangeText!: Phaser.GameObjects.Text;
        private noiseMeter!: Phaser.GameObjects.Graphics;
        private noiseLabel!: Phaser.GameObjects.Text;
        private toolSelectHandler!: (e: Event) => void;
        private slotHighlight!: Phaser.GameObjects.Graphics;
        // For linear scan mode, track current fighter
        private linearIdx = 0;

        constructor() { super({ key: "TournamentScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#040206");
          this.drawArena();
          this.buildFighters();
          this.buildHUD();
          this.slotHighlight = this.add.graphics().setDepth(4);

          this.toolSelectHandler = (e: Event) => {
            this.toolMode = (e as CustomEvent).detail.tool as string;
            this.linearIdx = 0;
            this.updateToolHints();
          };
          window.addEventListener("bs-tool-select", this.toolSelectHandler);
          this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener("bs-tool-select", this.toolSelectHandler);
          });

          this.input.on("pointerdown", this.onClick, this);
        }

        drawArena() {
          const g = this.add.graphics();
          g.fillStyle(0x080210, 1);
          g.fillRect(0, H * 0.7, W, H);
          g.lineStyle(1, 0x1a0840, 1);
          g.lineBetween(0, H * 0.7, W, H * 0.7);
          for (let cx = 10; cx < W; cx += 22) {
            const ch = 12 + Math.abs(Math.sin(cx * 0.3)) * 8;
            g.fillStyle(0x0c0420, 1);
            g.fillRect(cx, H * 0.7 - ch, 11, ch);
          }
        }

        buildFighters() {
          const pad = 14, totalW = W - pad * 2;
          const sw = totalW / N_FIGHTERS;
          const fw = Math.max(sw - 10, 18);
          const fh = 48;
          const baseY = H * 0.57;

          for (let i = 0; i < N_FIGHTERS; i++) {
            const cx = pad + i * sw + sw / 2;
            const c = this.add.container(cx, baseY);
            const body = this.add.graphics();
            body.fillStyle(0x180830, 1);
            body.fillRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);
            body.lineStyle(1, 0x3a1060, 1);
            body.strokeRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);
            const icon = this.add.text(0, -6, "◈", {
              fontFamily: "monospace", fontSize: "13px", color: "#6a30a0",
            }).setOrigin(0.5);
            const pow = this.add.text(0, 13, String(FIGHTERS[i]), {
              fontFamily: "monospace", fontSize: "8px", color: "#3a1060",
            }).setOrigin(0.5);
            c.add([body, icon, pow]);
            c.setData("idx", i);
            c.setSize(sw - 4, fh + 10);
            c.setInteractive({ cursor: "pointer" });
          }
        }

        buildHUD() {
          const bar = this.add.graphics();
          bar.fillStyle(0x020104, 1);
          bar.fillRect(0, 0, W, 44);
          bar.lineStyle(1, 0x1a0840, 1);
          bar.lineBetween(0, 44, W, 44);
          this.add.text(16, 12, "// THE TOURNAMENT", {
            fontFamily: "monospace", fontSize: "10px", color: "#1a0840",
          });
          this.add.text(W / 2, 10, `CHALLENGER  ◈ ${CHALLENGER}  POWER`, {
            fontFamily: "monospace", fontSize: "11px", color: "#a855f7",
          }).setOrigin(0.5, 0);

          this.noiseMeter = this.add.graphics();
          this.noiseLabel = this.add.text(W - 14, 12, "NOISE: 0%", {
            fontFamily: "monospace", fontSize: "9px", color: "#1a0840",
          }).setOrigin(1, 0);

          this.statusText = this.add.text(W / 2, H - 36, "CLICK A FIGHTER TO COMPARE POWER", {
            fontFamily: "monospace", fontSize: "10px", color: "#2a1050",
          }).setOrigin(0.5);
          this.rangeText = this.add.text(W / 2, H - 20, `INSERT RANGE: [${this.left}, ${this.right}]`, {
            fontFamily: "monospace", fontSize: "9px", color: "#1a0840",
          }).setOrigin(0.5);
        }

        updateToolHints() {
          if (this.toolMode === "Ask Neighbors") {
            this.statusText.setText(`ASK NEIGHBORS — ${this.neighborsLeft} uses left. Click any fighter.`).setStyle({ color: "#22c55e" });
          } else if (this.toolMode === "Check Each Fighter") {
            this.statusText.setText("CHECK EACH FIGHTER left to right (+3% noise each)").setStyle({ color: "#eab308" });
          } else {
            this.statusText.setText("CLICK A FIGHTER TO COMPARE POWER").setStyle({ color: "#2a1050" });
          }
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;

          const pad = 14, totalW = W - pad * 2;
          const sw = totalW / N_FIGHTERS;
          const fh = 58;
          const baseY = H * 0.57;

          // Check fighter click
          for (let i = 0; i < N_FIGHTERS; i++) {
            const cx = pad + i * sw + sw / 2;
            if (Math.abs(pointer.x - cx) < sw / 2 && Math.abs(pointer.y - baseY) < fh / 2) {
              this.compareFighter(i, pointer.x, pointer.y);
              return;
            }
          }

          // Check gap click (slot zones)
          const slotY = H * 0.57;
          if (pointer.y > H * 0.47 && pointer.y < H * 0.7) {
            for (let g = 0; g <= N_FIGHTERS; g++) {
              const gx = g === 0 ? pad : g === N_FIGHTERS ? W - pad : pad + g * sw;
              if (Math.abs(pointer.x - gx) < sw * 0.3) {
                this.tryInsert(g, pointer.x, pointer.y);
                return;
              }
            }
          }
        }

        compareFighter(i: number, px: number, py: number) {
          if (this.toolMode === "Ask Neighbors" && this.neighborsLeft <= 0) {
            this.statusText.setText("NO ASKS LEFT — click a gap to insert").setStyle({ color: "#ef4444" });
            return;
          }

          this.busy = true;
          onAttempt();
          playSound("click");

          const noiseIncrease = this.toolMode === "Check Each Fighter" ? 3 : 3;
          this.addNoise(noiseIncrease);

          const isGte = FIGHTERS[i] >= CHALLENGER;
          this.comparisons.set(i, isGte ? "gte" : "lt");

          if (this.toolMode === "Ask Neighbors") {
            this.neighborsLeft--;
            emitToolUsed("Ask Neighbors", "O(1)×3");
          } else if (this.toolMode === "Check Each Fighter") {
            emitToolUsed("Check Each Fighter", "O(n)");
          } else {
            emitToolUsed("Binary Position Search", "O(log n)");
          }

          if (isGte) this.right = i;
          else this.left = i + 1;

          this.updateFighterColor(i, isGte);
          this.rangeText.setText(`INSERT RANGE: [${this.left}, ${this.right}]`);

          const hint = isGte
            ? `${FIGHTERS[i]} ≥ ${CHALLENGER} — CHALLENGER GOES BEFORE [${i}]`
            : `${FIGHTERS[i]} < ${CHALLENGER} — CHALLENGER GOES AFTER [${i}]`;
          this.statusText.setText(hint).setStyle({ color: isGte ? "#9060c0" : "#c07020" });
          emitReaction(isGte ? "SLIDE_LEFT" : "SLIDE_RIGHT", isGte ? "← BEFORE" : "AFTER →", px, py);
          playSound("beep");

          if (this.left === this.right) {
            this.showInsertSlot(this.left);
            this.statusText.setText(`INSERT AT SLOT ${this.left} — CLICK THE GAP`).setStyle({ color: "#a855f7" });
          } else if (this.toolMode === "Ask Neighbors") {
            this.statusText.setText(`${this.neighborsLeft} asks left. Range [${this.left}..${this.right}].`).setStyle({ color: "#22c55e" });
          }

          this.busy = false;
        }

        addNoise(pct: number) {
          this.noisePct = Math.min(100, this.noisePct + pct);
          this.noiseLabel.setText(`NOISE: ${Math.round(this.noisePct)}%`).setStyle({
            color: this.noisePct >= 80 ? "#ef4444" : this.noisePct >= 50 ? "#eab308" : "#1a0840",
          });

          this.noiseMeter.clear();
          const bw = 80, bh = 4;
          const bx = W - 100, by = 32;
          this.noiseMeter.fillStyle(0x111111, 1);
          this.noiseMeter.fillRect(bx, by, bw, bh);
          const col = this.noisePct >= 80 ? 0xef4444 : this.noisePct >= 50 ? 0xeab308 : 0xa855f7;
          this.noiseMeter.fillStyle(col, 1);
          this.noiseMeter.fillRect(bx, by, bw * (this.noisePct / 100), bh);

          if (this.noisePct >= 100) {
            this.time.delayedCall(400, () => this.showRetry());
          }
        }

        updateFighterColor(i: number, isGte: boolean) {
          const pad = 14, totalW = W - pad * 2;
          const sw = totalW / N_FIGHTERS;
          const fw = Math.max(sw - 10, 18), fh = 48;
          const c = this.children.list.find(obj => {
            if (!(obj instanceof Phaser.GameObjects.Container)) return false;
            return obj.getData("idx") === i;
          }) as Phaser.GameObjects.Container | undefined;
          if (!c) return;
          const bg = c.list[0] as Phaser.GameObjects.Graphics;
          bg.clear();
          bg.fillStyle(isGte ? 0x1a0830 : 0x2a1400, 1);
          bg.fillRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);
          bg.lineStyle(1, isGte ? 0x9030c0 : 0xc06000, 1);
          bg.strokeRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);
          (c.list[2] as Phaser.GameObjects.Text).setStyle({ color: isGte ? "#9030c0" : "#c06000" });
        }

        showInsertSlot(slot: number) {
          const pad = 14, totalW = W - pad * 2;
          const sw = totalW / N_FIGHTERS;
          const gx = slot === 0 ? pad : slot === N_FIGHTERS ? W - pad : pad + slot * sw;
          this.slotHighlight.clear();
          this.slotHighlight.lineStyle(2, 0xa855f7, 0.8);
          this.slotHighlight.lineBetween(gx, H * 0.42, gx, H * 0.7);
          const arrow = this.add.text(gx, H * 0.42, "▼", {
            fontFamily: "monospace", fontSize: "14px", color: "#a855f7",
          }).setOrigin(0.5, 1).setDepth(5);
          this.tweens.add({ targets: arrow, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });
        }

        tryInsert(slot: number, px: number, py: number) {
          onAttempt();
          if (slot === ANSWER) {
            solvedRef.current = true;
            playSound("solve");
            this.statusText.setText(`CHALLENGER INSERTED AT [${slot}] — TOURNAMENT BEGINS`).setStyle({ color: "#a855f7" });
            emitReaction("BURST", "⚔ PERFECT SLOT", px, py);
            this.time.delayedCall(600, () => onSolve());
          } else {
            this.addNoise(10);
            playSound("wrong");
            emitReaction("DANGER", "✗ WRONG SLOT", px, py);
            this.statusText.setText(`WRONG SLOT — CROWD RIOTS  [${this.left}..${this.right}]`).setStyle({ color: "#cc2244" });
          }
        }

        showRetry() {
          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.78);
          ov.fillRect(0, 0, W, H);
          this.add.text(W / 2, H / 2 - 24, "CROWD RIOT — TOURNAMENT CANCELLED", {
            fontFamily: "monospace", fontSize: "11px", color: "#cc2244",
          }).setOrigin(0.5).setDepth(21);
          this.add.text(W / 2, H / 2 - 6, "Check Each Fighter generates 3× more noise than binary search", {
            fontFamily: "monospace", fontSize: "9px", color: "#441122",
          }).setOrigin(0.5).setDepth(21);
          const btn = this.add.text(W / 2, H / 2 + 20, "[ RETRY ]", {
            fontFamily: "monospace", fontSize: "12px", color: "#a855f7",
            backgroundColor: "#040206", padding: { x: 16, y: 7 },
          }).setOrigin(0.5).setDepth(21).setInteractive({ cursor: "pointer" });
          btn.on("pointerdown", () => { solvedRef.current = false; this.scene.restart(); });
        }
      }

      if (gameRef.current) { gameRef.current.destroy(); gameRef.current = null; }
      const g = new Phaser.Game({
        type: Phaser.AUTO, width: W, height: H,
        parent: containerRef.current!, backgroundColor: "#040206",
        scene: TournamentScene, render: { antialias: true },
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
