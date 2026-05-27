"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_HINTS = 3;

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export function useHints(categorySlug: string) {
  const [hintsUsed, setHintsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const month = currentMonth();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("user_hints")
        .select("hints_used")
        .eq("user_id", user.id)
        .eq("category_slug", categorySlug)
        .eq("reset_month", month)
        .maybeSingle();
      if (!cancelled) {
        setHintsUsed(data?.hints_used ?? 0);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [categorySlug, month]);

  const useHint = useCallback(async () => {
    if (hintsUsed >= MAX_HINTS) return;
    const next = hintsUsed + 1;
    setHintsUsed(next);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_hints").upsert({
      user_id: user.id,
      category_slug: categorySlug,
      hints_used: next,
      reset_month: month,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,category_slug,reset_month" });
  }, [hintsUsed, categorySlug, month]);

  return { hintsUsed, useHint, loading, remaining: MAX_HINTS - hintsUsed };
}
