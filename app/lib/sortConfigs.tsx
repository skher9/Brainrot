import React from "react";
import {
  SortStep,
  generateSelectionSortSteps,
  generateInsertionSortSteps,
  generateMergeSortSteps,
  generateQuickSortSteps,
} from "@/lib/sortSteps";

export interface PseudocodeLine {
  n: number;
  active: (step: SortStep) => boolean;
  indent?: number;
  text: React.ReactNode;
}

export interface TelemetrySpec {
  label: string;
  getValue: (step: SortStep) => string | number;
  accent: string;
}

export interface SortConfig {
  slug: string;
  algoLabel: string;
  title: string;
  subtitle: string;
  estimatedTime: string;
  reward: string;
  coachWhisper: string;
  topicSlug: string;
  xpAmount: number;
  initialArray: number[];
  generateSteps: (arr: number[]) => SortStep[];
  comboTriggers: string[];
  nextSlug: string | null;
  pseudocode: PseudocodeLine[];
  telemetry: TelemetrySpec[];
}

function Tk({ c, children }: { c: "violet" | "gold" | "green" | "cyan"; children: React.ReactNode }) {
  const colors = { violet: "#a78bfa", gold: "#f6c453", green: "#6ee7b7", cyan: "#67e8f9" };
  return <span style={{ color: colors[c] }}>{children}</span>;
}

