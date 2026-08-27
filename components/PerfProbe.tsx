"use client";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { perfState } from "@/lib/perfState";

// Samples renderer counters into perfState ~4x a second.
export default function PerfProbe() {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ t: 0, frames: 0 });

  useFrame((_, dt) => {
    const a = acc.current;
    a.t += dt;
    a.frames += 1;
    if (a.t < 0.25) return;
    perfState.fps = Math.round(a.frames / a.t);
    perfState.ms = Math.round((a.t / a.frames) * 1000 * 10) / 10;
    perfState.calls = gl.info.render.calls;
    perfState.triangles = gl.info.render.triangles;
    perfState.textures = gl.info.memory.textures;
    perfState.geometries = gl.info.memory.geometries;
    perfState.programs = gl.info.programs?.length ?? 0;
    perfState.dpr = Math.round(gl.getPixelRatio() * 100) / 100;
    a.t = 0;
    a.frames = 0;
  });

  return null;
}
