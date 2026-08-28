"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { computeLayout, driveLength, fmtFeet, fmtUSD } from "@/lib/layout";
import { brandColorFor } from "@/lib/palette";
import { scrollState } from "@/lib/scrollState";
import { usePresence } from "@/lib/usePresence";
import { sceneAudio } from "@/lib/audio";
import { perfEnabled } from "@/lib/perfState";
import { debugEnabled, debugState } from "@/lib/debugState";
import { useRebuild } from "./useRebuild";
import PerfPanel from "./PerfPanel";

const DebugPanel = dynamic(() => import("./DebugPanel"), { ssr: false });

const CATEGORIES = [
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
];

export default function Overlay() {
  const billboards = useStore((s) => s.billboards);
  const addBid = useStore((s) => s.addBid);
  const layout = useMemo(() => computeLayout(billboards), [billboards]);
  const top = layout.items[0];
  const totalBurned = useMemo(() => billboards.reduce((a, b) => a + b.amount, 0), [billboards]);
  const online = usePresence();

  const [amount, setAmount] = useState(20);
  const [domain, setDomain] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [sound, setSound] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

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

  // the debug panel can retune the scroll length live
  useRebuild();

  const [perf, setPerf] = useState(false);
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    setPerf(perfEnabled());
    setDebug(debugEnabled());
  }, []);

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

  // the sound engine can only start from a gesture, so mirror its state here
  useEffect(() => {
    const off = sceneAudio.subscribe(setSound);
    const disarm = sceneAudio.armFromPreference();
    setSound(sceneAudio.enabled);
    return () => {
      off();
      disarm();
    };
  }, []);

  // close the category dropdown on an outside click
  useEffect(() => {
    if (!catOpen) return;
    const onDown = (e: PointerEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [catOpen]);

  const setAmountSafe = (n: number) => setAmount(Math.max(1, Math.min(100000, Math.round(n))));
  const step = (dir: 1 | -1) => setAmountSafe(amount + dir);

  const filteredCategories = useMemo(
    () => CATEGORIES.filter((c) => c.toLowerCase().includes(catQuery.trim().toLowerCase())),
    [catQuery],
  );

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

  // The page is exactly as long as the drive is: a fixed number of scroll pixels
  // per unit of road. Before, a fixed number of viewport heights per billboard
  // meant the same wheel tick bought very different amounts of world, and the
  // opening barely moved at all.
  const road = driveLength(layout);
  const scrollPx = Math.round(road * debugState.motion.scrollPerUnit);

  // a new billboard lengthens the page, so re-derive progress from the new
  // height and hand the grab surface the road it now has to cover
  useEffect(() => {
    scrollState.roadLength = road;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollState.target = max > 0 ? window.scrollY / max : 0;
  }, [road, scrollPx]);

  return (
    <>
      <div className="spacer" style={{ height: `${scrollPx}px`, minHeight: "200vh" }} />

      {/* the 3D stack climbs high, so the top stays reserved for the wordmark alone */}
      <header className="masthead">
        <a className="wordmark" href="/">
          <span className="wordmark__sign" aria-hidden="true" />
          billboard<em>.lol</em>
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
        <button
          className="gauge gauge--sound"
          onClick={() => sceneAudio.toggle()}
          aria-pressed={sound}
          title={sound ? "Mute the highway" : "Hear the highway"}
        >
          <span className="gauge__key">sound</span>
          <b>{sound ? "🔊 on" : "🔇 off"}</b>
        </button>
        <a
          className="gauge gauge--sig"
          href="https://x.com/billel_tighidet"
          target="_blank"
          rel="noopener noreferrer"
        >
          built by Billel
        </a>
      </aside>

      <div className={`hint ${scrolled ? "off" : ""}`}>scroll or grab to drive past the ranking ↔</div>

      {/* claim dock — anchored low so it never fights the billboards for the sky */}
      <div className="dock">
        <div className="dock__inner" ref={dockRef}>
          <h1 className="dock__title">
            Plant your billboard for
            <span className="meter">
              <button className="meter__step" onClick={() => step(-1)} aria-label="lower the amount by 1">
                −
              </button>
              <span className="meter__value">
                <span className="meter__currency">$</span>
                <input
                  className="meter__input"
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") return;
                    setAmountSafe(Number(v));
                  }}
                  aria-label="billboard amount in dollars"
                />
              </span>
              <button className="meter__step" onClick={() => step(1)} aria-label="raise the amount by 1">
                +
              </button>
            </span>
          </h1>

          <form className="claim" onSubmit={submit}>
            <input
              className="claim__domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="yourcompany.com"
              spellCheck={false}
              aria-label="your domain"
            />

            <div className="cat" ref={catRef}>
              <button
                type="button"
                className="cat__trigger"
                onClick={() => setCatOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={catOpen}
              >
                {category ?? "Choose a category"}
                <span className="cat__chevron" aria-hidden="true">▾</span>
              </button>
              {catOpen && (
                <div className="cat__panel" role="listbox">
                  <input
                    className="cat__search"
                    value={catQuery}
                    onChange={(e) => setCatQuery(e.target.value)}
                    placeholder="Search categories…"
                    autoFocus
                    spellCheck={false}
                  />
                  <ul className="cat__list">
                    {filteredCategories.map((c) => (
                      <li key={c}>
                        <button
                          type="button"
                          className={`cat__item ${c === category ? "active" : ""}`}
                          onClick={() => {
                            setCategory(c);
                            setCatOpen(false);
                            setCatQuery("");
                          }}
                        >
                          {c}
                        </button>
                      </li>
                    ))}
                    {filteredCategories.length === 0 && <li className="cat__empty">No match.</li>}
                  </ul>
                </div>
              )}
            </div>

            <button type="submit" className="cta" disabled={busy}>
              {busy ? "…" : "Plant my billboard"}
            </button>
          </form>

          {/* the single line about #1 — click it to load the winning amount */}
          {flash ? (
            <p className="lede">{flash}</p>
          ) : top ? (
            <button className="lede lede--action" onClick={() => setAmountSafe(top.amount + 1)}>
              {top.name} holds #1 with {fmtUSD(top.amount)} —{" "}
              <span>outgrow them for {fmtUSD(top.amount + 1)}</span>
            </button>
          ) : (
            <p className="lede">Be the first billboard on the highway.</p>
          )}
        </div>
      </div>

      {perf && <PerfPanel />}
      {debug && <DebugPanel />}
    </>
  );
}
