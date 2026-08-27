"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { computeLayout, fmtFeet, fmtUSD } from "@/lib/layout";
import { brandColorFor } from "@/lib/palette";
import { scrollState } from "@/lib/scrollState";
import { usePresence } from "@/lib/usePresence";
import { perfEnabled } from "@/lib/perfState";
import PerfPanel from "./PerfPanel";

const STEPS = [1, 2, 5, 10, 20, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export default function Overlay() {
  const billboards = useStore((s) => s.billboards);
  const addBid = useStore((s) => s.addBid);
  const layout = useMemo(() => computeLayout(billboards), [billboards]);
  const top = layout.items[0];
  const totalBurned = useMemo(() => billboards.reduce((a, b) => a + b.amount, 0), [billboards]);
  const online = usePresence();

  const [amount, setAmount] = useState(20);
  const [domain, setDomain] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  // publish the dock height so the gauge rail and the hint always clear it
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      // border box, not content box — the dock has thick padding and a hard border
      const h = entry.borderBoxSize?.[0]?.blockSize ?? el.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--dock-h", `${Math.round(h)}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
        setFlash(`${name} planted for ${fmtUSD(amount)} — demo mode, no payment taken.`);
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

      {/* the 3D stack climbs high, so the top stays reserved for the wordmark alone */}
      <header className="masthead">
        <a className="wordmark" href="/">
          <span className="wordmark__sign" aria-hidden="true" />
          OutGrow<em>.lol</em>
        </a>
      </header>

      <aside className="gauges">
        <div className="gauge gauge--live">
          <span className="gauge__dot" aria-hidden="true" />
          <b>{online}</b> on the road
        </div>
        <div className="gauge">
          <span className="gauge__key">tallest</span>
          <b>{top ? fmtFeet(top.totalH) : "—"}</b>
        </div>
        <div className="gauge">
          <span className="gauge__key">planted</span>
          <b>{layout.items.length}</b> billboards
        </div>
        <div className="gauge">
          <span className="gauge__key">sales</span>
          <b>{fmtUSD(totalBurned)}</b> made
        </div>
        <div className="gauge gauge--sig">built by Billel</div>
      </aside>

      <div className={`hint ${scrolled ? "off" : ""}`}>scroll or grab to drive past the ranking ↔</div>

      {/* claim dock — anchored low so it never fights the billboards for the sky */}
      <div className="dock">
        <div className="dock__inner" ref={dockRef}>
          <h1 className="dock__title">
            Plant your billboard for
            <span className="meter">
              <button className="meter__step" onClick={() => step(-1)} aria-label="lower the amount">
                −
              </button>
              <strong className="meter__value">{fmtUSD(amount)}</strong>
              <button className="meter__step" onClick={() => step(1)} aria-label="raise the amount">
                +
              </button>
            </span>
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
              {busy ? "…" : "Plant my billboard"}
            </button>
          </form>

          {/* the single line about #1 — click it to load the winning amount */}
          {flash ? (
            <p className="lede">{flash}</p>
          ) : top ? (
            <button className="lede lede--action" onClick={() => setAmount(top.amount + 1)}>
              {top.name} holds #1 with {fmtUSD(top.amount)} —{" "}
              <span>outgrow them for {fmtUSD(top.amount + 1)}</span>
            </button>
          ) : (
            <p className="lede">Be the first billboard on the highway.</p>
          )}
        </div>
      </div>

      {perf && <PerfPanel />}
    </>
  );
}
