export interface BSProblem {
  index: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  free: boolean;
  leetcodeRef: string | null;
  insight: string;
  insightTitle: string;
  mechanic: string;
}

export const BS_PROBLEMS: BSProblem[] = [
  {
    index: 1,
    title: "Find the Song",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "704",
    insightTitle: "Classic Binary Search",
    insight:
      "Every click picked the midpoint of the remaining range. That's binary search: each step eliminates half. To search 1,000,000 records, you need at most 20 clicks — not 1,000,000.",
    mechanic: "pointer_trace",
  },
  {
    index: 2,
    title: "The Contaminated Batch",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "35",
    insightTitle: "Find First True",
    insight:
      "You were searching for the first position where contamination is TRUE. Binary search on a yes/no predicate finds the boundary in O(log n), no matter how large the factory.",
    mechanic: "resource_constraint",
  },
  {
    index: 3,
    title: "The Waiting List",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "34",
    insightTitle: "Insertion Point",
    insight:
      "The drag target was always the leftmost position where the VIP name belongs. Lower bound binary search: find where arr[mid] >= target first flips true. One pass, O(log n).",
    mechanic: "drag_insert",
  },
  {
    index: 4,
    title: "The Summit Seeker",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "1011",
    insightTitle: "Binary Search on Answer",
    insight:
      "You searched the answer space, not an array. 'Can the drone do it in X battery?' is a monotone predicate — false below threshold, true above. Binary search finds the minimum X.",
    mechanic: "resource_constraint",
  },
  {
    index: 5,
    title: "The Glitched Vault",
    difficulty: "Medium",
    free: false,
    leetcodeRef: "33",
    insightTitle: "Rotated Array Search",
    insight:
      "The rotation creates two sorted halves. At any midpoint, one half is always sorted — compare mid with the bounds to know which half, then binary search that half. Still O(log n).",
    mechanic: "pointer_trace",
  },
  {
    index: 6,
    title: "The Delivery Driver",
    difficulty: "Medium",
    free: false,
    leetcodeRef: "875",
    insightTitle: "Binary Search on Answer (Min Speed)",
    insight:
      "Minimum viable speed is a classic binary search on answer. 'Can I finish all deliveries at speed X?' flips from false to true exactly once. Search [1, max_distance] for that flip point.",
    mechanic: "simulation_guess",
  },
  {
    index: 7,
    title: "The Cargo Ship",
    difficulty: "Hard",
    free: false,
    leetcodeRef: "1011",
    insightTitle: "Binary Search on Capacity",
    insight:
      "Ship capacity search: binary search [max_item, sum_all_items]. 'Can we ship in D days at capacity C?' is monotone — true once C crosses the threshold. That threshold is your answer.",
    mechanic: "simulation_guess",
  },
  {
    index: 8,
    title: "The Two Archives",
    difficulty: "Hard",
    free: false,
    leetcodeRef: "4",
    insightTitle: "Median of Two Sorted Arrays",
    insight:
      "Partitioning both arrays at the right split point makes every left-side element ≤ every right-side element. Binary search on the partition of the smaller array. O(log(min(m,n))).",
    mechanic: "partition_game",
  },
];
