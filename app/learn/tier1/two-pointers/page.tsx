"use client";
import TwoPointersHub from "@/components/games/tier1/two-pointers/TwoPointersHub";
export default function TwoPointersPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "0 20px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <TwoPointersHub />
      </div>
    </div>
  );
}
