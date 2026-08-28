"use client";
import { create } from "zustand";
import type { Billboard } from "./types";
import { SEED } from "./seed";

// What clicking an empty slot in the scene needs to open the buy modal for it —
// just enough to price and label that spot, not the full 3D layout item.
export interface BuyTarget {
  rank: number;
  amount: number;
}

interface State {
  billboards: Billboard[];
  live: boolean; // true once real data replaced the seed
  setBillboards: (b: Billboard[]) => void;
  buyTarget: BuyTarget | null;
  openBuyModal: (target: BuyTarget) => void;
  closeBuyModal: () => void;
}

export const useStore = create<State>((set) => ({
  billboards: SEED,
  live: false,
  setBillboards: (billboards) => set({ billboards, live: true }),
  buyTarget: null,
  openBuyModal: (target) => set({ buyTarget: target }),
  closeBuyModal: () => set({ buyTarget: null }),
}));
