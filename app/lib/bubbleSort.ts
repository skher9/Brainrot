export type StepType = "initial" | "compare" | "swap" | "pass-end" | "done";

export interface SortStep {
  array: number[];
  comparing: [number, number] | null;
  swapped: boolean;
  sortedIndices: number[];
  description: string;
  pass: number;
  type: StepType;
}

export function generateBubbleSortSteps(input: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const arr = [...input];
  const n = arr.length;
  const sorted: number[] = [];

  steps.push({
    array: [...arr],
    comparing: null,
    swapped: false,
    sortedIndices: [],
    description:
      "Here's the unsorted array. Bubble sort compares adjacent elements and swaps them if they're out of order — over and over until nothing moves.",
    pass: 0,
    type: "initial",
  });

  for (let i = 0; i < n - 1; i++) {
    let didSwap = false;
    for (let j = 0; j < n - i - 1; j++) {
      const a = arr[j], b = arr[j + 1];
      steps.push({
        array: [...arr],
        comparing: [j, j + 1],
        swapped: false,
        sortedIndices: [...sorted],
        description:
          a > b
            ? `Comparing ${a} and ${b}. ${a} > ${b} — they're in the wrong order. Swap.`
            : `Comparing ${a} and ${b}. ${a} ≤ ${b} — already in order. Move on.`,
        pass: i + 1,
        type: "compare",
      });

      if (a > b) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        didSwap = true;
        steps.push({
          array: [...arr],
          comparing: [j, j + 1],
          swapped: true,
          sortedIndices: [...sorted],
          description: `Swapped ${b} and ${a}. The bigger number bubbles right.`,
          pass: i + 1,
          type: "swap",
        });
      }
    }

    sorted.push(n - 1 - i);
    steps.push({
      array: [...arr],
      comparing: null,
      swapped: false,
      sortedIndices: [...sorted],
      description: `Pass ${i + 1} done. ${arr[n - 1 - i]} locked in at the end.`,
      pass: i + 1,
      type: "pass-end",
    });

    if (!didSwap) break;
  }

  steps.push({
    array: [...arr],
    comparing: null,
    swapped: false,
    sortedIndices: arr.map((_, i) => i),
    description: "Sorted. Every element found its place. That's bubble sort.",
    pass: n,
    type: "done",
  });

  return steps;
}

export interface ComparisonQuestion {
  array: number[];
  j: number;
  shouldSwap: boolean;
  explanation: string;
}

export function getComparisonQuestions(input: number[]): ComparisonQuestion[] {
  const arr = [...input];
  const n = arr.length;
  const questions: ComparisonQuestion[] = [];

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      const a = arr[j], b = arr[j + 1];
      questions.push({
        array: [...arr],
        j,
        shouldSwap: a > b,
        explanation:
          a > b
            ? `${a} > ${b}, so they need to swap. Bigger numbers bubble right.`
            : `${a} ≤ ${b}, already in order. No swap needed.`,
      });
      if (a > b) [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
    }
  }

  return questions;
}
