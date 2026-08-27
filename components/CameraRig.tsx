"use client";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { scrollState } from "@/lib/scrollState";
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
          Math.max(2.6, it.totalH * 0.62 + 1.3),
          BILL_Z + Math.max(it.totalH * 1.55, 15) + 5,
        ),
      );
      lookKeys.push(new THREE.Vector3(it.x + it.panelW * 0.16, it.poleH + it.panelH * 0.45, BILL_Z));
    }
    // roll out past the last billboard at car height
    posKeys.push(new THREE.Vector3(layout.endX + 12, 2.6, 3.5));
    lookKeys.push(new THREE.Vector3(layout.endX + 50, 3.2, -5));
    return {
      pos: new THREE.CatmullRomCurve3(posKeys, false, "centripetal", 0.5),
      look: new THREE.CatmullRomCurve3(lookKeys, false, "centripetal", 0.5),
    };
  }, [layout]);

  useFrame(({ camera }, dt) => {
    progress.current = THREE.MathUtils.damp(progress.current, scrollState.target, 2.4, dt);
    const p = THREE.MathUtils.clamp(progress.current, 0, 1);
    curves.pos.getPoint(p, v1.current);
    curves.look.getPoint(p, v2.current);
    // subtle pointer parallax
    v1.current.x += scrollState.pointer.x * 1.5;
    v1.current.y += -scrollState.pointer.y * 0.9;
    camera.position.copy(v1.current);
    camera.lookAt(v2.current);
  });

  return null;
}
