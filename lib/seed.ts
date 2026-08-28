import type { Billboard } from "./types";
import { BRAND_COLORS } from "./palette";

// Dev stress ranking (?stress=200): what the highway looks like with a real
// crowd of companies on it. Used to check draw calls and texture memory scale.
export function makeStressRanking(n: number): Billboard[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `stress-${i}`,
    name: `company-${i + 1}.com`,
    url: "https://example.com",
    color: BRAND_COLORS[i % BRAND_COLORS.length],
    amount: Math.round(4000 / Math.pow(i + 1, 0.85)) + 1,
  }));
}

// Fallback ranking shown until Supabase has real data. Real billboards carry the
// domain's own favicon and SEO description; these fictional ones only have the
// copy, so they fall back to the monogram tile.
export const SEED: Billboard[] = [
  {
    id: "s1",
    name: "omnicorp.biz",
    url: "https://omnicorp.biz",
    color: "#2f6bff",
    amount: 2600,
    title: "Omnicorp — synergy at planetary scale",
    description: "The vertically integrated platform for enterprises that already own everything else.",
  },
  {
    id: "s2",
    name: "hypergrowth.io",
    url: "https://hypergrowth.io",
    color: "#e4572e",
    amount: 1450,
    title: "Hypergrowth — 10x or nothing",
    description: "Growth advisory for founders who read one thread and rewrote the whole roadmap.",
  },
  {
    id: "s3",
    name: "moneyprinter.app",
    url: "https://moneyprinter.app",
    color: "#12b886",
    amount: 880,
    title: "MoneyPrinter — revenue on autopilot",
    description: "Connect your bank, pick a strategy, watch the dashboard go up and to the right.",
  },
  {
    id: "s4",
    name: "synergy.consulting",
    url: "https://synergy.consulting",
    color: "#7048e8",
    amount: 560,
    title: "Synergy Consulting — alignment as a service",
    description: "We run the workshop that decides who runs the next workshop.",
  },
  {
    id: "s5",
    name: "rocketmath.ai",
    url: "https://rocketmath.ai",
    color: "#f6a41d",
    amount: 370,
    title: "RocketMath — AI tutoring that actually adds up",
    description: "Adaptive math practice for kids, graded by a model that never loses patience.",
  },
  {
    id: "s6",
    name: "coldemail.pro",
    url: "https://coldemail.pro",
    color: "#0ca6b8",
    amount: 240,
    title: "ColdEmail Pro — inboxes, warmed",
    description: "Sequences, deliverability and follow-ups for teams who refuse to take a hint.",
  },
  {
    id: "s7",
    name: "pixelbarn.studio",
    url: "https://pixelbarn.studio",
    color: "#e64980",
    amount: 155,
    title: "Pixel Barn — a small studio with loud pixels",
    description: "Brand systems, websites and motion for companies that hate looking like everyone else.",
  },
  {
    id: "s8",
    name: "tumbleweed.dev",
    url: "https://tumbleweed.dev",
    color: "#37415c",
    amount: 90,
    title: "tumbleweed.dev — a very quiet SaaS",
    description: "Two users, one of them is the founder, uptime is nevertheless 99.99%.",
  },
  {
    id: "s9",
    name: "sidequest.lol",
    url: "https://sidequest.lol",
    color: "#2f6bff",
    amount: 55,
    title: "Sidequest — ship the thing you keep not shipping",
    description: "A weekend-project tracker that shames you gently until it is live.",
  },
  {
    id: "s10",
    name: "ramen.capital",
    url: "https://ramen.capital",
    color: "#e4572e",
    amount: 28,
    title: "Ramen Capital — pre-seed money, post-seed opinions",
    description: "$50k checks and unlimited advice for founders still on instant noodles.",
  },
  {
    id: "s11",
    name: "two-guys.garage",
    url: "https://two-guys.garage",
    color: "#12b886",
    amount: 12,
    title: "Two Guys Garage — hardware, badly lit",
    description: "Prototyping, CNC and one very opinionated soldering iron.",
  },
  {
    id: "s12",
    name: "mom-approved.site",
    url: "https://mom-approved.site",
    color: "#f6a41d",
    amount: 5,
    title: "Mom Approved — the only review that matters",
    description: "One product, one reviewer, five stars, unverifiable.",
  },
];
