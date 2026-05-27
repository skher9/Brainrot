"use client";

import { XPProvider } from "@/lib/xpContext";

export default function SortingLayout({ children }: { children: React.ReactNode }) {
  return <XPProvider>{children}</XPProvider>;
}
