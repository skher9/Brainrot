"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface XPCtx {
  xp: number;
  addXP: (n: number) => void;
  currentSection: number;
  goToSection: (n: number) => void;
  sectionComplete: boolean[];
  markComplete: (i: number) => void;
}

const Ctx = createContext<XPCtx | null>(null);

export function XPProvider({ children }: { children: ReactNode }) {
  const [xp, setXP] = useState(0);
  const [currentSection, setSection] = useState(0);
  const [sectionComplete, setSectionComplete] = useState(
    Array(6).fill(false) as boolean[]
  );

  const addXP = useCallback((n: number) => setXP((p) => p + n), []);
  const goToSection = useCallback((n: number) => setSection(n), []);
  const markComplete = useCallback((i: number) => {
    setSectionComplete((p) => {
      const a = [...p];
      a[i] = true;
      return a;
    });
  }, []);

  return (
    <Ctx.Provider
      value={{ xp, addXP, currentSection, goToSection, sectionComplete, markComplete }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useXP() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useXP outside XPProvider");
  return c;
}
