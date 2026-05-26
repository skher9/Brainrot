export type HighlightRole =
  | "comparing"
  | "pivot"
  | "sorted"
  | "minimum"
  | "inserting"
  | "shifting"
  | "left-ptr"
  | "right-ptr"
  | "in-range"
  | "placed";

export interface SortStep {
  array: number[];
  description: string;
  type: string;
  highlights: Partial<Record<number, HighlightRole>>;
  sortedIndices: number[];
  meta: Record<string, number>;
}

// ── Selection Sort ─────────────────────────────────────────────────────────
export function generateSelectionSortSteps(input: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const arr = [...input];
  const n = arr.length;
  const sorted: number[] = [];
  let comparisons = 0;
  let swaps = 0;

  steps.push({
    array: [...arr],
    type: "initial",
    description:
      "Here's the unsorted array. Selection sort scans for the minimum of each unsorted portion and moves it to the front — one pass per element.",
    highlights: {},
    sortedIndices: [],
    meta: { comparisons, swaps },
  });

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;

    steps.push({
      array: [...arr],
      type: "scan-start",
      description: `Pass ${i + 1}: scanning from index ${i}. Current minimum candidate is ${arr[i]} at index ${i}.`,
      highlights: { [i]: "minimum" },
      sortedIndices: [...sorted],
      meta: { comparisons, swaps, pass: i + 1 },
    });

    for (let j = i + 1; j < n; j++) {
      comparisons++;
      if (arr[j] < arr[minIdx]) {
        steps.push({
          array: [...arr],
          type: "new-min",
          description: `${arr[j]} < ${arr[minIdx]} — new minimum found at index ${j}. Update candidate.`,
          highlights: { [j]: "minimum", [minIdx]: "comparing" },
          sortedIndices: [...sorted],
          meta: { comparisons, swaps, pass: i + 1 },
        });
        minIdx = j;
      } else {
        steps.push({
          array: [...arr],
          type: "compare",
          description: `${arr[j]} ≥ ${arr[minIdx]} — not smaller than current minimum. Keep scanning.`,
          highlights: { [j]: "comparing", [minIdx]: "minimum" },
          sortedIndices: [...sorted],
          meta: { comparisons, swaps, pass: i + 1 },
        });
      }
    }

    if (minIdx !== i) {
      swaps++;
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      steps.push({
        array: [...arr],
        type: "swap",
        description: `Minimum of remaining array is ${arr[i]}. Swap it to index ${i}.`,
        highlights: { [i]: "placed", [minIdx]: "comparing" },
        sortedIndices: [...sorted],
        meta: { comparisons, swaps, pass: i + 1 },
      });
    } else {
      steps.push({
        array: [...arr],
        type: "no-swap",
        description: `${arr[i]} is already the minimum and already in position ${i}. No swap needed.`,
        highlights: { [i]: "placed" },
        sortedIndices: [...sorted],
        meta: { comparisons, swaps, pass: i + 1 },
      });
    }

    sorted.push(i);
    steps.push({
      array: [...arr],
      type: "placed",
      description: `${arr[i]} locked in at index ${i}. Sorted portion grows to ${sorted.length} element${sorted.length > 1 ? "s" : ""}.`,
      highlights: { [i]: "sorted" },
      sortedIndices: [...sorted],
      meta: { comparisons, swaps, pass: i + 1 },
    });
  }

  sorted.push(n - 1);
  steps.push({
    array: [...arr],
    type: "done",
    description:
      `Sorted. Selection sort made ${swaps} swap${swaps !== 1 ? "s" : ""} and ${comparisons} comparisons — the minimum marched left-to-right, one position at a time.`,
    highlights: {},
    sortedIndices: arr.map((_, i) => i),
    meta: { comparisons, swaps },
  });

  return steps;
}

