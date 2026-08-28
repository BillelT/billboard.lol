"use client";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { NIGHT } from "@/lib/nightPalette";

// The daytime SkyDome (see SkyDome.tsx) redrawn for night: same gradient +
// dither approach, plus a crescent moon (two overlapping discs, one punched
// out of the other) and a scatter of twinkling stars, all in the fragment
// shader so the sky stays one draw call.
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
uniform vec3 uMoon;
uniform vec3 uMoonDir;
uniform vec3 uBiteDir;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 dir = normalize(vWorld - cameraPosition);
  float h = clamp(dir.y, -1.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.62, h), 0.62));
  col = mix(uGround, col, smoothstep(-0.12, 0.02, h));

  // crescent: a bright disc with a second, offset disc bitten out of it
  float dMoon = dot(dir, uMoonDir);
  float dBite = dot(dir, uBiteDir);
  float disc = smoothstep(0.99938, 0.99954, dMoon);
  float bite = smoothstep(0.99940, 0.99956, dBite);
  float crescent = clamp(disc - bite, 0.0, 1.0);
  col += uMoon * crescent;
  col += uMoon * pow(max(dMoon, 0.0), 900.0) * 0.4;

  // stars: sparse, twinkling, upper sky only
  if (h > 0.02) {
    vec2 cell = floor(dir.xz * 340.0 + dir.y * 191.0);
    float r = hash(cell);
    float star = step(0.9975, r) * smoothstep(0.02, 0.2, h);
    float tw = 0.55 + 0.45 * sin(uTime * 2.6 + r * 80.0);
    col += vec3(star * tw * 0.9);
  }

  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) / 128.0;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Aimed to actually land inside the static camera's frame (see
// Night404CameraRig) — up and to the right of the billboard, like the
// reference shot, rather than a generic "somewhere in the sky" direction.
const MOON_DIR = new THREE.Vector3(0.323, 0.109, -0.940).normalize();
const BITE_DIR = new THREE.Vector3(0.337, 0.108, -0.935).normalize();

export default function Night404SkyDome() {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uZenith: { value: new THREE.Color(NIGHT.skyTop) },
          uHorizon: { value: new THREE.Color(NIGHT.skyHorizon) },
          uGround: { value: new THREE.Color(NIGHT.skyGround) },
          uMoon: { value: new THREE.Color(NIGHT.moon) },
          uMoonDir: { value: MOON_DIR },
          uBiteDir: { value: BITE_DIR },
          uTime: { value: 0 },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );

  useFrame(({ camera, clock }) => {
    ref.current?.position.set(camera.position.x, 0, camera.position.z);
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh ref={ref} name="night-sky" material={material} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[1500, 24, 16]} />
    </mesh>
  );
}
