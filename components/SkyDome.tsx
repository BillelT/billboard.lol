"use client";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PAL } from "@/lib/palette";

// Gradient sky + sun glow, dithered to kill banding. Includes three's tonemapping
// and colorspace chunks so it goes through the same ACES pipeline as the scene.
const vertexShader = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const fragmentShader = /* glsl */ `
varying vec3 vWorld;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSun;
uniform vec3 uSunDir;
void main() {
  vec3 dir = normalize(vWorld - cameraPosition);
  float h = clamp(dir.y, -1.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.55, h), 0.75));
  col = mix(uGround, col, smoothstep(-0.12, 0.02, h));
  float sd = max(dot(dir, normalize(uSunDir)), 0.0);
  col += uSun * (pow(sd, 400.0) * 0.9 + pow(sd, 6.0) * 0.07);
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) / 128.0;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export default function SkyDome() {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uZenith: { value: new THREE.Color(PAL.skyTop) },
          uHorizon: { value: new THREE.Color(PAL.skyHorizon) },
          uGround: { value: new THREE.Color(PAL.skyGround) },
          uSun: { value: new THREE.Color(PAL.sun) },
          uSunDir: { value: new THREE.Vector3(-0.35, 0.75, -0.55) },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );

  useFrame(({ camera }) => {
    ref.current?.position.set(camera.position.x, 0, camera.position.z);
  });

  return (
    <mesh ref={ref} name="sky" material={material} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[1500, 24, 16]} />
    </mesh>
  );
}
