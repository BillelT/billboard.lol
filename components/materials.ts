"use client";
import * as THREE from "three";
import { PAL } from "@/lib/palette";
import { debugState } from "@/lib/debugState";

// One shared lit material for all vertex-colored geometry in the scene.
export const vertexColorMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0,
});

interface EdgeFogShader {
  uniforms: {
    uEdgeStart: { value: number };
    uEdgeRange: { value: number };
    uStartX: { value: number };
    uEndX: { value: number };
    uFogColor: { value: THREE.Color };
  };
}

// The road is flat-colored, so unlike the vertex-colored ground/decor it can't
// fade toward the fog color per-vertex — this patches the fragment shader to
// blend toward it based on world-space x once past layout.startX/endX, so the
// pavement disappears into the same haze as the tree line around it instead
// of just stopping. Uniforms are kept live by syncEdgeFogUniforms (called from
// a useFrame) rather than baked in, so the debug panel's Edge fog sliders
// update it without a geometry rebuild.
export function makeEdgeFogMaterial(color: string, roughness: number): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color, roughness });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uEdgeStart = { value: debugState.edgeFog.start };
    shader.uniforms.uEdgeRange = { value: debugState.edgeFog.range };
    shader.uniforms.uStartX = { value: 0 };
    shader.uniforms.uEndX = { value: 0 };
    shader.uniforms.uFogColor = { value: new THREE.Color(PAL.fog) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vEdgeWorldPos;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvEdgeWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vEdgeWorldPos;
uniform float uEdgeStart;
uniform float uEdgeRange;
uniform float uStartX;
uniform float uEndX;
uniform vec3 uFogColor;`,
      )
      .replace(
        "#include <fog_fragment>",
        `#include <fog_fragment>
{
  float distPastEdge = max(uStartX - vEdgeWorldPos.x, vEdgeWorldPos.x - uEndX);
  distPastEdge = max(distPastEdge, 0.0);
  float edgeT = clamp((distPastEdge - uEdgeStart) / max(1.0, uEdgeRange), 0.0, 1.0);
  edgeT = edgeT * edgeT * (3.0 - 2.0 * edgeT);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, edgeT);
}`,
      );
    material.userData.edgeFogShader = shader as unknown as EdgeFogShader;
  };
  return material;
}

// Called every frame (cheap: a handful of float writes) so dragging the
// debug panel's Edge fog sliders, or a layout change, shows up immediately.
export function syncEdgeFogUniforms(material: THREE.Material, startX: number, endX: number): void {
  const shader = material.userData.edgeFogShader as EdgeFogShader | undefined;
  if (!shader) return;
  shader.uniforms.uEdgeStart.value = debugState.edgeFog.start;
  shader.uniforms.uEdgeRange.value = debugState.edgeFog.range;
  shader.uniforms.uStartX.value = startX;
  shader.uniforms.uEndX.value = endX;
}
