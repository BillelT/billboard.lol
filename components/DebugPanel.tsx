"use client";
import { useRef, useState } from "react";
import {
  DEBUG_GROUPS,
  bumpRebuild,
  debugState,
  getByPath,
  setByPath,
  type DebugField,
} from "@/lib/debugState";

// Lazy-loaded tuning UI (?debug=1). "Copy values" puts the whole state on the
// clipboard so tuned numbers can be pasted straight back into the defaults.
export default function DebugPanel() {
  const [, force] = useState(0);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  // Dragging moves the panel off its default corner — off by default (null),
  // set once the header is grabbed. Kept as plain left/top px rather than a
  // transform so it composes with the panel's own `resize: both`.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const update = (field: DebugField, value: number | string) => {
    setByPath(field.path, value);
    if (field.rebuild) bumpRebuild();
    force((n) => n + 1);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(debugState, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onHeadDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // let the open/close and copy buttons keep their own click behavior
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = { startX: e.clientX, startY: e.clientY, originX: rect.left, originY: rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onHeadMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const { startX, startY, originX, originY } = drag.current;
    setPos({
      x: Math.max(0, originX + (e.clientX - startX)),
      y: Math.max(0, originY + (e.clientY - startY)),
    });
  };

  const onHeadUp = () => {
    drag.current = null;
  };

  return (
    <div
      ref={panelRef}
      className={`dbg ${open ? "" : "dbg-collapsed"}`}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      <div className="dbg-head" onPointerDown={onHeadDown} onPointerMove={onHeadMove} onPointerUp={onHeadUp}>
        <button onClick={() => setOpen((o) => !o)}>{open ? "▾" : "▸"} debug</button>
        {open && <button onClick={copy}>{copied ? "copied ✓" : "copy values"}</button>}
      </div>

      {open &&
        DEBUG_GROUPS.map(({ group, fields }) => (
          <section key={group}>
            <h4>{group}</h4>
            {fields.map((f) => {
              const value = getByPath(f.path);
              if (f.type === "select") {
                return (
                  <label key={f.path} className="dbg-row">
                    <span>{f.label}</span>
                    <select value={String(value)} onChange={(e) => update(f, e.target.value)}>
                      {f.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }
              if (f.type === "color") {
                return (
                  <label key={f.path} className="dbg-row">
                    <span>{f.label}</span>
                    <input
                      type="color"
                      value={String(value)}
                      onChange={(e) => update(f, e.target.value)}
                    />
                  </label>
                );
              }
              return (
                <label key={f.path} className="dbg-row" title={f.hint}>
                  <span>{f.label}</span>
                  <input
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={Number(value)}
                    onChange={(e) => update(f, Number(e.target.value))}
                  />
                  <b>{Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 })}</b>
                </label>
              );
            })}
          </section>
        ))}
    </div>
  );
}
