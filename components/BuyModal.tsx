"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { fmtUSD } from "@/lib/layout";
import { CATEGORIES } from "@/lib/categories";

const cleanDomain = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");

// Clicking an empty slot in the scene opens this instead of scrolling down to
// the dock — the same checkout, just aimed at the spot you actually clicked.
export default function BuyModal() {
  const target = useStore((s) => s.buyTarget);
  const closeBuyModal = useStore((s) => s.closeBuyModal);

  const [domain, setDomain] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // a fresh form every time a different slot is clicked
  useEffect(() => {
    setDomain("");
    setCategory("");
    setError(null);
    setBusy(false);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeBuyModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, closeBuyModal]);

  if (!target) return null;

  const amount = target.amount + 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = cleanDomain(domain);
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount, category: category || undefined }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Something went wrong.");
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scrim" onClick={closeBuyModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal__close" onClick={closeBuyModal} aria-label="Close">
          ×
        </button>
        <h2 className="modal__title">Claim spot #{target.rank}</h2>
        <p className="modal__subtitle">Pay {fmtUSD(amount)} to plant your billboard right here.</p>

        <form className="modal__form" onSubmit={submit}>
          <input
            className="modal__input"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="yourcompany.com"
            spellCheck={false}
            autoFocus
            aria-label="your domain"
          />
          <select
            className="modal__select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="category"
          >
            <option value="">Choose a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit" className="modal__cta" disabled={busy}>
            {busy ? "…" : `Plant it for ${fmtUSD(amount)}`}
          </button>
        </form>

        {error && <p className="modal__error">{error}</p>}
        <p className="modal__footnote">
          Every dollar makes your billboard bigger. No refunds. By paying, you agree to our{" "}
          <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
