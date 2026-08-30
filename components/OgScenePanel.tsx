"use client";
import { useRef, useState } from "react";
import type { OgBillboardData } from "./OgBillboardScene";
import {
  DEFAULT_SCENE_CONFIG,
  type BushItem,
  type CameraConfig,
  type CloudItem,
  type GrassItem,
  type HillItem,
  type PoleItem,
  type RockItem,
  type SceneConfig,
  type TreeItem,
} from "./OgBillboardScene";

const CAMERA_FIELDS: { key: keyof CameraConfig; label: string; min: number; max: number; step: number }[] = [
  { key: "x", label: "pos x", min: -60, max: 60, step: 0.5 },
  { key: "y", label: "pos y", min: 0, max: 60, step: 0.5 },
  { key: "z", label: "pos z", min: 5, max: 100, step: 0.5 },
  { key: "lookX", label: "look x", min: -60, max: 60, step: 0.5 },
  { key: "lookY", label: "look y", min: 0, max: 60, step: 0.5 },
  { key: "lookZ", label: "look z", min: -60, max: 60, step: 0.5 },
  { key: "fov", label: "fov", min: 20, max: 90, step: 1 },
];

function encodeScene(scene: SceneConfig): string {
  return encodeURIComponent(JSON.stringify(scene));
}

