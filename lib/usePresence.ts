"use client";
import { useEffect, useState } from "react";
import { getSupabase, supabaseConfigured } from "./supabase";

// How many people are on the highway right now.
// Supabase presence when configured; otherwise it's you plus every real
// (non-placeholder) billboard already planted — an advertiser on the road
// counts as being "on the road" too, not just a live human visitor.
export function usePresence(extraOnline = 0): number {
  const [count, setCount] = useState(1);

  // demo/no-backend fallback baseline — kept separate from the real
  // subscription effect below so a changing billboard count never tears
  // down and rebuilds a live presence channel.
  useEffect(() => {
    if (supabaseConfigured()) return;
    setCount(1 + Math.max(0, extraOnline));
  }, [extraOnline]);

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
