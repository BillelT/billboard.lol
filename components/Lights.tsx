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
        shadow-camera-left={-145}
        shadow-camera-right={145}
        shadow-camera-top={115}
        shadow-camera-bottom={-115}
        shadow-camera-near={1}
        shadow-camera-far={400}
        shadow-normalBias={0.06}
        shadow-bias={-0.0002}
      />
      <object3D ref={target} position={[0, 0, -10]} />
    </group>
  );
}