// Scene-builder panel for /og-render?debug=1 — fully malleable 3D OG scene:
// drag the panel anywhere, move the camera, and add/move/remove every tree,
// rock, cloud and hill, on top of the existing billboard-content fields.
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

  const updateTree = (i: number, patch: Partial<TreeItem>) => {
    onSceneChange({ ...scene, trees: scene.trees.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });
  };
  const addTree = () => onSceneChange({ ...scene, trees: [...scene.trees, { kind: "round", x: 0, z: -20, scale: 1 }] });
  const removeTree = (i: number) => onSceneChange({ ...scene, trees: scene.trees.filter((_, idx) => idx !== i) });

  const updateRock = (i: number, patch: Partial<RockItem>) => {
    onSceneChange({ ...scene, rocks: scene.rocks.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  };
  const addRock = () => onSceneChange({ ...scene, rocks: [...scene.rocks, { x: 0, z: 5, scale: 0.5 }] });
  const removeRock = (i: number) => onSceneChange({ ...scene, rocks: scene.rocks.filter((_, idx) => idx !== i) });

  const updateBush = (i: number, patch: Partial<BushItem>) => {
    onSceneChange({ ...scene, bushes: scene.bushes.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) });
  };
  const addBush = () => onSceneChange({ ...scene, bushes: [...scene.bushes, { x: 0, z: 3, scale: 1 }] });
  const removeBush = (i: number) => onSceneChange({ ...scene, bushes: scene.bushes.filter((_, idx) => idx !== i) });

  const updateGrass = (i: number, patch: Partial<GrassItem>) => {
    onSceneChange({ ...scene, grass: scene.grass.map((g, idx) => (idx === i ? { ...g, ...patch } : g)) });
  };
  const addGrass = () => onSceneChange({ ...scene, grass: [...scene.grass, { x: 0, z: -5, scale: 1 }] });
  const removeGrass = (i: number) => onSceneChange({ ...scene, grass: scene.grass.filter((_, idx) => idx !== i) });

  const updatePole = (i: number, patch: Partial<PoleItem>) => {
    onSceneChange({ ...scene, poles: scene.poles.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  };
  const addPole = () => onSceneChange({ ...scene, poles: [...scene.poles, { x: 20, z: 16, scale: 1 }] });
  const removePole = (i: number) => onSceneChange({ ...scene, poles: scene.poles.filter((_, idx) => idx !== i) });

  const updateCloud = (i: number, patch: Partial<CloudItem>) => {
    onSceneChange({ ...scene, clouds: scene.clouds.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  };
  const addCloud = () => onSceneChange({ ...scene, clouds: [...scene.clouds, { x: 0, y: 30, z: -60, scale: 3 }] });
  const removeCloud = (i: number) => onSceneChange({ ...scene, clouds: scene.clouds.filter((_, idx) => idx !== i) });

  const updateHill = (i: number, patch: Partial<HillItem>) => {
    onSceneChange({ ...scene, hills: scene.hills.map((h, idx) => (idx === i ? { ...h, ...patch } : h)) });
  };
  const addHill = () => onSceneChange({ ...scene, hills: [...scene.hills, { x: 0, z: -80, sx: 60, sy: 13 }] });
  const removeHill = (i: number) => onSceneChange({ ...scene, hills: scene.hills.filter((_, idx) => idx !== i) });

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
            <h4>Trees ({scene.trees.length})</h4>
            {scene.trees.map((t, i) => (
              <div key={i} className="og-item-row">
                <select value={t.kind} onChange={(e) => updateTree(i, { kind: e.target.value as TreeItem["kind"] })}>
                  <option value="round">round</option>
                  <option value="tall">tall</option>
                  <option value="pine">pine</option>
                </select>
                <input type="number" step={0.5} value={t.x} onChange={(e) => updateTree(i, { x: Number(e.target.value) })} title="x" />
                <input type="number" step={0.5} value={t.z} onChange={(e) => updateTree(i, { z: Number(e.target.value) })} title="z" />
                <input
                  type="number"
                  step={0.05}
                  value={t.scale}
                  onChange={(e) => updateTree(i, { scale: Number(e.target.value) })}
                  title="scale"
                />
                <button onClick={() => removeTree(i)}>×</button>
              </div>
            ))}
            <button onClick={addTree} style={{ width: "100%" }}>
              + tree
            </button>
          </section>

          <section>
            <h4>Rocks ({scene.rocks.length})</h4>
            {scene.rocks.map((r, i) => (
              <div key={i} className="og-item-row og-item-row-3">
                <input type="number" step={0.5} value={r.x} onChange={(e) => updateRock(i, { x: Number(e.target.value) })} title="x" />
                <input type="number" step={0.5} value={r.z} onChange={(e) => updateRock(i, { z: Number(e.target.value) })} title="z" />
                <input
                  type="number"
                  step={0.05}
                  value={r.scale}
                  onChange={(e) => updateRock(i, { scale: Number(e.target.value) })}
                  title="scale"
                />
                <button onClick={() => removeRock(i)}>×</button>
              </div>
            ))}
            <button onClick={addRock} style={{ width: "100%" }}>
              + rock
            </button>
          </section>

          <section>
            <h4>Bushes ({scene.bushes.length})</h4>
            {scene.bushes.map((b, i) => (
              <div key={i} className="og-item-row og-item-row-3">
                <input type="number" step={0.5} value={b.x} onChange={(e) => updateBush(i, { x: Number(e.target.value) })} title="x" />
                <input type="number" step={0.5} value={b.z} onChange={(e) => updateBush(i, { z: Number(e.target.value) })} title="z" />
                <input
                  type="number"
                  step={0.05}
                  value={b.scale}
                  onChange={(e) => updateBush(i, { scale: Number(e.target.value) })}
                  title="scale"
                />
                <button onClick={() => removeBush(i)}>×</button>
              </div>
            ))}
            <button onClick={addBush} style={{ width: "100%" }}>
              + bush
            </button>
          </section>

          <section>
            <h4>Grass tufts ({scene.grass.length})</h4>
            {scene.grass.map((g, i) => (
              <div key={i} className="og-item-row og-item-row-3">
                <input type="number" step={0.5} value={g.x} onChange={(e) => updateGrass(i, { x: Number(e.target.value) })} title="x" />
                <input type="number" step={0.5} value={g.z} onChange={(e) => updateGrass(i, { z: Number(e.target.value) })} title="z" />
                <input
                  type="number"
                  step={0.05}
                  value={g.scale}
                  onChange={(e) => updateGrass(i, { scale: Number(e.target.value) })}
                  title="scale"
                />
                <button onClick={() => removeGrass(i)}>×</button>
              </div>
            ))}
            <button onClick={addGrass} style={{ width: "100%" }}>
              + grass tuft
            </button>
          </section>

          <section>
            <h4>Poles ({scene.poles.length})</h4>
            {scene.poles.map((p, i) => (
              <div key={i} className="og-item-row og-item-row-3">
                <input type="number" step={0.5} value={p.x} onChange={(e) => updatePole(i, { x: Number(e.target.value) })} title="x" />
                <input type="number" step={0.5} value={p.z} onChange={(e) => updatePole(i, { z: Number(e.target.value) })} title="z" />
                <input
                  type="number"
                  step={0.05}
                  value={p.scale}
                  onChange={(e) => updatePole(i, { scale: Number(e.target.value) })}
                  title="scale"
                />
                <button onClick={() => removePole(i)}>×</button>
              </div>
            ))}
            <button onClick={addPole} style={{ width: "100%" }}>
              + pole
            </button>
          </section>

          <section>
            <h4>Clouds ({scene.clouds.length})</h4>
            {scene.clouds.map((c, i) => (
              <div key={i} className="og-item-row og-item-row-4">
                <input type="number" step={1} value={c.x} onChange={(e) => updateCloud(i, { x: Number(e.target.value) })} title="x" />
                <input type="number" step={1} value={c.y} onChange={(e) => updateCloud(i, { y: Number(e.target.value) })} title="y" />
                <input type="number" step={1} value={c.z} onChange={(e) => updateCloud(i, { z: Number(e.target.value) })} title="z" />
                <input
                  type="number"
                  step={0.1}
                  value={c.scale}
                  onChange={(e) => updateCloud(i, { scale: Number(e.target.value) })}
                  title="scale"
                />
                <button onClick={() => removeCloud(i)}>×</button>
              </div>
            ))}
            <button onClick={addCloud} style={{ width: "100%" }}>
              + cloud
            </button>
          </section>

          <section>
            <h4>Hills ({scene.hills.length})</h4>
            {scene.hills.map((h, i) => (
              <div key={i} className="og-item-row og-item-row-4">
                <input type="number" step={1} value={h.x} onChange={(e) => updateHill(i, { x: Number(e.target.value) })} title="x" />
                <input type="number" step={1} value={h.z} onChange={(e) => updateHill(i, { z: Number(e.target.value) })} title="z" />
                <input
                  type="number"
                  step={1}
                  value={h.sx}
                  onChange={(e) => updateHill(i, { sx: Number(e.target.value) })}
                  title="width"
                />
                <input
                  type="number"
                  step={0.5}
                  value={h.sy}
                  onChange={(e) => updateHill(i, { sy: Number(e.target.value) })}
                  title="height"
                />
                <button onClick={() => removeHill(i)}>×</button>
              </div>
            ))}
            <button onClick={addHill} style={{ width: "100%" }}>
              + hill
            </button>
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
