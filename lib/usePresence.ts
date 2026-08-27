"use client";
import { useEffect, useState } from "react";
import { getSupabase, supabaseConfigured } from "./supabase";

// How many people are on the highway right now.
// Supabase presence when configured; otherwise it's honestly just you.
export function usePresence(): number {
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (!supabaseConfigured()) return;

    let channel: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const supabase = await getSupabase();
      if (!supabase || cancelled) return;

      const key = `v-${Math.random().toString(36).slice(2, 10)}`;
      const ch = supabase.channel("highway", { config: { presence: { key } } });
      channel = ch;

      ch.on("presence", { event: "sync" }, () => {
        setCount(Math.max(1, Object.keys(ch.presenceState()).length));
      }).subscribe((status) => {
        if (status === "SUBSCRIBED") ch.track({ at: Date.now() });
      });
    })();

    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, []);

  return count;
}
