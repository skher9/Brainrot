export type StarCount = 0 | 1 | 2 | 3;

export const SCAN = {
  bg:          "#060a08",
  bgPanel:     "#0a1010",
  bgCard:      "rgba(10,20,16,0.9)",
  border:      "rgba(0,220,120,0.18)",
  borderGreen: "rgba(0,220,120,0.5)",
  borderAmber: "rgba(220,180,0,0.45)",
  borderRed:   "rgba(220,60,60,0.45)",
  green:       "#00dc78",
  greenDim:    "rgba(0,220,120,0.45)",
  greenBright: "#00ff88",
  amber:       "#dcb400",
  amberDim:    "rgba(220,180,0,0.45)",
  red:         "#dc3c3c",
  redDim:      "rgba(220,60,60,0.45)",
  cyan:        "#00c8a0",
  steel:       "#7a9488",
  text:        "#d0e8d8",
  textDim:     "rgba(208,232,216,0.48)",
  textFaint:   "rgba(208,232,216,0.22)",
  scanLine:    "rgba(0,220,120,0.04)",
};

export function calcStars(moves: number, optimal: number): StarCount {
  if (moves <= optimal)     return 3;
  if (moves <= optimal + 2) return 2;
  if (moves <= optimal + 4) return 1;
  return 0;
}

export function calcXP(base: number, stars: StarCount): number {
  return Math.round(base * [0.5, 0.7, 0.85, 1.0][stars]);
}
