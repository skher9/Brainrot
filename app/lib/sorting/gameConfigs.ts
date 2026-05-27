export interface LevelConfig {
  id: string;
  level: number;
  name: string;
  description: string;
  isWatchMode: boolean;
  isTimed: boolean;
  hasLeaderboard: boolean;
  baseXP: number;
  timeTarget?: number; // seconds
}

export interface SortModuleConfig {
  slug: string;
  name: string;
  description: string;
  complexity: { time: string; space: string };
  theme: string;
  library: string;
  order: number;
  levels: LevelConfig[];
  hints: [string, string, string]; // exactly 3
  category: string;
}

const CAT = "sorting";

export const SORT_MODULES: SortModuleConfig[] = [
  // ─── 1. Bubble Sort ─────────────────────────────────────────────────────────
  {
    slug: "bubble-sort",
    name: "Bubble Sort",
    description: "Watch values bubble up, pass by pass.",
    complexity: { time: "O(n²)", space: "O(1)" },
    theme: "Visualizer",
    library: "DOM",
    order: 1,
    category: CAT,
    hints: [
      "Notice which values keep moving to the right.",
      "Each full pass guarantees the largest remaining value reaches its final spot.",
      "Compare adjacent pairs left to right. If left > right, swap. Repeat until no swaps needed.",
    ],
    levels: [
      { id: "bs-l1", level: 1, name: "Watch Mode", description: "Observe bubble sort in action.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "bs-l2", level: 2, name: "You Decide", description: "Should these two swap?", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 40 },
      { id: "bs-l3", level: 3, name: "Beat the Clock", description: "Sort as fast as possible.", isWatchMode: false, isTimed: true, hasLeaderboard: false, baseXP: 50 },
      { id: "bs-l4", level: 4, name: "Spot the Bug", description: "Find the wrong swap.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 50 },
      { id: "bs-l5", level: 5, name: "Boss Level", description: "Timed challenge. Leaderboard.", isWatchMode: false, isTimed: true, hasLeaderboard: true, baseXP: 75, timeTarget: 120 },
    ],
  },

  // ─── 2. Selection Sort ──────────────────────────────────────────────────────
  {
    slug: "selection-sort",
    name: "Selection Sort",
    description: "Always eliminate the weakest target first.",
    complexity: { time: "O(n²)", space: "O(1)" },
    theme: "Sniper Range",
    library: "Phaser",
    order: 2,
    category: CAT,
    hints: [
      "Think about which target would be safest to eliminate first.",
      "You need to find the smallest remaining value every single time before making a move.",
      "Scan all remaining targets, identify the one with the lowest number — that's always your next shot.",
    ],
    levels: [
      { id: "ss-l1", level: 1, name: "Watch Mode", description: "AI crosshair scans and eliminates.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "ss-l2", level: 2, name: "Assisted Aim", description: "Correct target has magnetic pull.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 40 },
      { id: "ss-l3", level: 3, name: "Free Play", description: "No assistance. Shoot the minimum.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 50 },
      { id: "ss-l4", level: 4, name: "Complexity Visual", description: "8 targets vs 16 — feel O(n²).", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 50 },
      { id: "ss-l5", level: 5, name: "Challenge", description: "12 targets, timer, wrong shots add 5s.", isWatchMode: false, isTimed: true, hasLeaderboard: true, baseXP: 75, timeTarget: 90 },
    ],
  },

  // ─── 3. Insertion Sort ──────────────────────────────────────────────────────
  {
    slug: "insertion-sort",
    name: "Insertion Sort",
    description: "Slot each album into its correct position.",
    complexity: { time: "O(n²) / O(n) best", space: "O(1)" },
    theme: "Vinyl Record Shelf",
    library: "Pixi.js",
    order: 3,
    category: CAT,
    hints: [
      "Each new album belongs somewhere in the already-sorted section on the left.",
      "Scan left from where the album arrived — stop when you find a smaller number.",
      "Drag the album left until the album to its left is smaller (or there's nothing left). That gap is correct.",
    ],
    levels: [
      { id: "is-l1", level: 1, name: "Watch Mode", description: "Albums auto-sort, observe the growing sorted section.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "is-l2", level: 2, name: "Guided", description: "Correct slot glows. Drag to it.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 40 },
      { id: "is-l3", level: 3, name: "Free Play", description: "Albums arrive every 3 seconds. Place them.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 50 },
      { id: "is-l4", level: 4, name: "Worst Case", description: "Albums arrive in reverse — feel O(n²) vs O(n).", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 50 },
      { id: "is-l5", level: 5, name: "Survival", description: "20 albums, increasing speed, 60s.", isWatchMode: false, isTimed: true, hasLeaderboard: true, baseXP: 75, timeTarget: 60 },
    ],
  },

  // ─── 4. Merge Sort ──────────────────────────────────────────────────────────
  {
    slug: "merge-sort",
    name: "Merge Sort",
    description: "Divide the city, then merge districts in order.",
    complexity: { time: "O(n log n)", space: "O(n)" },
    theme: "City District Merger",
    library: "D3 + Phaser",
    order: 4,
    category: CAT,
    hints: [
      "Cut the group as evenly as possible each time.",
      "When merging two groups, always take the smaller number first.",
      "Split all the way down to individuals first, then rebuild by always picking the minimum from each pair.",
    ],
    levels: [
      { id: "ms-l1", level: 1, name: "Watch Mode", description: "Full split and merge plays automatically.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "ms-l2", level: 2, name: "Split Only", description: "You split, AI merges.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 40 },
      { id: "ms-l3", level: 3, name: "Merge Only", description: "AI splits, you merge.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 45 },
      { id: "ms-l4", level: 4, name: "Full Play", description: "Split and merge everything.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 55 },
      { id: "ms-l5", level: 5, name: "Complexity Visual", description: "See O(n log n) build in real time.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 55 },
      { id: "ms-l6", level: 6, name: "Challenge", description: "16 districts, timer, wrong merges +3s.", isWatchMode: false, isTimed: true, hasLeaderboard: true, baseXP: 75, timeTarget: 120 },
      { id: "ms-l7", level: 7, name: "Space Complexity", description: "Visualize O(n) extra memory.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 55 },
    ],
  },

  // ─── 5. Quick Sort ──────────────────────────────────────────────────────────
  {
    slug: "quick-sort",
    name: "Quick Sort",
    description: "Direct passengers through border control.",
    complexity: { time: "O(n log n) avg / O(n²) worst", space: "O(log n)" },
    theme: "Airport Border Control",
    library: "Phaser",
    order: 5,
    category: CAT,
    hints: [
      "The pivot passenger goes in the middle — smaller numbers to the left, larger to the right.",
      "Every passenger who is less than the pivot belongs in the left lane.",
      "Pick a pivot near the middle value for best performance. First or last = worst case O(n²).",
    ],
    levels: [
      { id: "qs-l1", level: 1, name: "Watch Mode", description: "Auto-play with random pivot.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "qs-l2", level: 2, name: "Partition Only", description: "Pivot pre-selected, you direct passengers.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 40 },
      { id: "qs-l3", level: 3, name: "Pivot Choice", description: "Choose pivot AND direct passengers.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 50 },
      { id: "qs-l4", level: 4, name: "Pivot Strategy", description: "3 rounds: first, random, median pivot.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 55 },
      { id: "qs-l5", level: 5, name: "Complexity Visual", description: "Best vs worst case tree side by side.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 55 },
      { id: "qs-l6", level: 6, name: "Challenge", description: "16 passengers, timer, bad pivots add time.", isWatchMode: false, isTimed: true, hasLeaderboard: true, baseXP: 75, timeTarget: 120 },
      { id: "qs-l7", level: 7, name: "3-Way Partition", description: "Duplicates: three lanes instead of two.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 60 },
    ],
  },

  // ─── 6. Heap Sort ───────────────────────────────────────────────────────────
  {
    slug: "heap-sort",
    name: "Heap Sort",
    description: "Build the royal hierarchy, extract the king.",
    complexity: { time: "O(n log n)", space: "O(1)" },
    theme: "Medieval Throne Room",
    library: "Phaser + D3",
    order: 6,
    category: CAT,
    hints: [
      "The most powerful member must always be at the very top.",
      "After placing someone new, check if they're stronger than their parent — if so, they should challenge up.",
      "After extracting the king, move the last member to the top and swap downward with the stronger child.",
    ],
    levels: [
      { id: "hs-l1", level: 1, name: "Watch Mode", description: "Full heapify and extraction plays automatically.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "hs-l2", level: 2, name: "Build Heap", description: "Insert members and restore heap property.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 40 },
      { id: "hs-l3", level: 3, name: "Extract Only", description: "Pre-built heap, extract and heapify down.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 45 },
      { id: "hs-l4", level: 4, name: "Full Play", description: "Both phases, 8 members.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 55 },
      { id: "hs-l5", level: 5, name: "Min Heap Variant", description: "Weakest at root — hospital triage framing.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 55 },
      { id: "hs-l6", level: 6, name: "Complexity Visual", description: "See why heapify is always O(log n).", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 55 },
      { id: "hs-l7", level: 7, name: "Challenge", description: "16 members, timer.", isWatchMode: false, isTimed: true, hasLeaderboard: true, baseXP: 75, timeTarget: 150 },
    ],
  },

  // ─── 7. Counting Sort ───────────────────────────────────────────────────────
  {
    slug: "counting-sort",
    name: "Counting Sort",
    description: "Count every ballot, output in order.",
    complexity: { time: "O(n+k)", space: "O(k)" },
    theme: "Election Ballot Counting",
    library: "Pixi.js",
    order: 7,
    category: CAT,
    hints: [
      "Each ballot belongs in the bucket that matches its number exactly.",
      "After counting, you must empty the buckets in order from 0 to 9.",
      "The key: counting sort doesn't compare values — it just tallies occurrences. That's why it's O(n+k).",
    ],
    levels: [
      { id: "cs-l1", level: 1, name: "Watch Mode", description: "Auto-counting and output.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "cs-l2", level: 2, name: "Counting Phase", description: "Sort incoming ballots into buckets.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 40 },
      { id: "cs-l3", level: 3, name: "Output Phase", description: "Pre-filled buckets, reconstruct sorted array.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 40 },
      { id: "cs-l4", level: 4, name: "Full Play", description: "Both phases, faster ballots.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 50 },
      { id: "cs-l5", level: 5, name: "Range Problem", description: "1000 candidates — see why range kills it.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 55 },
    ],
  },

  // ─── 8. Radix Sort ──────────────────────────────────────────────────────────
  {
    slug: "radix-sort",
    name: "Radix Sort",
    description: "Sort packages digit by digit, three passes.",
    complexity: { time: "O(d·n)", space: "O(n+k)" },
    theme: "Post Office",
    library: "Phaser",
    order: 8,
    category: CAT,
    hints: [
      "Look only at the highlighted digit — ignore the rest of the number.",
      "Sort ones place first, then tens, then hundreds. The order matters.",
      "Radix sort is stable — earlier digit orders are preserved by later passes. That's why least-significant-first works.",
    ],
    levels: [
      { id: "rs-l1", level: 1, name: "Watch Mode", description: "Full 3-pass sort plays automatically.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "rs-l2", level: 2, name: "Single Digit", description: "One-digit numbers, one pass.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 35 },
      { id: "rs-l3", level: 3, name: "Two Digit", description: "Two-digit numbers, two passes.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 45 },
      { id: "rs-l4", level: 4, name: "Full 3-Digit", description: "Full game with stability question.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 55 },
      { id: "rs-l5", level: 5, name: "Challenge", description: "20 packages, timer, wrong chutes cost time.", isWatchMode: false, isTimed: true, hasLeaderboard: true, baseXP: 75, timeTarget: 120 },
    ],
  },

  // ─── 9. Shell Sort ──────────────────────────────────────────────────────────
  {
    slug: "shell-sort",
    name: "Shell Sort",
    description: "Pre-sort soldiers in formation before the final drill.",
    complexity: { time: "O(n log² n)", space: "O(1)" },
    theme: "Army Drill",
    library: "Pixi.js",
    order: 9,
    category: CAT,
    hints: [
      "Compare soldiers that are far apart first, then gradually closer together.",
      "With gap 4: only compare and swap soldiers 4 positions apart. Ignore everyone in between.",
      "Shell sort reduces inversions quickly with large gaps so the final gap-1 pass (insertion sort) needs almost no work.",
    ],
    levels: [
      { id: "shs-l1", level: 1, name: "Watch Mode", description: "Full shell sort plays automatically.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "shs-l2", level: 2, name: "Gap 4", description: "Compare and swap soldiers 4 apart.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 35 },
      { id: "shs-l3", level: 3, name: "Gap 2 + 1", description: "Gaps 2 then 1.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 45 },
      { id: "shs-l4", level: 4, name: "Insight", description: "See shell sort vs insertion sort operation count.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 50 },
      { id: "shs-l5", level: 5, name: "Challenge", description: "Full sort, timer.", isWatchMode: false, isTimed: true, hasLeaderboard: true, baseXP: 75, timeTarget: 90 },
    ],
  },

  // ─── 10. Tim Sort ───────────────────────────────────────────────────────────
  {
    slug: "tim-sort",
    name: "Tim Sort",
    description: "Identify runs, then merge them on the factory line.",
    complexity: { time: "O(n log n)", space: "O(n)" },
    theme: "Factory Assembly Line",
    library: "Pixi.js + D3",
    order: 10,
    category: CAT,
    hints: [
      "A run is a section that's already in ascending order — find those first.",
      "Highlight at least 3 consecutive ascending values to form a valid run.",
      "TimSort is fast on real data because real data often has nearly-sorted sections. Find them, then merge.",
    ],
    levels: [
      { id: "ts-l1", level: 1, name: "Watch Mode", description: "Full TimSort plays automatically.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "ts-l2", level: 2, name: "Identify Runs", description: "Highlight sorted sections.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 40 },
      { id: "ts-l3", level: 3, name: "Merge Runs", description: "Pre-identified runs, you merge.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 45 },
      { id: "ts-l4", level: 4, name: "Full Play + Insight", description: "Complete game + Python/Java reveal.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 55 },
      { id: "ts-l5", level: 5, name: "Challenge", description: "Timer, must identify and merge quickly.", isWatchMode: false, isTimed: true, hasLeaderboard: true, baseXP: 75, timeTarget: 120 },
    ],
  },

  // ─── 11. Cycle Sort ─────────────────────────────────────────────────────────
  {
    slug: "cycle-sort",
    name: "Cycle Sort",
    description: "Place every item exactly where it belongs.",
    complexity: { time: "O(n²)", space: "O(1)" },
    theme: "Recycling Plant",
    library: "Matter.js",
    order: 11,
    category: CAT,
    hints: [
      "Each item has exactly one correct position on the ring — the slot that matches its number.",
      "When your item bumps something out, you must immediately deal with the displaced item.",
      "Cycle sort minimizes the total number of writes — useful when writes are expensive (flash memory).",
    ],
    levels: [
      { id: "cy-l1", level: 1, name: "Watch Mode", description: "Full cycle sort plays automatically.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "cy-l2", level: 2, name: "Simple Array", description: "5 items, find positions.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 40 },
      { id: "cy-l3", level: 3, name: "Chain Cycles", description: "8 items, multi-step cycles.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 50 },
      { id: "cy-l4", level: 4, name: "Insight", description: "Compare write counts vs bubble sort.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 50 },
      { id: "cy-l5", level: 5, name: "Challenge", description: "10 items, timer.", isWatchMode: false, isTimed: true, hasLeaderboard: true, baseXP: 75, timeTarget: 90 },
    ],
  },

  // ─── 12. Bucket Sort ────────────────────────────────────────────────────────
  {
    slug: "bucket-sort",
    name: "Bucket Sort",
    description: "Toss balls into buckets, then sort within each.",
    complexity: { time: "O(n+k) avg / O(n²) worst", space: "O(n+k)" },
    theme: "Carnival Ring Toss",
    library: "Phaser",
    order: 12,
    category: CAT,
    hints: [
      "The bucket number is determined by the value's range — 0.0-0.1 goes in bucket 0, 0.1-0.2 in bucket 1.",
      "After all balls are in buckets, each bucket needs to be sorted internally before collecting.",
      "Bucket sort is fast when values are uniformly distributed. All values in one bucket = O(n²) worst case.",
    ],
    levels: [
      { id: "bk-l1", level: 1, name: "Watch Mode", description: "Full bucket sort plays automatically.", isWatchMode: true, isTimed: false, hasLeaderboard: false, baseXP: 30 },
      { id: "bk-l2", level: 2, name: "Distribution", description: "Toss balls into correct buckets.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 40 },
      { id: "bk-l3", level: 3, name: "Within-Bucket Sort", description: "Pre-distributed, sort within each bucket.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 45 },
      { id: "bk-l4", level: 4, name: "Insight", description: "Uniform vs skewed distribution comparison.", isWatchMode: false, isTimed: false, hasLeaderboard: false, baseXP: 50 },
      { id: "bk-l5", level: 5, name: "Challenge", description: "20 balls, timer, wrong buckets cost time.", isWatchMode: false, isTimed: true, hasLeaderboard: true, baseXP: 75, timeTarget: 90 },
    ],
  },
];

export function getModuleConfig(slug: string): SortModuleConfig | undefined {
  return SORT_MODULES.find((m) => m.slug === slug);
}

export function getNextModule(slug: string): SortModuleConfig | undefined {
  const current = SORT_MODULES.find((m) => m.slug === slug);
  if (!current) return undefined;
  return SORT_MODULES.find((m) => m.order === current.order + 1);
}

export function isModuleUnlocked(slug: string, completedSlugs: string[]): boolean {
  const config = getModuleConfig(slug);
  if (!config) return false;
  // First 3 always unlocked
  if (config.order <= 3) return true;
  // Otherwise need previous module completed
  const prev = SORT_MODULES.find((m) => m.order === config.order - 1);
  if (!prev) return true;
  return completedSlugs.includes(prev.slug);
}
