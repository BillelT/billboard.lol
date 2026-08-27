"use client";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { computeLayout, fmtUSD } from "@/lib/layout";
import { brandColorFor } from "@/lib/palette";
import { scrollState } from "@/lib/scrollState";
import { perfEnabled } from "@/lib/perfState";
import PerfPanel from "./PerfPanel";

const STEPS = [1, 2, 5, 10, 20, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export default function Overlay() {
  const billboards = useStore((s) => s.billboards);
  const addBid = useStore((s) => s.addBid);
  const layout = useMemo(() => computeLayout(billboards), [billboards]);
  const top = layout.items[0];
  const totalBurned = useMemo(() => billboards.reduce((a, b) => a + b.amount, 0), [billboards]);

  const [amount, setAmount] = useState(20);
  const [domain, setDomain] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [perf, setPerf] = useState(false);
  useEffect(() => setPerf(perfEnabled()), []);

  // scroll + pointer → mutable state read by the camera rig every frame
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollState.target = max > 0 ? window.scrollY / max : 0;
      setScrolled(window.scrollY > 40);
    };
    const onPointer = (e: PointerEvent) => {
      scrollState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      scrollState.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const i = STEPS.findIndex((s) => s >= amount);
    const cur = i === -1 ? STEPS.length - 1 : i;
    setAmount(STEPS[Math.min(STEPS.length - 1, Math.max(0, cur + dir))]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!name || busy) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.demo) {
        addBid({ name, url: `https://${name}`, amount, color: brandColorFor(name) });
        setFlash(`🪧 ${name} planted for ${fmtUSD(amount)} — demo mode, no payment taken.`);
        setDomain("");
      } else {
        setFlash(data.error ?? "Something went wrong.");
      }
    } catch {
      setFlash("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  // scroll length grows with the ranking but sub-linearly, so 200 billboards
  // stay a long drive rather than an endless one
  const pages = Math.min(60, 6 + layout.items.length * 0.55);

  return (
    <>
      <div className="spacer" style={{ height: `${pages * 90}vh` }} />

      <header className="hud-top">
        <div className="brand">OutGrow<span>.lol</span></div>
        <h1 className="headline">
          Plant your billboard for{" "}
          <button className="stepper" onClick={() => step(-1)} aria-label="less">−</button>
          <strong className="price">{fmtUSD(amount)}</strong>
          <button className="stepper" onClick={() => step(1)} aria-label="more">+</button>
        </h1>
        <form className="claim" onSubmit={submit}>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="yourcompany.com"
            spellCheck={false}
            aria-label="your domain"
          />
          <button type="submit" className="cta" disabled={busy}>
            {busy ? "…" : "Plant my billboard →"}
          </button>
        </form>
        <p className="ticker">
          {flash ??
            (top
              ? `${top.name} holds #1 with ${fmtUSD(top.amount)}. Beat them for ${fmtUSD(top.amount + 1)}.`
              : "Be the first on the highway.")}
        </p>
        {top && (
          <button
            className="beat"
            onClick={() => setAmount(top.amount + 1)}
            title="Set the amount that takes the #1 spot"
          >
            🏆 take the #1 spot
          </button>
        )}
      </header>

      <aside className="stats">
        <div className="pill">🪧 {layout.items.length} billboards</div>
        <div className="pill">💸 {fmtUSD(totalBurned)} burned</div>
        {top && (
          <div className="pill">
            🥇 <a href={top.url} target="_blank" rel="noopener noreferrer">{top.name}</a> · {fmtUSD(top.amount)}
          </div>
        )}
        <div className="pill sub">a satire · bigger is better</div>
      </aside>

      <div className={`hint ${scrolled ? "off" : ""}`}>scroll to drive past the ranking ↓</div>
      {perf && <PerfPanel />}
    </>
  );
}
