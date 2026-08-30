"use client";
import { useState } from "react";
import type { OgBillboardData } from "./OgBillboardScene";

// Scene-builder panel for /og-render?debug=1 — lets you punch in any
// billboard data and see the exact 3D OG render update live, then grab a
// shareable URL or trigger a real screenshot through the same headless
// pipeline production uses (see app/api/og-preview/route.ts).
export default function OgScenePanel({
  data,
  onChange,
}: {
  data: OgBillboardData;
  onChange: (next: OgBillboardData) => void;
}) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const set = <K extends keyof OgBillboardData>(key: K, value: OgBillboardData[K]) => {
    onChange({ ...data, [key]: value });
  };

  const queryString = () => {
    const qs = new URLSearchParams();
    qs.set("name", data.name);
    qs.set("color", data.color);
    qs.set("amount", String(data.amount));
    if (data.description) qs.set("description", data.description);
    else if (data.title) qs.set("title", data.title);
    if (data.category) qs.set("category", data.category);
    if (data.clickCount != null) qs.set("clicks", String(data.clickCount));
    if (data.claimedAt) qs.set("claimedAt", data.claimedAt);
    return qs;
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/og-render?${queryString().toString()}&debug=1`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const renderPng = async () => {
    setRendering(true);
    setRenderError(null);
    try {
      const res = await fetch(`/api/og-preview?${queryString().toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      setRenderedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : "render failed");
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className={`dbg og-panel ${open ? "" : "dbg-collapsed"}`}>
      <div className="dbg-head">
        <button onClick={() => setOpen((o) => !o)}>{open ? "▾" : "▸"} og scene</button>
        {open && <button onClick={copyLink}>{copied ? "copied ✓" : "copy link"}</button>}
      </div>

      {open && (
        <>
          <section>
            <h4>Billboard</h4>
            <label className="dbg-row">
              <span>name</span>
              <input type="text" value={data.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className="dbg-row">
              <span>color</span>
              <input type="color" value={data.color} onChange={(e) => set("color", e.target.value)} />
            </label>
            <label className="dbg-row">
              <span>amount</span>
              <input
                type="number"
                value={data.amount}
                onChange={(e) => set("amount", Number(e.target.value))}
              />
            </label>
            <label className="dbg-row">
              <span>title</span>
              <input
                type="text"
                value={data.title ?? ""}
                onChange={(e) => set("title", e.target.value || null)}
              />
            </label>
            <label className="dbg-row">
              <span>description</span>
              <input
                type="text"
                value={data.description ?? ""}
                onChange={(e) => set("description", e.target.value || null)}
              />
            </label>
            <label className="dbg-row">
              <span>category</span>
              <input
                type="text"
                value={data.category ?? ""}
                onChange={(e) => set("category", e.target.value || null)}
              />
            </label>
            <label className="dbg-row">
              <span>clicks</span>
              <input
                type="number"
                value={data.clickCount ?? ""}
                onChange={(e) => set("clickCount", e.target.value === "" ? null : Number(e.target.value))}
              />
            </label>
            <label className="dbg-row">
              <span>claimed at</span>
              <input
                type="text"
                placeholder="ISO date"
                value={data.claimedAt ?? ""}
                onChange={(e) => set("claimedAt", e.target.value || null)}
              />
            </label>
          </section>

          <section>
            <h4>Render</h4>
            <button onClick={renderPng} disabled={rendering} style={{ width: "100%" }}>
              {rendering ? "rendering…" : "render PNG (real pipeline)"}
            </button>
            {renderError && <p className="og-panel-error">{renderError}</p>}
            {renderedUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={renderedUrl} alt="rendered OG preview" className="og-panel-preview" />
            )}
          </section>
        </>
      )}
    </div>
  );
}
