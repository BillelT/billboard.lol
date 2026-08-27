"use client";
import { useEffect, useState } from "react";
import { subscribeRebuild } from "@/lib/debugState";

// Returns a counter that changes whenever a debug value marked `rebuild` moves,
// for use as a useMemo dependency. Stays at 0 for everyone not tuning.
export function useRebuild(): number {
  const [v, setV] = useState(0);
  useEffect(() => subscribeRebuild(setV), []);
  return v;
}
