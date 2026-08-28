"use client";
import { useEffect, useState } from "react";
import { getSupabase, supabaseConfigured } from "./supabase";

const DEMO_KEY = "bidboard.demoVisits";
const DEMO_BASE = 1000;

// Total pageviews since launch. Supabase when configured — one RPC call per
// mount bumps the shared counter and realtime keeps every open tab in sync;
// otherwise a per-browser counter in localStorage keeps the number moving
// during local dev.
export function useVisits(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (supabaseConfigured()) return;
    try {
      const next = (Number(localStorage.getItem(DEMO_KEY)) || DEMO_BASE) + 1;
      localStorage.setItem(DEMO_KEY, String(next));
      setCount(next);
    } catch {
      setCount(DEMO_BASE);
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured()) return;

    let channel: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const supabase = await getSupabase();
      if (!supabase || cancelled) return;

      const { data, error } = await supabase.rpc("bump_site_visits");
      if (!error && typeof data === "number" && !cancelled) setCount(data);

      const ch = supabase
        .channel("site_visits")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "site_visits" },
          (payload) => {
            const total = (payload.new as { total?: number })?.total;
            if (typeof total === "number") setCount(total);
          },
        )
        .subscribe();
      channel = ch;
    })();

    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, []);

  return count;
}
