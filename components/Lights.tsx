"use client";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PAL } from "@/lib/palette";
import { debugState, sunPosition } from "@/lib/debugState";

// One warm sun + hemisphere fill. The rig follows the camera along X so a single
// 2048 shadow map covers the whole drive with a tight frustum.
export default function Lights() {
  const rig = useRef<THREE.Group>(null);
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (light.current && target.current) light.current.target = target.current;
  }, []);

  useFrame(({ camera }) => {
    rig.current?.position.setX(camera.position.x);
  });

  return (
    <group ref={rig}>
      <hemisphereLight name="hemi" args={[PAL.hemiSky, PAL.hemiGround, debugState.light.hemi]} />
      <directionalLight
        ref={light}
        name="sun"
        color={PAL.sun}
        intensity={debugState.light.sun}
        position={sunPosition()}
        castShadow
        shadow-mapSize={[2048, 2048]}
        // Tight enough that a 2048 map still resolves the frame and the lamp
        // stems: a wider frustum spreads texels until a billboard's own face
        // starts self-shadowing in blotches.
        shadow-camera-left={-105}
        shadow-camera-right={105}
        shadow-camera-top={95}
        shadow-camera-bottom={-70}
        shadow-camera-near={1}
        shadow-camera-far={400}
        // Large flat panels are exactly where acne shows, and they are also
        // where a generous normal bias costs nothing — there is no fine
        // geometry here for the offset to eat into.
        shadow-normalBias={0.45}
        shadow-bias={-0.0008}
      />
      <object3D ref={target} position={[0, 0, -10]} />
    </group>
  );
}
