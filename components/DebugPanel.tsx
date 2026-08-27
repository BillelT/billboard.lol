"use client";
import { useState } from "react";
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

  return (
    <div className={`dbg ${open ? "" : "dbg-collapsed"}`}>
      <div className="dbg-head">
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
