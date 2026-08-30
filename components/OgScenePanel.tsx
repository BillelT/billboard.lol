"use client";
import { useRef, useState } from "react";
import type { OgBillboardData } from "./OgBillboardScene";
import { DEFAULT_SCENE_CONFIG, type CameraConfig, type SceneConfig } from "./OgBillboardScene";
import OgSceneMap from "./OgSceneMap";

const CAMERA_FIELDS: { key: keyof CameraConfig; label: string; min: number; max: number; step: number }[] = [
  { key: "y", label: "height", min: 0, max: 30, step: 0.25 },
  { key: "lookY", label: "look height", min: 0, max: 30, step: 0.25 },
  { key: "fov", label: "fov", min: 20, max: 90, step: 1 },
];

function encodeScene(scene: SceneConfig): string {
  return encodeURIComponent(JSON.stringify(scene));
}

// Scene-builder panel for /og-render?debug=1 — fully malleable 3D OG scene:
// drag the panel anywhere, drag the camera/decor dots on the top-down map,
// tune height/fov with sliders, on top of the billboard-content fields.
export default function OgScenePanel({
  data,
  onDataChange,
  scene,
  onSceneChange,
}: {
  data: OgBillboardData;
  onDataChange: (next: OgBillboardData) => void;
  scene: SceneConfig;
  onSceneChange: (next: SceneConfig) => void;
}) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const setData = <K extends keyof OgBillboardData>(key: K, value: OgBillboardData[K]) => {
    onDataChange({ ...data, [key]: value });
  };

  const setCamera = (key: keyof CameraConfig, value: number) => {
    onSceneChange({ ...scene, camera: { ...scene.camera, [key]: value } });
  };

  const dataQuery = () => {
    const qs = new URLSearchParams();
    qs.set("name", data.name);
    qs.set("color", data.color);
    qs.set("amount", String(data.amount));
    if (data.description) qs.set("description", data.description);
    else if (data.title) qs.set("title", data.title);
    if (data.category) qs.set("category", data.category);
    if (data.clickCount != null) qs.set("clicks", String(data.clickCount));
    if (data.claimedAt) qs.set("claimedAt", data.claimedAt);
    qs.set("scene", encodeScene(scene));
    return qs;
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/og-render?${dataQuery().toString()}&debug=1`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const renderPng = async () => {
    setRendering(true);
    setRenderError(null);
    try {
      const res = await fetch(`/api/og-preview?${dataQuery().toString()}`);
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

  const resetScene = () => onSceneChange(DEFAULT_SCENE_CONFIG);

  const onHeadDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = { startX: e.clientX, startY: e.clientY, originX: rect.left, originY: rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHeadMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const { startX, startY, originX, originY } = drag.current;
    setPos({ x: Math.max(0, originX + (e.clientX - startX)), y: Math.max(0, originY + (e.clientY - startY)) });
  };
  const onHeadUp = () => {
    drag.current = null;
  };

  return (
    <div
      ref={panelRef}
      className={`dbg og-panel ${open ? "" : "dbg-collapsed"}`}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      <div className="dbg-head" onPointerDown={onHeadDown} onPointerMove={onHeadMove} onPointerUp={onHeadUp}>
        <button onClick={() => setOpen((o) => !o)}>{open ? "▾" : "▸"} og scene</button>
        {open && <button onClick={copyLink}>{copied ? "copied ✓" : "copy link"}</button>}
      </div>

      {open && (
        <>
          <section>
            <h4>Billboard</h4>
            <label className="dbg-row">
              <span>name</span>
              <input type="text" value={data.name} onChange={(e) => setData("name", e.target.value)} />
            </label>
            <label className="dbg-row">
              <span>color</span>
              <input type="color" value={data.color} onChange={(e) => setData("color", e.target.value)} />
            </label>
            <label className="dbg-row">
              <span>amount</span>
              <input type="number" value={data.amount} onChange={(e) => setData("amount", Number(e.target.value))} />
            </label>
            <label className="dbg-row">
              <span>title</span>
              <input type="text" value={data.title ?? ""} onChange={(e) => setData("title", e.target.value || null)} />
            </label>
            <label className="dbg-row">
              <span>description</span>
              <input
                type="text"
                value={data.description ?? ""}
                onChange={(e) => setData("description", e.target.value || null)}
              />
            </label>
            <label className="dbg-row">
              <span>category</span>
              <input
                type="text"
                value={data.category ?? ""}
                onChange={(e) => setData("category", e.target.value || null)}
              />
            </label>
            <label className="dbg-row">
              <span>clicks</span>
              <input
                type="number"
                value={data.clickCount ?? ""}
                onChange={(e) => setData("clickCount", e.target.value === "" ? null : Number(e.target.value))}
              />
            </label>
            <label className="dbg-row">
              <span>claimed at</span>
              <input
                type="text"
                placeholder="ISO date"
                value={data.claimedAt ?? ""}
                onChange={(e) => setData("claimedAt", e.target.value || null)}
              />
            </label>
          </section>

          <section>
            <h4>Scene map</h4>
            <p className="og-map-hint">
              Drag the dots to move decor, the ▲ to move the camera, the ring to aim it.
            </p>
            <OgSceneMap scene={scene} onSceneChange={onSceneChange} />
          </section>

          <section>
            <h4>Camera</h4>
            {CAMERA_FIELDS.map((f) => (
              <label key={f.key} className="dbg-row">
                <span>{f.label}</span>
                <input
                  type="range"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={scene.camera[f.key]}
                  onChange={(e) => setCamera(f.key, Number(e.target.value))}
                />
                <b>{scene.camera[f.key].toFixed(1)}</b>
              </label>
            ))}
          </section>

          <section>
            <h4>Render</h4>
            <button onClick={resetScene} style={{ width: "100%" }}>
              reset scene to default
            </button>
            <button onClick={renderPng} disabled={rendering} style={{ width: "100%", marginTop: 6 }}>
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
