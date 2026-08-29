"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { computeLayout, driveLength, fmtFeet, fmtUSD } from "@/lib/layout";
import { CATEGORIES } from "@/lib/categories";
import { scrollState } from "@/lib/scrollState";
import { usePresence } from "@/lib/usePresence";
import { useVisits } from "@/lib/useVisits";
import { sceneAudio } from "@/lib/audio";
import { perfEnabled } from "@/lib/perfState";
import { debugEnabled, debugState } from "@/lib/debugState";
import { useRebuild } from "./useRebuild";
import PerfPanel from "./PerfPanel";

const DebugPanel = dynamic(() => import("./DebugPanel"), { ssr: false });

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg className="gauge__soundIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      {muted ? (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      ) : (
        <path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      )}
    </svg>
  );
}

// what /api/site-info reads off the domain: real favicon, real SEO copy, and the
// background colour picked from the icon
interface SiteInfo {
  domain: string;
  url: string;
  title: string | null;
  description: string | null;
  icon: string | null;
  color: string;
  resolved: boolean;
}

type Preview =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; info: SiteInfo };

const cleanDomain = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");

export default function Overlay() {
  const billboards = useStore((s) => s.billboards);
  const layout = useMemo(() => computeLayout(billboards), [billboards]);
  const top = layout.items[0];
  const totalBurned = useMemo(() => billboards.reduce((a, b) => a + b.amount, 0), [billboards]);
  const realCount = useMemo(() => billboards.filter((b) => !b.placeholder).length, [billboards]);
  const online = usePresence(realCount);
  const visits = useVisits();

  const [amount, setAmount] = useState(() => (top ? top.amount + 1 : 20));
  const [amountTouched, setAmountTouched] = useState(false);
  const [domain, setDomain] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview>({ state: "idle" });
  const [busy, setBusy] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [sound, setSound] = useState(false);
  const [volume, setVolume] = useState(1);
  const [claimOpen, setClaimOpen] = useState(false);
  // explicit pixel height while dragging/settling — null means "let it be
  // auto height", so the card itself shrinks instead of content sliding out
  // past its (unmoving) background
  const [heightOverride, setHeightOverride] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const formHeightRef = useRef(0);
  const dockRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const catMeasureRef = useRef<HTMLDivElement>(null);
  const domainRef = useRef<HTMLInputElement>(null);
  const claimRef = useRef<HTMLFormElement>(null);

  // the reveal-on-tap form, closed like an iOS sheet: drag its handle down
  // past a threshold to collapse it back to just the CTA. Shrinking the
  // form's own height (not translating it) keeps the paper background
  // shrinking along with it instead of the fields sliding out past it.
  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    formHeightRef.current = claimRef.current?.getBoundingClientRect().height ?? 0;
    setDragging(true);
    setHeightOverride(formHeightRef.current);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dy = Math.max(0, e.clientY - dragStartYRef.current);
    setHeightOverride(Math.max(0, formHeightRef.current - dy));
  };
  const endHandleDrag = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setDragging(false);
    setHeightOverride((h) => {
      const current = h ?? formHeightRef.current;
      const closing = formHeightRef.current > 0 && current < formHeightRef.current * 0.6;
      // animate the rest of the way (down to closed, or back open), then
      // hand height back to auto once the transition has settled
      window.setTimeout(() => {
        if (closing) setClaimOpen(false);
        setHeightOverride(null);
      }, 200);
      return closing ? 0 : formHeightRef.current;
    });
  };

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
    setVolume(sceneAudio.volume);
    return () => {
      off();
      disarm();
    };
  }, []);

  // trigger and dropdown share one width: the widest category label, so the
  // panel never looks narrower or wider than the button that opens it
  useEffect(() => {
    const el = catMeasureRef.current;
    if (!el || !catRef.current) return;
    const w = Math.max(0, ...Array.from(el.children).map((c) => (c as HTMLElement).offsetWidth));
    if (w) catRef.current.style.setProperty("--cat-w", `${Math.ceil(w)}px`);
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

  // live preview: the real favicon, the site's own SEO copy and the colour picked
  // from that icon — exactly what the paid billboard will show
  useEffect(() => {
    const name = cleanDomain(domain);
    if (!name.includes(".") || name.length < 4) {
      setPreview({ state: "idle" });
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setPreview({ state: "loading" });
      try {
        const res = await fetch(`/api/site-info?domain=${encodeURIComponent(name)}`, {
          signal: ctrl.signal,
        });
        const data = (await res.json()) as SiteInfo & { error?: string };
        if (!res.ok || data.error) setPreview({ state: "error" });
        else setPreview({ state: "ready", info: data });
      } catch {
        if (!ctrl.signal.aborted) setPreview({ state: "error" });
      }
    }, 450);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [domain]);

  // coming back from Stripe: the webhook plants the billboard, we just say so
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planted = params.get("planted");
    if (planted) setFlash(`Payment received — ${planted} is going up on the highway.`);
    else if (params.get("cancelled")) setFlash("Checkout cancelled — nothing was charged.");
    if (planted || params.get("cancelled")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const setAmountSafe = (n: number) => {
    setAmountTouched(true);
    setAmount(Math.max(1, Math.min(100000, Math.round(n))));
  };
  const step = (dir: 1 | -1) => setAmountSafe(amount + dir);

  // the suggested price always outgrows the current leader by $1, until the
  // visitor picks their own amount
  useEffect(() => {
    if (amountTouched) return;
    setAmount(top ? top.amount + 1 : 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top?.amount, amountTouched]);

  const changeVolume = (v: number) => {
    setVolume(v);
    if (v <= 0) {
      sceneAudio.disable();
      return;
    }
    if (!sceneAudio.enabled) sceneAudio.enable();
    sceneAudio.setVolume(v);
  };

  // What rank the entered amount would actually take among the real, claimed
  // billboards (placeholders aren't competitors). Shown once the visitor has
  // touched the amount — before that the suggested price is already set to
  // just beat #1, so "biggest billboard" already says it plainly.
  const realBillboards = useMemo(() => billboards.filter((b) => !b.placeholder), [billboards]);
  const rank = useMemo(
    () => realBillboards.filter((b) => b.amount >= amount).length + 1,
    [realBillboards, amount],
  );

  const filteredCategories = useMemo(
    () => CATEGORIES.filter((c) => c.toLowerCase().includes(catQuery.trim().toLowerCase())),
    [catQuery],
  );

  // there is no local path: a billboard exists once Stripe has taken the money
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = cleanDomain(domain);
    if (!name || busy) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount, category }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setFlash(data.error ?? "Something went wrong.");
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

  // a new billboard lengthens the page, so re-derive progress from the new height
  useEffect(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollState.target = max > 0 ? window.scrollY / max : 0;
  }, [scrollPx]);

  return (
    <>
      <div className="spacer" style={{ height: `${scrollPx}px`, minHeight: "200vh" }} />

      {/* the 3D stack climbs high, so the top stays reserved for the wordmark alone */}
      <header className="masthead">
        <button type="button" className="wordmark" aria-label="bidboard.lol">
          <span className="wordmark__sign" aria-hidden="true" />
          bidboard<em>.lol</em>
        </button>
      </header>

      <aside className="gauges">
        <div className="gauge gauge--live">
          <span className="gauge__dot" aria-hidden="true" />
          {online} on the road
        </div>
        <div className="gauge gauge--tallest">Tallest is {top ? fmtFeet(top.totalH) : "—"}</div>
        <div className="gauge gauge--planted">{realCount} billboards planted</div>
        <div className="gauge gauge--made">{fmtUSD(totalBurned)} made</div>
        <div className="gauge gauge--visitors">
          {visits !== null ? visits.toLocaleString("en-US") : "—"} visitors since launch
        </div>
        <div className="gauge gauge--sound">
          <button
            className="gauge__soundBtn"
            onClick={() => sceneAudio.toggle()}
            aria-pressed={sound}
            title={sound ? "Mute the highway" : "Hear the highway"}
          >
            Sound {sound ? "on" : "off"}
            <SoundIcon muted={!sound} />
          </button>
          <input
            className="gauge__volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Volume"
          />
        </div>
        <a
          className="gauge gauge--sig"
          href="https://x.com/billel_tighidet"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            className="gauge__avatar"
            src="https://www.google.com/s2/favicons?sz=64&domain=billeltighidet.fr"
            alt=""
            aria-hidden="true"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          Built by Billel
        </a>
      </aside>

      <div className={`hint ${scrolled ? "off" : ""}`}>scroll or grab to drive past the ranking ↔</div>

      {/* claim dock — anchored low so it never fights the billboards for the sky */}
      <div className="dock">
        <div className="dock__inner" ref={dockRef}>
          <h1 className="dock__title">
            {rank === 1 ? "Get the biggest billboard for" : `Get the #${rank} billboard for`}
            <span className="meter">
              <button className="meter__step" onClick={() => step(-1)} aria-label="lower the amount by 1">
                −
              </button>
              <span className="meter__value">
                <span className="meter__currency">$</span>
                <input
                  className="meter__input"
                  style={{ width: `${String(amount).length}ch` }}
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

          <form
            ref={claimRef}
            className={`claim ${claimOpen ? "claim--open" : ""} ${dragging ? "claim--dragging" : ""}`}
            onSubmit={submit}
            style={
              heightOverride !== null ? { height: heightOverride, overflow: "hidden" } : undefined
            }
          >
            {claimOpen && (
              <div
                className="claim__handle"
                onPointerDown={onHandlePointerDown}
                onPointerMove={onHandlePointerMove}
                onPointerUp={endHandleDrag}
                onPointerCancel={endHandleDrag}
                aria-hidden="true"
              />
            )}
            <input
              ref={domainRef}
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
              {/* off-screen clones of the trigger, one per label, just to measure the widest */}
              <div ref={catMeasureRef} aria-hidden="true" className="cat__measure">
                {["Choose a category", ...CATEGORIES].map((c) => (
                  <button key={c} type="button" className="cat__trigger">
                    {c}
                    <span className="cat__chevron" aria-hidden="true">▾</span>
                  </button>
                ))}
              </div>
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

            <button
              type="submit"
              className="cta"
              disabled={busy}
              onClick={(e) => {
                // collapsed on mobile: the first tap just reveals the form —
                // the input is display:none there, so offsetParent is null
                if (!claimOpen && domainRef.current?.offsetParent === null) {
                  e.preventDefault();
                  setClaimOpen(true);
                  requestAnimationFrame(() => domainRef.current?.focus());
                }
              }}
            >
              {busy ? "…" : "Plant my billboard"}
            </button>
          </form>

          {/* what the money buys, read off the domain itself */}
          {preview.state === "loading" && (
            <p className="peek peek--muted">reading {cleanDomain(domain)}…</p>
          )}
          {preview.state === "error" && (
            <p className="peek peek--muted">
              couldn&apos;t read {cleanDomain(domain)} — check the domain.
            </p>
          )}
          {preview.state === "ready" &&
            (preview.info.resolved || preview.info.icon ? (
              <div className="peek peek--card" style={{ background: preview.info.color }}>
                <span className="peek__tile">
                  {preview.info.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview.info.icon} alt="" width={34} height={34} />
                  ) : (
                    <b style={{ color: preview.info.color }}>
                      {preview.info.domain.charAt(0).toUpperCase()}
                    </b>
                  )}
                </span>
                <span className="peek__text">
                  <b>{preview.info.domain}</b>
                  <em>{preview.info.description ?? preview.info.title ?? "your ad, but bigger"}</em>
                </span>
                <span className="peek__note">your billboard</span>
              </div>
            ) : (
              <p className="peek peek--muted">
                couldn&apos;t reach {preview.info.domain} — check the domain.
              </p>
            ))}

          {flash && <p className="lede">{flash}</p>}

          <p className="dock__legal">
            By paying, you agree to our <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {perf && <PerfPanel />}
      {debug && <DebugPanel />}
    </>
  );
}
