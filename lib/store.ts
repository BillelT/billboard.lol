"use client";
import { create } from "zustand";
import type { Billboard } from "./types";
import { SEED } from "./seed";

interface State {
  billboards: Billboard[];
  live: boolean; // true once real data replaced the seed
  setBillboards: (b: Billboard[]) => void;
}

export const useStore = create<State>((set) => ({
  billboards: SEED,
  live: false,
  setBillboards: (billboards) => set({ billboards, live: true }),
}));