// ── Insertion Sort ──────────────────────────────────────────────────────────
export function generateInsertionSortSteps(input: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const arr = [...input];
  const n = arr.length;
  let comparisons = 0;
  let shifts = 0;

  steps.push({
    array: [...arr],
    type: "initial",
    description:
      "Here's the unsorted array. Insertion sort builds a sorted left portion one element at a time — like sorting a hand of playing cards.",
    highlights: { [0]: "sorted" },
    sortedIndices: [0],
    meta: { comparisons, shifts, sortedBoundary: 1 },
  });

  for (let i = 1; i < n; i++) {
    const key = arr[i];
    const sortedSoFar = arr.slice(0, i).map((_, idx) => idx);

    steps.push({
      array: [...arr],
      type: "pick",
      description: `Pick up ${key} (index ${i}). It needs to find its place in the sorted portion [${arr.slice(0, i).join(", ")}].`,
      highlights: { [i]: "inserting" },
      sortedIndices: sortedSoFar,
      meta: { comparisons, shifts, sortedBoundary: i },
    });

    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      comparisons++;
      steps.push({
        array: [...arr],
        type: "compare",
        description: `${arr[j]} > ${key} — shift ${arr[j]} one step right to make room.`,
        highlights: { [j]: "shifting", [j + 1]: "inserting" },
        sortedIndices: arr.slice(0, i).map((_, idx) => idx),
        meta: { comparisons, shifts, sortedBoundary: i },
      });
      arr[j + 1] = arr[j];
      shifts++;
      steps.push({
        array: [...arr],
        type: "shift",
        description: `Shifted ${arr[j + 1]} right. Slot ${j} is now open for ${key}.`,
        highlights: { [j + 1]: "shifting", [j]: "inserting" },
        sortedIndices: arr.slice(0, i).map((_, idx) => idx),
        meta: { comparisons, shifts, sortedBoundary: i },
      });
      j--;
    }

    if (j >= 0) {
      comparisons++;
      steps.push({
        array: [...arr],
        type: "compare",
        description: `${arr[j]} ≤ ${key} — stop here. Insert ${key} right after index ${j}.`,
        highlights: { [j]: "comparing", [j + 1]: "inserting" },
        sortedIndices: arr.slice(0, i).map((_, idx) => idx),
        meta: { comparisons, shifts, sortedBoundary: i },
      });
    }

    arr[j + 1] = key;
    steps.push({
      array: [...arr],
      type: "insert",
      description: `Inserted ${key} at index ${j + 1}. Sorted portion is now [${arr.slice(0, i + 1).join(", ")}].`,
      highlights: { [j + 1]: "placed" },
      sortedIndices: arr.slice(0, i + 1).map((_, idx) => idx),
      meta: { comparisons, shifts, sortedBoundary: i + 1 },
    });
  }

  steps.push({
    array: [...arr],
    type: "done",
    description:
      `Sorted. ${shifts} shift${shifts !== 1 ? "s" : ""} and ${comparisons} comparisons — every element slid left until it hit something smaller.`,
    highlights: {},
    sortedIndices: arr.map((_, i) => i),
    meta: { comparisons, shifts },
  });

  return steps;
}