export const SORT_CONFIGS: Record<string, SortConfig> = {
  "selection-sort": {
    slug: "selection-sort",
    algoLabel: "SELECTION SORT",
    title: "Find the minimum. Every time.",
    subtitle:
      "Selection sort scans the entire unsorted portion to find the minimum, then swaps it to the front. O(n²) comparisons, O(n) swaps — inefficient but conceptually clean.",
    estimatedTime: "8 MIN",
    reward: "+75 XP",
    coachWhisper:
      "Notice how comparisons grow as you get fewer swaps. Selection sort always makes exactly n−1 swaps regardless of input order.",
    topicSlug: "selection-sort",
    xpAmount: 75,
    initialArray: [5, 3, 8, 1, 9, 2, 6],
    generateSteps: generateSelectionSortSteps,
    comboTriggers: ["new-min"],
    nextSlug: "insertion-sort",
    pseudocode: [
      {
        n: 1,
        active: (s) => ["initial", "scan-start", "placed"].includes(s.type),
        text: <><Tk c="violet">for</Tk> i = 0 .. n−1</>,
      },
      {
        n: 2,
        active: (s) => s.type === "scan-start",
        indent: 1,
        text: <>minIdx = i</>,
      },
      {
        n: 3,
        active: (s) => ["compare", "new-min"].includes(s.type),
        indent: 1,
        text: <><Tk c="violet">for</Tk> j = i+1 .. n</>,
      },
      {
        n: 4,
        active: (s) => ["compare", "new-min"].includes(s.type),
        indent: 2,
        text: <><Tk c="gold">if</Tk> a[j] <Tk c="gold">{"<"}</Tk> a[minIdx]</>,
      },
      {
        n: 5,
        active: (s) => s.type === "new-min",
        indent: 3,
        text: <>minIdx = j</>,
      },
      {
        n: 6,
        active: (s) => ["swap", "no-swap"].includes(s.type),
        indent: 1,
        text: <>swap(a[i], a[minIdx])</>,
      },
      {
        n: 7,
        active: (s) => s.type === "done",
        text: <><Tk c="green">return</Tk> a</>,
      },
    ],
    telemetry: [
      { label: "Comparisons", getValue: (s) => s.meta.comparisons, accent: "#a78bfa" },
      { label: "Swaps", getValue: (s) => s.meta.swaps, accent: "#fb7185" },
      { label: "Pass", getValue: (s) => s.meta.pass ?? 0, accent: "#f6c453" },
    ],
  },

  "insertion-sort": {
    slug: "insertion-sort",
    algoLabel: "INSERTION SORT",
    title: "Slide left until it fits.",
    subtitle:
      "Insertion sort grows a sorted left portion one element at a time — picking each element and inserting it into its correct position. O(n²) worst case, but O(n) on nearly-sorted data.",
    estimatedTime: "8 MIN",
    reward: "+75 XP",
    coachWhisper:
      "Insertion sort is adaptive — it does almost no work on a sorted input. Watch how the sorted boundary (green) grows left-to-right step by step.",
    topicSlug: "insertion-sort",
    xpAmount: 75,
    initialArray: [7, 3, 9, 1, 5, 8, 2],
    generateSteps: generateInsertionSortSteps,
    comboTriggers: ["shift"],
    nextSlug: "merge-sort",
    pseudocode: [
      {
        n: 1,
        active: (s) => ["initial", "pick"].includes(s.type),
        text: <><Tk c="violet">for</Tk> i = 1 .. n</>,
      },
      {
        n: 2,
        active: (s) => s.type === "pick",
        indent: 1,
        text: <>key = a[i]</>,
      },
      {
        n: 3,
        active: (s) => s.type === "pick",
        indent: 1,
        text: <>j = i − 1</>,
      },
      {
        n: 4,
        active: (s) => ["compare", "shift"].includes(s.type),
        indent: 1,
        text: <><Tk c="violet">while</Tk> j ≥ 0 <Tk c="gold">and</Tk> a[j] <Tk c="gold">{">"}</Tk> key</>,
      },
      {
        n: 5,
        active: (s) => s.type === "shift",
        indent: 2,
        text: <>a[j+1] = a[j]</>,
      },
      {
        n: 6,
        active: (s) => s.type === "shift",
        indent: 2,
        text: <>j−−</>,
      },
      {
        n: 7,
        active: (s) => s.type === "insert",
        indent: 1,
        text: <>a[j+1] = key</>,
      },
      {
        n: 8,
        active: (s) => s.type === "done",
        text: <><Tk c="green">return</Tk> a</>,
      },
    ],
    telemetry: [
      { label: "Comparisons", getValue: (s) => s.meta.comparisons, accent: "#a78bfa" },
      { label: "Shifts", getValue: (s) => s.meta.shifts, accent: "#fb7185" },
      {
        label: "Sorted boundary",
        getValue: (s) => s.meta.sortedBoundary ?? 0,
        accent: "#6ee7b7",
      },
    ],
  },

  "merge-sort": {
    slug: "merge-sort",
    algoLabel: "MERGE SORT",
    title: "Divide. Conquer. Merge.",
    subtitle:
      "Merge sort recursively splits the array in half until each part has one element, then merges sorted halves back with a two-pointer comparison. O(n log n) guaranteed.",
    estimatedTime: "10 MIN",
    reward: "+100 XP",
    coachWhisper:
      "Watch cyan (left) and violet (right) pointers walk toward each other during each merge. The smaller value always wins. After every merge, that range turns green.",
    topicSlug: "merge-sort",
    xpAmount: 100,
    initialArray: [5, 2, 8, 3, 9, 1],
    generateSteps: generateMergeSortSteps,
    comboTriggers: ["merge-place"],
    nextSlug: "quick-sort",
    pseudocode: [
      {
        n: 1,
        active: (s) => ["initial", "split"].includes(s.type),
        text: <>mergeSort(arr, l, r):</>,
      },
      {
        n: 2,
        active: (s) => s.type === "split",
        indent: 1,
        text: <><Tk c="gold">if</Tk> l ≥ r: <Tk c="green">return</Tk></>,
      },
      {
        n: 3,
        active: (s) => s.type === "split",
        indent: 1,
        text: <>mid = (l+r) / 2</>,
      },
      {
        n: 4,
        active: (s) => s.type === "split",
        indent: 1,
        text: <>mergeSort(l, mid)</>,
      },
      {
        n: 5,
        active: (s) => s.type === "split",
        indent: 1,
        text: <>mergeSort(mid+1, r)</>,
      },
      {
        n: 6,
        active: (s) => ["merge-start", "merge-compare", "merge-place", "merge-done"].includes(s.type),
        indent: 1,
        text: <>merge(l, mid, r):</>,
      },
      {
        n: 7,
        active: (s) => s.type === "merge-compare",
        indent: 2,
        text: <>take min(left[i], right[j])</>,
      },
      {
        n: 8,
        active: (s) => s.type === "merge-place",
        indent: 2,
        text: <>place → arr[k++]</>,
      },
      {
        n: 9,
        active: (s) => s.type === "done",
        text: <><Tk c="green">return</Tk> arr</>,
      },
    ],
    telemetry: [
      { label: "Comparisons", getValue: (s) => s.meta.comparisons, accent: "#a78bfa" },
      { label: "Placements", getValue: (s) => s.meta.merges, accent: "#67e8f9" },
      { label: "Merge depth", getValue: (s) => s.meta.depth ?? 0, accent: "#f6c453" },
    ],
  },

  "quick-sort": {
    slug: "quick-sort",
    algoLabel: "QUICK SORT",
    title: "Pick a pivot. Split everything.",
    subtitle:
      "Quick sort picks a pivot, partitions elements around it, then recurses on both halves. O(n log n) average, O(n²) worst case — but fast in practice due to cache efficiency.",
    estimatedTime: "10 MIN",
    reward: "+100 XP",
    coachWhisper:
      "The pivot (rose) always lands in its final sorted position after partitioning. After that, the array to its left and right need the same treatment recursively.",
    topicSlug: "quick-sort",
    xpAmount: 100,
    initialArray: [3, 7, 1, 9, 4, 8, 2],
    generateSteps: generateQuickSortSteps,
    comboTriggers: ["swap"],
    nextSlug: null,
    pseudocode: [
      {
        n: 1,
        active: (s) => s.type === "initial",
        text: <>quickSort(arr, l, r):</>,
      },
      {
        n: 2,
        active: (s) => s.type === "pivot",
        indent: 1,
        text: <>pivot = arr[r]</>,
      },
      {
        n: 3,
        active: (s) => s.type === "pivot",
        indent: 1,
        text: <>i = l − 1</>,
      },
      {
        n: 4,
        active: (s) => ["compare", "swap"].includes(s.type),
        indent: 1,
        text: <><Tk c="violet">for</Tk> j = l .. r−1</>,
      },
      {
        n: 5,
        active: (s) => ["compare", "swap"].includes(s.type),
        indent: 2,
        text: <><Tk c="gold">if</Tk> arr[j] ≤ pivot</>,
      },
      {
        n: 6,
        active: (s) => s.type === "swap",
        indent: 3,
        text: <>i++; swap(arr[i], arr[j])</>,
      },
      {
        n: 7,
        active: (s) => s.type === "place-pivot",
        indent: 1,
        text: <>swap(arr[i+1], arr[r])</>,
      },
      {
        n: 8,
        active: (s) => ["base-case", "place-pivot", "pivot"].includes(s.type),
        indent: 1,
        text: <>recurse left, right</>,
      },
      {
        n: 9,
        active: (s) => s.type === "done",
        text: <><Tk c="green">return</Tk> arr</>,
      },
    ],
    telemetry: [
      { label: "Comparisons", getValue: (s) => s.meta.comparisons, accent: "#a78bfa" },
      { label: "Swaps", getValue: (s) => s.meta.swaps, accent: "#fb7185" },
      { label: "Pivots placed", getValue: (s) => s.meta.pivots, accent: "#6ee7b7" },
    ],
  },
};
