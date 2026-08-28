"use client";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { debugState, sunPosition } from "@/lib/debugState";

// Applies the live debug values to the running scene every frame. Cheap
// assignments only: anything needing a rebuild goes through the rebuild
// version instead. Mounted solely when ?debug=1.
export default function DebugSync() {
  const { scene, gl, camera } = useThree();
  const mode = useRef(debugState.fog.mode);
  const fov = useRef(debugState.camera.fov);
  const color = useRef(new THREE.Color());

  // swapping fog type changes the shader, so it needs a material recompile
  const applyFogMode = (next: "linear" | "exp2") => {
    scene.fog =
      next === "exp2"
        ? new THREE.FogExp2(debugState.fog.color, debugState.fog.density)
        : new THREE.Fog(debugState.fog.color, debugState.fog.near, debugState.fog.far);
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (!m) return;
      (Array.isArray(m) ? m : [m]).forEach((mat) => (mat.needsUpdate = true));
    });
  };

  useEffect(() => {
    applyFogMode(debugState.fog.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const d = debugState;

    if (d.fog.mode !== mode.current) {
      mode.current = d.fog.mode;
      applyFogMode(d.fog.mode);
    }
    const fog = scene.fog;
    if (fog instanceof THREE.FogExp2) {
      fog.density = d.fog.density;
      fog.color.set(d.fog.color);
    } else if (fog instanceof THREE.Fog) {
      fog.near = d.fog.near;
      fog.far = d.fog.far;
      fog.color.set(d.fog.color);
    }

    gl.toneMappingExposure = d.light.exposure;

    const sun = scene.getObjectByName("sun") as THREE.DirectionalLight | undefined;
    if (sun) {
      sun.intensity = d.light.sun;
      sun.position.set(...sunPosition());
    }
    const hemi = scene.getObjectByName("hemi") as THREE.HemisphereLight | undefined;
    if (hemi) hemi.intensity = d.light.hemi;

    const sky = scene.getObjectByName("sky") as THREE.Mesh | undefined;
    const mat = sky?.material as THREE.ShaderMaterial | undefined;
    if (mat?.uniforms) {
      (mat.uniforms.uZenith.value as THREE.Color).set(d.sky.zenith);
      (mat.uniforms.uHorizon.value as THREE.Color).set(color.current.set(d.sky.horizon));
    }

    if (d.camera.fov !== fov.current) {
      fov.current = d.camera.fov;
      (camera as THREE.PerspectiveCamera).fov = d.camera.fov;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  });

  return null;
}
