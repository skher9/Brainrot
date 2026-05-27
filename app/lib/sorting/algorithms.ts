// Pure validation functions — given current state, return correct next move.
// Games compare user action against these; never hardcode sequences.

// ─── Bubble Sort ──────────────────────────────────────────────────────────────

export interface BubbleMove {
  i: number;
  j: number;
  shouldSwap: boolean;
}

export function bubbleNextMove(arr: number[], pass: number, pos: number): BubbleMove | null {
  const n = arr.length;
  if (pass >= n - 1) return null;
  if (pos >= n - 1 - pass) return null;
  return { i: pos, j: pos + 1, shouldSwap: arr[pos] > arr[pos + 1] };
}

// ─── Selection Sort ───────────────────────────────────────────────────────────

/** Returns index of the minimum value in arr[start..end] */
export function selectionMinIndex(arr: number[], start: number): number {
  let minIdx = start;
  for (let i = start + 1; i < arr.length; i++) {
    if (arr[i] < arr[minIdx]) minIdx = i;
  }
  return minIdx;
}

export function selectionIsCorrectShot(arr: number[], start: number, shotIdx: number): boolean {
  return selectionMinIndex(arr, start) === shotIdx;
}

// ─── Insertion Sort ───────────────────────────────────────────────────────────

/**
 * Given sorted prefix and new value, returns correct insertion index (0-based).
 * sorted is already-placed values in ascending order.
 */
export function insertionCorrectGap(sorted: number[], value: number): number {
  let i = 0;
  while (i < sorted.length && sorted[i] <= value) i++;
  return i;
}

// ─── Merge Sort ───────────────────────────────────────────────────────────────

export interface MergeSplitResult {
  left: number[];
  right: number[];
  isEven: boolean;
}

export function mergeSplit(arr: number[]): MergeSplitResult {
  const mid = Math.floor(arr.length / 2);
  return {
    left: arr.slice(0, mid),
    right: arr.slice(mid),
    isEven: arr.length % 2 === 0 || arr.length === 1,
  };
}

/**
 * Given two sorted arrays, returns the correct next element to pick
 * (index 0 = left side, 1 = right side).
 */
export function mergeNextSide(left: number[], right: number[], li: number, ri: number): 0 | 1 | null {
  if (li >= left.length && ri >= right.length) return null;
  if (li >= left.length) return 1;
  if (ri >= right.length) return 0;
  return left[li] <= right[ri] ? 0 : 1;
}

// ─── Quick Sort ───────────────────────────────────────────────────────────────

export function quickCorrectPartition(arr: number[], pivotVal: number): { less: number[]; greater: number[] } {
  const less = arr.filter((v) => v < pivotVal);
  const greater = arr.filter((v) => v > pivotVal);
  return { less, greater };
}

export function quickPassengerLane(passengerVal: number, pivotVal: number): "left" | "right" {
  return passengerVal < pivotVal ? "left" : "right";
}

/** Returns best pivot index (closest to median) */
export function quickBestPivot(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return arr.indexOf(median);
}

export function quickWorstCase(arr: number[], pivotIdx: number): boolean {
  return pivotIdx === 0 || pivotIdx === arr.length - 1;
}

// ─── Heap Sort ────────────────────────────────────────────────────────────────

export function heapParent(i: number): number { return Math.floor((i - 1) / 2); }
export function heapLeft(i: number): number { return 2 * i + 1; }
export function heapRight(i: number): number { return 2 * i + 2; }

export function heapViolatesMaxProperty(arr: number[], i: number): boolean {
  const l = heapLeft(i);
  const r = heapRight(i);
  if (l < arr.length && arr[l] > arr[i]) return true;
  if (r < arr.length && arr[r] > arr[i]) return true;
  return false;
}

/** Returns index child should bubble up to (parent), or null if no violation */
export function heapBubbleUpTarget(arr: number[], childIdx: number): number | null {
  if (childIdx === 0) return null;
  const p = heapParent(childIdx);
  return arr[childIdx] > arr[p] ? p : null;
}

