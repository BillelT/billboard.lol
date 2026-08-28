"use client";
import { useEffect, useState } from "react";
import { getSupabase, supabaseConfigured } from "./supabase";

const DEMO_KEY = "bidboard.demoVisits";
const DEMO_BASE = 1000;
// Set once a browser has been counted, so a refresh (or a new tab) reads the
// total instead of bumping it again — the gauge counts visitors, not visits.
const VISITED_KEY = "bidboard.visited";

function alreadyCounted(): boolean {
  try {
    if (localStorage.getItem(VISITED_KEY)) return true;
    localStorage.setItem(VISITED_KEY, "1");
    return false;
  } catch {
    return false;
  }
}

// Total visitors since launch — counted once per browser, not once per page
// load. Supabase when configured — the first visit from a browser bumps the
// shared counter through an RPC, every later visit just reads it, and
// realtime keeps every open tab in sync; otherwise a per-browser counter in
// localStorage keeps the number moving during local dev.
export function useVisits(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (supabaseConfigured()) return;
    try {
      if (alreadyCounted()) {
        setCount(Number(localStorage.getItem(DEMO_KEY)) || DEMO_BASE);
        return;
      }
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

      if (alreadyCounted()) {
        const { data, error } = await supabase
          .from("site_visits")
          .select("total")
          .eq("id", 1)
          .single();
        if (!error && data && !cancelled) setCount(data.total);
      } else {
        const { data, error } = await supabase.rpc("bump_site_visits");
        if (!error && typeof data === "number" && !cancelled) setCount(data);
      }

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
