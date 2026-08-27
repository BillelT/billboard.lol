"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";

// How many people are on the highway right now.
// Supabase presence when configured; otherwise it's honestly just you.
export function usePresence(): number {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const key = `v-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel("highway", { config: { presence: { key } } });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Math.max(1, Object.keys(channel.presenceState()).length));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({ at: Date.now() });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
