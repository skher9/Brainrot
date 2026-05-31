export type BroadcastMode =
  | "freq_match"      // find all anagram windows (L1)
  | "freq_contain"    // find windows containing target pattern (L2)
  | "first_anagram"   // find first anagram position (L3)
  | "count_anagrams"  // count all distinct anagram positions (L4)
  | "freq_threshold"  // find windows where dominant freq >= k (L5)
  | "freq_balance"    // find longest balanced window (equal 0s and 1s) (L6)
  | "freq_k_replace"  // find all windows with max k replacements possible (L7)
  | "boss";           // 4 simultaneous frequency challenges (L8)

export interface BroadcastLevel {
  level: number;
  channelTitle: string;
  storyBeat: string;
  ahaTitle: string;
  ahaBody: string;
  xpBase: number;
  mode: BroadcastMode;
  source: string;
  pattern: string;
  threshold?: number;
  optimalSteps: number;
}

export const BROADCAST_LEVELS: BroadcastLevel[] = [
  {
    level: 1,
    channelTitle: "Signal Match",
    storyBeat: "Source channel plays a long sequence. Find every window that matches the target frequency pattern.",
    ahaTitle: "Find All Anagrams — Sliding Frequency Map",
    ahaBody: "Build frequency map of pattern. Slide window of same size over source. Add new char, remove old char, compare maps in O(26) — treated as O(1). Each step is O(1). Total O(n). LC 438.",
    xpBase: 50,
    mode: "freq_match",
    source: "cbaebabacd",
    pattern: "abc",
    optimalSteps: 8,
  },
  {
    level: 2,
    channelTitle: "Signal Contains",
    storyBeat: "Find windows that contain all letters of the pattern (but may have extras).",
    ahaTitle: "Contains vs Equals — Different Count Check",
    ahaBody: "Contains: window frequency of each pattern char ≥ required. Equals (anagram): window frequency exactly matches. One comparison change, completely different problem. Both O(n) with sliding frequency map.",
    xpBase: 60,
    mode: "freq_contain",
    source: "ADOBECODEBANC",
    pattern: "ABC",
    optimalSteps: 13,
  },
  {
    level: 3,
    channelTitle: "First Lock",
    storyBeat: "Find the position of the FIRST anagram in the source. No false positives.",
    ahaTitle: "Frequency Comparison in O(1)",
    ahaBody: "Instead of comparing two full maps each step, track a 'matches' counter: matches when both frequencies equal. Increment/decrement as the window slides. When matches === pattern.length, you found an anagram. O(n) total, O(26) space.",
    xpBase: 65,
    mode: "first_anagram",
    source: "eidbaooo",
    pattern: "ab",
    optimalSteps: 6,
  },
  {
    level: 4,
    channelTitle: "Frequency Count",
    storyBeat: "Count total anagram windows. Report the number found.",
    ahaTitle: "Sliding Window Counting",
    ahaBody: "Same anagram detection with a counter. Each valid window increments count. Total windows checked = n - p + 1. This pattern scales: O(n) for any 'count subarrays matching pattern X'.",
    xpBase: 70,
    mode: "count_anagrams",
    source: "abab",
    pattern: "ab",
    optimalSteps: 3,
  },
  {
    level: 5,
    channelTitle: "Dominant Channel",
    storyBeat: "Find windows where the most frequent character appears at least 3 times.",
    ahaTitle: "Max Frequency in Sliding Window",
    ahaBody: "Track frequency map and max-frequency as window slides. On char add: update freq, check if new max. On char remove: decrement, recalculate max if needed. O(n·k) worst case, but typically O(n) with lazy max.",
    xpBase: 80,
    mode: "freq_threshold",
    source: "aaabbbcccaaa",
    pattern: "a",
    threshold: 3,
    optimalSteps: 10,
  },
  {
    level: 6,
    channelTitle: "Balance Scan",
    storyBeat: "Find the longest window with equal 0s and 1s in the binary broadcast.",
    ahaTitle: "Longest Balanced Subarray — Prefix Sum Trick",
    ahaBody: "Replace 0 with -1. Now 'equal 0s and 1s' becomes 'subarray sum = 0'. Track prefix sums: first occurrence of each prefix sum in a hashmap. Longest balanced = max(i - firstSeen[prefixSum]). O(n).",
    xpBase: 90,
    mode: "freq_balance",
    source: "01010101001011",
    pattern: "01",
    optimalSteps: 14,
  },
  {
    level: 7,
    channelTitle: "Replace Broadcast",
    storyBeat: "Find all windows that become uniform with at most 2 character replacements.",
    ahaTitle: "Frequency + Replacement — LC 424 Pattern",
    ahaBody: "Window is replaceable if (window_size - maxFreq) ≤ k. Slide window: update freq and maxFreq. Check validity each step. Count valid windows. Combines frequency tracking with the replacement bound.",
    xpBase: 90,
    mode: "freq_k_replace",
    source: "AABABBA",
    pattern: "A",
    threshold: 2,
    optimalSteps: 7,
  },
  {
    level: 8,
    channelTitle: "District Override",
    storyBeat: "Four broadcast districts. Four frequency challenges. Override them all.",
    ahaTitle: "Frequency Window: The Swiss Army Knife",
    ahaBody: "Anagram detection, min window substring, max frequency, balance checking, replacement bounds — all use sliding frequency maps. The same Map + slide + check structure handles every frequency-based window problem. Build this once, use forever.",
    xpBase: 130,
    mode: "boss",
    source: "cbaebabacd",
    pattern: "abc",
    optimalSteps: 32,
  },
];
