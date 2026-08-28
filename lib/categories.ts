// Shared by the claim form and the checkout route, so what a buyer can pick and
// what the server accepts can never drift apart.
export const CATEGORIES = [
  "AI & Infrastructure",
  "Marketing & Growth",
  "Developer Tools",
  "Business & Finance",
  "Security & Privacy",
  "Health & Wellness",
  "Social & Community",
  "Ecommerce & Retail",
  "Education",
  "Design & Creative",
  "Productivity",
  "Games & Entertainment",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}
