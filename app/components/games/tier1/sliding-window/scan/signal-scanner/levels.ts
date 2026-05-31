export type ScanMode =
  | "fixed_max"       // find max sum subarray of size k (L1)
  | "fixed_target"    // find subarray of size k equal to target (L2)
  | "fixed_count"     // count all windows matching condition (L3)
  | "fixed_min"       // find min sum window of size k (L4)
  | "fixed_average"   // sliding average — find window above threshold (L5)
  | "fixed_product"   // max product window (L6)
  | "fixed_zeros"     // max ones after flipping k zeros (L7)
  | "boss";           // 4 simultaneous scans (L8)

export interface ScanLevel {
  level: number;
  signalTitle: string;
  storyBeat: string;
  ahaTitle: string;
  ahaBody: string;
  xpBase: number;
  mode: ScanMode;
  array: number[];
  windowSize: number;
  target?: number;
  threshold?: number;
  optimalSteps: number;
}

export const SIGNAL_LEVELS: ScanLevel[] = [
  {
    level: 1,
    signalTitle: "First Sweep",
    storyBeat: "New sensor array. Slide a 3-unit window across the signal. Find the strongest burst.",
    ahaTitle: "Fixed Window: Subtract & Add",
    ahaBody: "Don't recompute the whole window sum each step. Remove the leftmost value, add the new rightmost. O(n) instead of O(n·k). This is the core fixed-window insight.",
    xpBase: 40,
    mode: "fixed_max",
    array: [2, 4, 1, 6, 3, 8, 5, 2],
    windowSize: 3,
    optimalSteps: 6,
  },
  {
    level: 2,
    signalTitle: "Target Lock",
    storyBeat: "Intelligence identified a target sum of 12. Locate the exact 3-unit window.",
    ahaTitle: "Fixed Window Target Match",
    ahaBody: "Same slide technique. Check each window sum against the target. One pass, O(n). Brute force would check all n·(n-1)/2 pairs — O(n²).",
    xpBase: 50,
    mode: "fixed_target",
    array: [3, 1, 4, 5, 2, 6, 3, 7],
    windowSize: 3,
    target: 12,
    optimalSteps: 6,
  },
  {
    level: 3,
    signalTitle: "Pattern Count",
    storyBeat: "Count every 4-unit window with a sum above 14. Report the count.",
    ahaTitle: "Counting Valid Windows",
    ahaBody: "Slide and count: maintain running sum, check condition each step. Total windows = n - k + 1. This pattern solves 'count subarrays with property X' in O(n).",
    xpBase: 60,
    mode: "fixed_count",
    array: [2, 5, 3, 6, 4, 7, 1, 8, 5, 3],
    windowSize: 4,
    threshold: 14,
    optimalSteps: 7,
  },
  {
    level: 4,
    signalTitle: "Minimum Noise",
    storyBeat: "Find the 3-unit window with the lowest interference level.",
    ahaTitle: "Min Window — Same Algorithm, Different Comparator",
    ahaBody: "Tracking minimum instead of maximum is identical code with one sign flip. The algorithm is comparator-agnostic. Recognizing this collapses dozens of 'min/max subarray' problems into one mental model.",
    xpBase: 65,
    mode: "fixed_min",
    array: [8, 3, 6, 1, 4, 9, 2, 7],
    windowSize: 3,
    optimalSteps: 6,
  },
  {
    level: 5,
    signalTitle: "Moving Average",
    storyBeat: "Real-time signal processing. Find all 4-unit windows averaging above 4.5.",
    ahaTitle: "Sliding Average in O(n)",
    ahaBody: "Divide running sum by k each step. Faster than keeping a queue and summing. This is how financial moving averages, sensor smoothing, and audio processing work — one division per step.",
    xpBase: 75,
    mode: "fixed_average",
    array: [3, 2, 6, 5, 8, 1, 7, 4, 9, 2],
    windowSize: 4,
    threshold: 4.5,
    optimalSteps: 7,
  },
  {
    level: 6,
    signalTitle: "Peak Frequency",
    storyBeat: "Find the 3-unit window with the highest frequency product.",
    ahaTitle: "Product vs Sum — Same Sliding Idea",
    ahaBody: "Divide-out the leftmost instead of subtracting (multiply/divide instead of add/subtract). Watch for zeros — a zero in the window collapses the product. The pattern works for any associative operation with an inverse.",
    xpBase: 80,
    mode: "fixed_product",
    array: [2, 3, 4, 1, 5, 6, 2, 4],
    windowSize: 3,
    optimalSteps: 6,
  },
  {
    level: 7,
    signalTitle: "Zero Flip",
    storyBeat: "You can flip up to 2 dead channels (zeros). Find the longest active stretch.",
    ahaTitle: "Max Consecutive Ones III — Fixed Constraint",
    ahaBody: "Fixed-size window where window is valid if zeros ≤ k. Track zero count as window slides. This is actually variable window disguised as fixed — the window only grows when we find something valid. Classic LeetCode 1004.",
    xpBase: 90,
    mode: "fixed_zeros",
    array: [1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
    windowSize: 5,
    optimalSteps: 9,
  },
  {
    level: 8,
    signalTitle: "Sector Sweep",
    storyBeat: "Four sectors. Four simultaneous signal sweeps. All must be cleared.",
    ahaTitle: "Fixed Window: Universal Array Aggregation",
    ahaBody: "Sum, min, max, average, product, count — all run in O(n) with fixed sliding window. One pattern replaces brute-force O(n²) for any contiguous subarray aggregation query.",
    xpBase: 120,
    mode: "boss",
    array: [2, 4, 1, 6, 3, 8, 5, 2],
    windowSize: 3,
    optimalSteps: 24,
  },
];