/** Returns which child to swap down to (larger child), or null if heap ok */
export function heapSiftDownTarget(arr: number[], parentIdx: number, heapSize: number): number | null {
  const l = heapLeft(parentIdx);
  const r = heapRight(parentIdx);
  let largest = parentIdx;
  if (l < heapSize && arr[l] > arr[largest]) largest = l;
  if (r < heapSize && arr[r] > arr[largest]) largest = r;
  return largest === parentIdx ? null : largest;
}

// ─── Counting Sort ────────────────────────────────────────────────────────────

export function countingCorrectBucket(value: number): number {
  return value; // bucket index equals value (0-9 range)
}

export function countingOutputOrder(counts: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < counts.length; i++) {
    for (let j = 0; j < counts[i]; j++) result.push(i);
  }
  return result;
}

// ─── Radix Sort ───────────────────────────────────────────────────────────────

export function radixGetDigit(value: number, pass: number): number {
  // pass 0 = ones, 1 = tens, 2 = hundreds
  return Math.floor(value / Math.pow(10, pass)) % 10;
}

export function radixCorrectChute(value: number, pass: number): number {
  return radixGetDigit(value, pass);
}

export function radixCollectOrder(chutes: number[][]): number[] {
  return chutes.flat();
}

// ─── Shell Sort ───────────────────────────────────────────────────────────────

export const SHELL_GAPS = [4, 2, 1];

export function shellShouldSwap(arr: number[], i: number, gap: number): boolean {
  return i + gap < arr.length && arr[i] > arr[i + gap];
}

export function shellNextPair(arr: number[], gap: number, startPos: number): { i: number; j: number } | null {
  for (let i = startPos; i + gap < arr.length; i++) {
    return { i, j: i + gap };
  }
  return null;
}

// ─── Tim Sort ─────────────────────────────────────────────────────────────────

export const TIM_MIN_RUN = 3;

export function timIsRun(arr: number[], start: number, end: number): boolean {
  if (end - start < TIM_MIN_RUN - 1) return false;
  for (let i = start; i < end; i++) {
    if (arr[i] > arr[i + 1]) return false;
  }
  return true;
}

export function timFindRuns(arr: number[]): Array<{ start: number; end: number }> {
  const runs: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < arr.length) {
    let j = i + 1;
    while (j < arr.length && arr[j] >= arr[j - 1]) j++;
    if (j - i >= TIM_MIN_RUN) runs.push({ start: i, end: j - 1 });
    i = j;
  }
  return runs;
}

// ─── Cycle Sort ───────────────────────────────────────────────────────────────

/** Returns correct position for value in the array */
export function cycleCorrectPosition(arr: number[], value: number): number {
  let pos = 0;
  for (const v of arr) {
    if (v < value) pos++;
  }
  return pos;
}

export function cycleIsSorted(arr: number[]): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) return false;
  }
  return true;
}

// ─── Bucket Sort ─────────────────────────────────────────────────────────────

export function bucketIndex(value: number, numBuckets: number, min: number, max: number): number {
  if (value === max) return numBuckets - 1;
  return Math.floor(((value - min) / (max - min)) * numBuckets);
}

export function bucketCorrectBucket(value: number, numBuckets = 10): number {
  // values in [0, 1)
  return Math.min(numBuckets - 1, Math.floor(value * numBuckets));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isSorted(arr: number[]): boolean {
  for (let i = 1; i < arr.length; i++) if (arr[i] < arr[i - 1]) return false;
  return true;
}

export function countOptimalBubble(arr: number[]): number {
  let count = 0;
  const a = [...arr];
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < a.length - 1 - i; j++) {
      count++;
      if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; }
    }
  }
  return count;
}

export function countOptimalSelection(n: number): number { return n - 1; }
export function countOptimalInsertion(arr: number[]): number {
  let count = 0;
  const a = [...arr];
  for (let i = 1; i < a.length; i++) {
    let j = i;
    while (j > 0 && a[j - 1] > a[j]) { [a[j - 1], a[j]] = [a[j], a[j - 1]]; j--; count++; }
    if (j !== i) count++;
  }
  return count;
}