// ── Merge Sort ──────────────────────────────────────────────────────────────
export function generateMergeSortSteps(input: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const arr = [...input];
  const n = arr.length;
  const sortedSet = new Set<number>();
  const stats = { comparisons: 0, merges: 0 };

  steps.push({
    array: [...arr],
    type: "initial",
    description:
      "Here's the unsorted array. Merge sort splits it in half recursively until trivial, then merges the sorted halves back with a two-pointer comparison.",
    highlights: {},
    sortedIndices: [],
    meta: { comparisons: 0, merges: 0, depth: 0 },
  });

  function curSorted(): number[] {
    return [...sortedSet];
  }

  function splitHighlights(left: number, mid: number, right: number): Partial<Record<number, HighlightRole>> {
    const h: Partial<Record<number, HighlightRole>> = {};
    sortedSet.forEach((p) => { h[p] = "sorted"; });
    for (let p = left; p <= mid; p++) h[p] = "left-ptr";
    for (let p = mid + 1; p <= right; p++) h[p] = "right-ptr";
    return h;
  }

  function mergeHighlights(
    left: number, k: number, right: number,
    lpAbs?: number, rpAbs?: number,
  ): Partial<Record<number, HighlightRole>> {
    const h: Partial<Record<number, HighlightRole>> = {};
    // Globally sorted (outside current range) marked first
    sortedSet.forEach((p) => {
      if (p < left || p > right) h[p] = "sorted";
    });
    // Merged portion of current range
    for (let p = left; p < k; p++) h[p] = "sorted";
    // Unmerged portion
    for (let p = k; p <= right; p++) h[p] = "in-range";
    if (lpAbs !== undefined) h[lpAbs] = "left-ptr";
    if (rpAbs !== undefined) h[rpAbs] = "right-ptr";
    return h;
  }

  function mergeRange(left: number, right: number, depth: number): void {
    if (right <= left) {
      sortedSet.add(left);
      return;
    }

    const mid = Math.floor((left + right) / 2);

    steps.push({
      array: [...arr],
      type: "split",
      description:
        depth === 1
          ? `Top-level split: left half [${arr.slice(left, mid + 1).join(",")}] and right half [${arr.slice(mid + 1, right + 1).join(",")}].`
          : `Split [${arr.slice(left, right + 1).join(",")}] → [${arr.slice(left, mid + 1).join(",")}] | [${arr.slice(mid + 1, right + 1).join(",")}].`,
      highlights: splitHighlights(left, mid, right),
      sortedIndices: curSorted(),
      meta: { ...stats, depth },
    });

    mergeRange(left, mid, depth + 1);
    mergeRange(mid + 1, right, depth + 1);

    // At this point sortedSet contains left..mid and mid+1..right (from sub-calls).
    // Now we merge them.
    const temp = arr.slice(left, right + 1);
    const lLen = mid - left + 1;
    const rLen = right - mid;
    let lp = 0, rp = 0, k = left;

    // Remove the sub-ranges from sortedSet so highlights look correct during merge
    for (let p = left; p <= right; p++) sortedSet.delete(p);

    steps.push({
      array: [...arr],
      type: "merge-start",
      description: `Merge [${arr.slice(left, mid + 1).join(",")}] and [${arr.slice(mid + 1, right + 1).join(",")}].`,
      highlights: splitHighlights(left, mid, right),
      sortedIndices: curSorted(),
      meta: { ...stats, depth },
    });

    while (lp < lLen && rp < rLen) {
      stats.comparisons++;
      const lVal = temp[lp];
      const rVal = temp[lLen + rp];
      const takingLeft = lVal <= rVal;

      // Left pointer absolute position: left + lp (may be overwritten, but color + description convey intent)
      // Right pointer absolute position: mid + 1 + rp (always valid during this loop)
      steps.push({
        array: [...arr],
        type: "merge-compare",
        description: takingLeft
          ? `Compare ${lVal} ≤ ${rVal} — take ${lVal} from left.`
          : `Compare ${lVal} > ${rVal} — take ${rVal} from right.`,
        highlights: mergeHighlights(left, k, right, left + lp, mid + 1 + rp),
        sortedIndices: curSorted(),
        meta: { ...stats, depth },
      });

      if (takingLeft) { arr[k] = lVal; lp++; }
      else { arr[k] = rVal; rp++; }
      k++;
      stats.merges++;

      steps.push({
        array: [...arr],
        type: "merge-place",
        description: `Placed ${arr[k - 1]} at position ${k - 1}.`,
        highlights: mergeHighlights(left, k, right),
        sortedIndices: curSorted(),
        meta: { ...stats, depth },
      });
    }

    while (lp < lLen) {
      arr[k] = temp[lp++];
      k++;
      stats.merges++;
      steps.push({
        array: [...arr],
        type: "merge-place",
        description: `Copy remaining left element ${arr[k - 1]} to position ${k - 1}.`,
        highlights: mergeHighlights(left, k, right),
        sortedIndices: curSorted(),
        meta: { ...stats, depth },
      });
    }

    while (rp < rLen) {
      arr[k] = temp[lLen + rp++];
      k++;
      stats.merges++;
      steps.push({
        array: [...arr],
        type: "merge-place",
        description: `Copy remaining right element ${arr[k - 1]} to position ${k - 1}.`,
        highlights: mergeHighlights(left, k, right),
        sortedIndices: curSorted(),
        meta: { ...stats, depth },
      });
    }

    // Mark range sorted
    for (let p = left; p <= right; p++) sortedSet.add(p);
    const doneH: Partial<Record<number, HighlightRole>> = {};
    sortedSet.forEach((p) => { doneH[p] = "sorted"; });

    steps.push({
      array: [...arr],
      type: "merge-done",
      description: `Done merging range ${left}..${right} → [${arr.slice(left, right + 1).join(", ")}].`,
      highlights: doneH,
      sortedIndices: curSorted(),
      meta: { ...stats, depth },
    });
  }

  mergeRange(0, n - 1, 1);

  steps.push({
    array: [...arr],
    type: "done",
    description:
      `Sorted. Merge sort made ${stats.comparisons} comparisons across ${stats.merges} placements — O(n log n) guaranteed.`,
    highlights: {},
    sortedIndices: arr.map((_, i) => i),
    meta: stats,
  });

  return steps;
}

