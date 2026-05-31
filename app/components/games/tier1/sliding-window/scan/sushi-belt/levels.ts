export type BeltMode =
  | "no_repeat"    // longest substring without repeating chars (L1)
  | "two_types"    // at most 2 distinct types (L2)
  | "k_types"      // at most k distinct types (L3)
  | "all_ones"     // max consecutive ones with k flips (L4)
  | "min_cover"    // min window containing all required types (L5)
  | "k_replace"    // longest after replacing k chars (L6)
  | "no_repeat2"   // no repeat, with forced shrink teaching (L7)
  | "boss";        // 4 simultaneous belt challenges (L8)

export interface BeltLevel {
  level: number;
  orderTitle: string;
  storyBeat: string;
  ahaTitle: string;
  ahaBody: string;
  xpBase: number;
  mode: BeltMode;
  belt: string;         // the character sequence
  maxTypes?: number;    // for k_types, two_types
  flips?: number;       // for all_ones, k_replace
  required?: string;    // for min_cover (chars that must all appear)
  optimalMoves: number;
}

export const BELT_LEVELS: BeltLevel[] = [
  {
    level: 1,
    orderTitle: "No Repeats, Please",
    storyBeat: "Belt brings sushi pieces by type. Take the longest streak without a repeat.",
    ahaTitle: "Expand Right, Shrink Left on Duplicate",
    ahaBody: "Use a Set. Expand R freely. When arr[R] is already in Set: shrink L until the duplicate is removed. Window size = R - L + 1. Track max. One pass, O(n).",
    xpBase: 45,
    mode: "no_repeat",
    belt: "abcabcbb",
    optimalMoves: 8,
  },
  {
    level: 2,
    orderTitle: "Two Types Only",
    storyBeat: "Strict kitchen — max 2 sushi types in your tray at once. Longest run.",
    ahaTitle: "At Most 2 Distinct — Variable Window",
    ahaBody: "Use a frequency map. Expand R, add to map. When map.size > 2: shrink L, decrement count, delete from map if zero. This is the Fruit Basket problem (LC 904) in disguise.",
    xpBase: 60,
    mode: "two_types",
    belt: "eceba",
    maxTypes: 2,
    optimalMoves: 5,
  },
  {
    level: 3,
    orderTitle: "K-Type Window",
    storyBeat: "Chef allows k=3 types. Find the maximum serving size.",
    ahaTitle: "Generalized: At Most K Distinct",
    ahaBody: "Same frequency-map pattern with `maxTypes = k`. This single function handles k=1, k=2, k=anything. Max subarray with at most k distinct characters — O(n), handles all k.",
    xpBase: 70,
    mode: "k_types",
    belt: "aabacbebebe",
    maxTypes: 3,
    optimalMoves: 11,
  },
  {
    level: 4,
    orderTitle: "Flip the Empty Plate",
    storyBeat: "Empty plates (0s) block the belt. You can re-label up to 2 empty plates. Max filled stretch.",
    ahaTitle: "Max Consecutive Ones — Variable Window",
    ahaBody: "Track zerosInWindow. Expand R: if arr[R]=0, increment zeros. If zeros > k: shrink L until zeros ≤ k. This is LC 1004 Max Consecutive Ones III. Variable window, O(n).",
    xpBase: 80,
    mode: "all_ones",
    belt: "11011010011",
    flips: 2,
    optimalMoves: 11,
  },
  {
    level: 5,
    orderTitle: "Collect Them All",
    storyBeat: "Chef needs one of each: A, B, C. Find the shortest belt section containing all three.",
    ahaTitle: "Minimum Window Substring",
    ahaBody: "Two-pointer contract: expand R until all required chars present. Then shrink L as much as possible while still valid. Record minimum valid window each time. O(n) total across all expand/shrink steps. LC 76.",
    xpBase: 95,
    mode: "min_cover",
    belt: "ADOBECODEBANC",
    required: "ABC",
    optimalMoves: 13,
  },
  {
    level: 6,
    orderTitle: "Relabel the Plates",
    storyBeat: "You can change up to 2 plate labels. Find the longest uniform stretch.",
    ahaTitle: "Longest Repeating Character Replacement",
    ahaBody: "Window is valid if (window_size - maxFreq) ≤ k. MaxFreq: most frequent char in window. The key insight: maxFreq never decreases — window only grows or stays same size. O(n), LC 424.",
    xpBase: 90,
    mode: "k_replace",
    belt: "AABABBA",
    flips: 2,
    optimalMoves: 7,
  },
  {
    level: 7,
    orderTitle: "The Long Rush",
    storyBeat: "Peak hour. Longest unique streak on a busy belt. No shortcuts.",
    ahaTitle: "Why Set is O(n), Not O(n²)",
    ahaBody: "Each element is added to Set once (right pointer advance) and removed at most once (left pointer advance). Total operations ≤ 2n = O(n). The shrink loop doesn't restart from scratch — L only moves forward. Amortized O(1) per element.",
    xpBase: 95,
    mode: "no_repeat2",
    belt: "pwwkewpwke",
    optimalMoves: 10,
  },
  {
    level: 8,
    orderTitle: "The Full Shift",
    storyBeat: "Four belt lines, four active problems. Clear all four before the shift ends.",
    ahaTitle: "Variable Window: One Pattern, Many Problems",
    ahaBody: "Longest no-repeat, at-most-k-distinct, max-ones-with-flips, min-window-cover — all use expand-right + shrink-left + track-condition. The only difference is the validity check. Master this loop structure and you own 15+ LeetCode mediums.",
    xpBase: 130,
    mode: "boss",
    belt: "abcabcbb",
    optimalMoves: 32,
  },
];
