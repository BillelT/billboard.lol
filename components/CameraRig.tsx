"use client";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { scrollState } from "@/lib/scrollState";
import { debugState } from "@/lib/debugState";
import { interactionState } from "@/lib/interactionState";
import { BILL_Z, type SceneLayout } from "@/lib/layout";

// One scroll value drives both the ride down the road and the descent from the
// aerial opening to a car-height point of view. Camera keys are derived from the
// billboard layout so the framing adapts to whatever the ranking looks like.
export default function CameraRig({ layout }: { layout: SceneLayout }) {
  const progress = useRef(0);
  const v1 = useRef(new THREE.Vector3());
  const v2 = useRef(new THREE.Vector3());

  const curves = useMemo(() => {
    const posKeys: THREE.Vector3[] = [];
    const lookKeys: THREE.Vector3[] = [];
    const first = layout.items[0];
    if (first) {
      // aerial opening: #1 sits right of center with air around it
      posKeys.push(
        new THREE.Vector3(first.x - first.panelW * 0.6, first.totalH * 1.15, BILL_Z + first.totalH * 2.0 + 18),
      );
      lookKeys.push(new THREE.Vector3(first.x - first.panelW * 0.18, first.totalH * 0.48, BILL_Z));
    }
    for (const it of layout.items) {
      posKeys.push(
        new THREE.Vector3(
          it.x - it.panelW * 0.1,
          Math.max(4, it.totalH * 1.05 + 2),
          BILL_Z + Math.max(it.totalH * 2.1, 20) + 17,
        ),
      );
      lookKeys.push(new THREE.Vector3(it.x + it.panelW * 0.16, it.poleH * 1.5, BILL_Z + 10));
    }
    // roll out past the last billboard at car height
    posKeys.push(new THREE.Vector3(layout.endX + 12, 2.6, 3.5));
    lookKeys.push(new THREE.Vector3(layout.endX + 50, 3.2, -5));
    // an empty ranking leaves a single key, which is not a curve
    if (posKeys.length < 2) {
      posKeys.unshift(new THREE.Vector3(posKeys[0].x - 60, 14, posKeys[0].z + 40));
      lookKeys.unshift(new THREE.Vector3(lookKeys[0].x - 30, 3.2, BILL_Z));
    }
    const pos = new THREE.CatmullRomCurve3(posKeys, false, "centripetal", 0.5);
    const look = new THREE.CatmullRomCurve3(lookKeys, false, "centripetal", 0.5);
    // Scroll is measured in road, not in keyframes: without this the camera
    // crawls between two close billboards and leaps between two far ones, which
    // is what made the opening feel like it took a page of scroll to unstick.
    pos.arcLengthDivisions = Math.max(200, posKeys.length * 24);
    const length = pos.getLength(); // primes the arc-length cache, off the render loop
    return { pos, look, length };
  }, [layout]);

  useFrame(({ camera }, dt) => {
    // GrabNav raycasts against this on a tap — it lives outside the canvas
    // and has no other way to reach the camera the rig is driving.
    interactionState.camera = camera;
    const target = scrollState.target;
    let p = THREE.MathUtils.damp(progress.current, target, debugState.motion.follow, dt);
    // damping only ever approaches its target; snapping the last hair off keeps
    // the camera from creeping for a second after the scroll has stopped
    if (Math.abs(target - p) < 1e-4) p = target;
    progress.current = p;
    const u = THREE.MathUtils.clamp(p, 0, 1);
    // equal scroll = equal ground covered
    const t = curves.pos.getUtoTmapping(u, u * curves.length);
    curves.pos.getPoint(t, v1.current);
    curves.look.getPoint(t, v2.current);
    // subtle pointer parallax
    v1.current.x += scrollState.pointer.x * 1.5;
    v1.current.y += -scrollState.pointer.y * 0.9;
    camera.position.copy(v1.current);
    camera.lookAt(v2.current);
  });

  return null;
}