// ── Quick Sort ──────────────────────────────────────────────────────────────
export function generateQuickSortSteps(input: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const arr = [...input];
  const n = arr.length;
  const sortedSet = new Set<number>();
  const stats = { comparisons: 0, swaps: 0, pivots: 0 };

  steps.push({
    array: [...arr],
    type: "initial",
    description:
      "Here's the unsorted array. Quick sort picks a pivot, partitions everything smaller to its left and larger to its right, then recurses on both halves.",
    highlights: {},
    sortedIndices: [],
    meta: { ...stats },
  });

  function rangeHighlights(
    low: number, high: number, pivotPos: number,
    jPos?: number, iPos?: number,
  ): Partial<Record<number, HighlightRole>> {
    const h: Partial<Record<number, HighlightRole>> = {};
    sortedSet.forEach((p) => { h[p] = "sorted"; });
    for (let p = low; p <= high; p++) h[p] = "in-range";
    h[pivotPos] = "pivot";
    if (iPos !== undefined && iPos >= low) h[iPos] = "minimum"; // left partition marker
    if (jPos !== undefined) h[jPos] = "comparing";
    return h;
  }

  function quickSort(low: number, high: number): void {
    if (low > high) return;
    if (low === high) {
      sortedSet.add(low);
      steps.push({
        array: [...arr],
        type: "base-case",
        description: `Single element ${arr[low]} at index ${low} — already in its final position.`,
        highlights: (() => {
          const h: Partial<Record<number, HighlightRole>> = {};
          sortedSet.forEach((p) => { h[p] = "sorted"; });
          return h;
        })(),
        sortedIndices: [...sortedSet],
        meta: { ...stats },
      });
      return;
    }

    const pivotVal = arr[high];

    steps.push({
      array: [...arr],
      type: "pivot",
      description: `Choose pivot = ${pivotVal} (last element of range ${low}..${high}). Partition: move ≤ pivot left, > pivot right.`,
      highlights: rangeHighlights(low, high, high),
      sortedIndices: [...sortedSet],
      meta: { ...stats },
    });

    let i = low - 1;

    for (let j = low; j < high; j++) {
      stats.comparisons++;

      if (arr[j] <= pivotVal) {
        steps.push({
          array: [...arr],
          type: "compare",
          description: `${arr[j]} ≤ ${pivotVal} — goes left of pivot. Expand left partition boundary.`,
          highlights: rangeHighlights(low, high, high, j, i),
          sortedIndices: [...sortedSet],
          meta: { ...stats },
        });
        i++;
        if (i !== j) {
          stats.swaps++;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          steps.push({
            array: [...arr],
            type: "swap",
            description: `Swap ${arr[j]} ↔ ${arr[i]}. ${arr[i]} joins the left partition at index ${i}.`,
            highlights: rangeHighlights(low, high, high, j, i),
            sortedIndices: [...sortedSet],
            meta: { ...stats },
          });
        }
      } else {
        steps.push({
          array: [...arr],
          type: "compare",
          description: `${arr[j]} > ${pivotVal} — stays right of pivot. No move.`,
          highlights: rangeHighlights(low, high, high, j, i >= low ? i : undefined),
          sortedIndices: [...sortedSet],
          meta: { ...stats },
        });
      }
    }

    // Place pivot in final position
    stats.swaps++;
    stats.pivots++;
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    const pivotFinal = i + 1;
    sortedSet.add(pivotFinal);

    const placeH: Partial<Record<number, HighlightRole>> = {};
    sortedSet.forEach((p) => { placeH[p] = "sorted"; });
    for (let p = low; p <= high; p++) if (!sortedSet.has(p)) placeH[p] = "in-range";

    steps.push({
      array: [...arr],
      type: "place-pivot",
      description: `Pivot ${arr[pivotFinal]} lands at index ${pivotFinal}. Everything left ≤ pivot, everything right > pivot.`,
      highlights: placeH,
      sortedIndices: [...sortedSet],
      meta: { ...stats },
    });

    quickSort(low, pivotFinal - 1);
    quickSort(pivotFinal + 1, high);
  }

  quickSort(0, n - 1);

  steps.push({
    array: [...arr],
    type: "done",
    description: `Sorted. Quick sort placed ${stats.pivots} pivot${stats.pivots !== 1 ? "s" : ""} and made ${stats.comparisons} comparisons — partition and recurse until nothing is left to sort.`,
    highlights: {},
    sortedIndices: arr.map((_, i) => i),
    meta: { ...stats },
  });

  return steps;
}
