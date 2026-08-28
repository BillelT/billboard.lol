"use client";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { mulberry32, lerp } from "@/lib/rng";
import { makeBirdBodyGeometry, makeBirdWingGeometry } from "@/lib/geometry";
import { BILL_Z, type SceneLayout } from "@/lib/layout";
import { vertexColorMat } from "./materials";

const COUNT = 16;

// Low-poly birds wandering the sky. Unlike the helicopter — one straight pass on
// a fixed line — each bird rides its own lissajous loop, so no two ever repeat
// the same path and they drift rather than commute. Three InstancedMeshes
// (bodies, right wings, left wings) keep the whole flock at three draw calls.
export default function Birds({ layout }: { layout: SceneLayout }) {
  const maxTop = useMemo(
    () => layout.items.reduce((m, it) => Math.max(m, it.totalH), 0),
    [layout.items],
  );

  const { bodies, wingR, wingL, birds } = useMemo(() => {
    const rng = mulberry32(4242);
    const body = makeBirdBodyGeometry();
    const wing = makeBirdWingGeometry();
    const bodies = new THREE.InstancedMesh(body, vertexColorMat, COUNT);
    const wingR = new THREE.InstancedMesh(wing, vertexColorMat, COUNT);
    const wingL = new THREE.InstancedMesh(wing, vertexColorMat, COUNT);
    for (const m of [bodies, wingR, wingL]) m.frustumCulled = false;

    const span = layout.endX - layout.startX;
    // same rule as the clouds: never cross a billboard face — stay well behind
    // the billboard line, or high enough to clear the tallest panel
    const birds = Array.from({ length: COUNT }, () => {
      const behind = rng() < 0.5;
      const z = behind ? lerp(-230, BILL_Z - 55, rng()) : lerp(BILL_Z + 35, 55, rng());
      const floor = behind ? 45 : maxTop + 26;
      return {
        cx: lerp(layout.startX - 40, layout.startX + span * 0.9, rng()),
        cy: lerp(floor, floor + 46, rng()),
        cz: z,
        rx: lerp(45, 130, rng()),
        rz: lerp(18, 55, rng()),
        ry: lerp(2.5, 7, rng()),
        wx: lerp(0.05, 0.12, rng()),
        wz: lerp(0.07, 0.19, rng()), // deliberately off-ratio from wx: the loop never closes
        wy: lerp(0.3, 0.7, rng()),
        px: rng() * Math.PI * 2,
        pz: rng() * Math.PI * 2,
        py: rng() * Math.PI * 2,
        flap: lerp(4.5, 8, rng()),
        flapPhase: rng() * Math.PI * 2,
        glide: lerp(0.18, 0.4, rng()), // how often it stops beating and coasts
        scale: lerp(1.6, 2.9, rng()),
      };
    });
    return { bodies, wingR, wingL, birds };
  }, [layout.startX, layout.endX, maxTop]);

  useEffect(
    () => () => {
      bodies.geometry.dispose();
      wingR.geometry.dispose();
      [bodies, wingR, wingL].forEach((m) => m.dispose());
    },
    [bodies, wingR, wingL],
  );

  const tmp = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      ahead: new THREE.Vector3(),
      bird: new THREE.Matrix4(),
      local: new THREE.Matrix4(),
      out: new THREE.Matrix4(),
      quat: new THREE.Quaternion(),
      spin: new THREE.Quaternion(),
      wing: new THREE.Quaternion(),
      euler: new THREE.Euler(),
      offset: new THREE.Vector3(),
      one: new THREE.Vector3(1, 1, 1),
      scale: new THREE.Vector3(),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      const px = (u: number) => b.cx + Math.sin(u * b.wx + b.px) * b.rx;
      const py = (u: number) =>
        b.cy + Math.sin(u * b.wy + b.py) * b.ry + Math.sin(u * 0.23 + b.px) * 3;
      const pz = (u: number) => b.cz + Math.sin(u * b.wz + b.pz) * b.rz;

      tmp.pos.set(px(t), py(t), pz(t));
      tmp.ahead.set(px(t + 0.4) - tmp.pos.x, py(t + 0.4) - tmp.pos.y, pz(t + 0.4) - tmp.pos.z);
      const yaw = Math.atan2(-tmp.ahead.z, tmp.ahead.x);
      // bank into the turn: compare the heading a step further along the loop
      const yawAhead = Math.atan2(
        -(pz(t + 1.2) - pz(t + 0.4)),
        px(t + 1.2) - px(t + 0.4),
      );
      let turn = yawAhead - yaw;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      const roll = THREE.MathUtils.clamp(turn * 1.6, -0.5, 0.5);
      const pitch = THREE.MathUtils.clamp(-tmp.ahead.y * 0.12, -0.3, 0.3);

      tmp.euler.set(0, yaw, 0, "XYZ");
      tmp.quat.setFromEuler(tmp.euler);
      tmp.euler.set(roll, 0, pitch, "XYZ");
      tmp.spin.setFromEuler(tmp.euler);
      tmp.quat.multiply(tmp.spin);
      tmp.scale.setScalar(b.scale);
      tmp.bird.compose(tmp.pos, tmp.quat, tmp.scale);
      bodies.setMatrixAt(i, tmp.bird);

      // beat hard, then coast: a slow envelope drops the stroke to almost
      // nothing on its own cycle, which is what reads as a bird rather than a
      // metronome
      const beat = Math.max(0.06, Math.sin(t * b.glide + b.flapPhase) * 0.5 + 0.55);
      const f = Math.sin(t * b.flap + b.flapPhase) * 0.85 * beat - 0.1;

      tmp.offset.set(0, 0.06, 0.1);
      tmp.euler.set(f, 0, 0, "XYZ");
      tmp.wing.setFromEuler(tmp.euler);
      tmp.local.compose(tmp.offset, tmp.wing, tmp.one);
      tmp.out.multiplyMatrices(tmp.bird, tmp.local);
      wingR.setMatrixAt(i, tmp.out);

      tmp.offset.set(0, 0.06, -0.1);
      tmp.euler.set(-f, Math.PI, 0, "XYZ");
      tmp.wing.setFromEuler(tmp.euler);
      tmp.local.compose(tmp.offset, tmp.wing, tmp.one);
      tmp.out.multiplyMatrices(tmp.bird, tmp.local);
      wingL.setMatrixAt(i, tmp.out);
    }
    bodies.instanceMatrix.needsUpdate = true;
    wingR.instanceMatrix.needsUpdate = true;
    wingL.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <primitive object={bodies} />
      <primitive object={wingR} />
      <primitive object={wingL} />
    </>
  );
}
