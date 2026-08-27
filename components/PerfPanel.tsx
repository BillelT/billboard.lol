"use client";
import { useEffect, useState } from "react";
import { perfState } from "@/lib/perfState";

// Dev overlay: add ?perf=1 to the URL. Never mounted otherwise.
export default function PerfPanel() {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  const rows: [string, string][] = [
    ["fps", `${perfState.fps} (${perfState.ms}ms)`],
    ["draw calls", String(perfState.calls)],
    ["triangles", perfState.triangles.toLocaleString("en-US")],
    ["textures", String(perfState.textures)],
    ["geometries", String(perfState.geometries)],
    ["programs", String(perfState.programs)],
    ["dpr", String(perfState.dpr)],
  ];

  return (
    <div className="perf" data-testid="perf">
      {rows.map(([k, v]) => (
        <div key={k} className="perf-row">
          <span>{k}</span>
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}
