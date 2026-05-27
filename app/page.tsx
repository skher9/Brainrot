"use client";

import { useState, useEffect } from "react";
import { XPProvider } from "@/lib/xpContext";
import { createClient } from "@/lib/supabase/client";
import { AmbientStage, BurstHost } from "@/components/Effects";
import { CursorAurora, Constellation, ToastHost } from "@/components/Extras";
import Landing from "@/components/Landing";
import AuthModal from "@/components/AuthModal";
import Hub from "@/components/Hub";

export default function Page() {
  const [phase, setPhase] = useState<"landing" | "hub">("landing");
  const [authOpen, setAuthOpen] = useState<"login" | "signup" | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPhase("hub");
      setSessionChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setPhase("landing");
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!sessionChecked) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#060814",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-0.02em",
          color: "#00e5ff", opacity: 0.7,
        }}>
          <span style={{ color: "#a78bfa" }}>brain</span>rot
        </div>
      </div>
    );
  }

  if (phase === "landing") {
    return (
      <>
        <AmbientStage />
        <BurstHost />
        <CursorAurora />
        <Constellation />
        <ToastHost />

        <Landing onOpenAuth={(m) => setAuthOpen(m)} />

        <AuthModal
          open={authOpen !== null}
          mode={authOpen ?? "signup"}
          onClose={() => setAuthOpen(null)}
          onSwitch={(m) => setAuthOpen(m)}
          onAuth={() => {
            setAuthOpen(null);
            setPhase("hub");
          }}
        />
      </>
    );
  }

  return (
    <XPProvider>
      <>
        <AmbientStage />
        <BurstHost />
        <CursorAurora />
        <ToastHost />
        <Constellation />
        <Hub onLogout={() => setPhase("landing")} />
      </>
    </XPProvider>
  );
}
