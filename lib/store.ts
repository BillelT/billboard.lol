"use client";
import { create } from "zustand";
import type { Billboard } from "./types";
import { SEED } from "./seed";

interface State {
  billboards: Billboard[];
  live: boolean; // true once real data replaced the seed
  setBillboards: (b: Billboard[]) => void;
  addBid: (input: { name: string; url: string; amount: number; color: string }) => void;
}

export const useStore = create<State>((set) => ({
  billboards: SEED,
  live: false,
  setBillboards: (billboards) => set({ billboards, live: true }),
  addBid: ({ name, url, amount, color }) =>
    set((s) => {
      const key = name.trim().toLowerCase();
      const existing = s.billboards.find((b) => b.name.toLowerCase() === key);
      if (existing) {
        return {
          billboards: s.billboards.map((b) =>
            b.id === existing.id ? { ...b, amount: b.amount + amount } : b,
          ),
        };
      }
      return {
        billboards: [
          ...s.billboards,
          { id: `local-${Date.now()}`, name: name.trim(), url, color, amount },
        ],
      };
    }),
}));
