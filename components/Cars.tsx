"use client";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { makeCarGeometry, makePuffGeometry, makeShardGeometry } from "@/lib/geometry";
import { PAL } from "@/lib/palette";
import type { SceneLayout } from "@/lib/layout";
import { vertexColorMat } from "./materials";
import { placementOf, sceneAudio } from "@/lib/audio";
import { carHitState, carClickQueue, type CarBox } from "@/lib/carState";

// Tap a car and it hops — a straight vertical bounce, never off its lane, so
// the traffic never looks like it's swerving. Each tap within the streak
// jumps a little higher than the last (a "heat" value that cools on its own
// if you stop clicking); keep spamming one car and heat tops out and it
// blows itself up, then quietly respawns a moment later.
const GRAVITY = 30;
const BASE_IMPULSE = 4.2;
const HEAT_PER_CLICK = 1;
const HEAT_IMPULSE = 0.85; // extra jump velocity per point of heat
const HEAT_COOL_RATE = 2; // heat/sec lost while not clicking
const EXPLODE_AT = 3; // heat needed to blow up
const RESPAWN_TIME = 1.15; // seconds a car stays hidden after exploding

// each car honks now and then on its own; bumping it makes honks come faster
// for a little while, so a streak of taps turns into an angry car horn.
const HONK_INTERVAL_MIN = 7; // seconds between honks, calm car, lower bound
const HONK_INTERVAL_MAX = 22; // ...and upper bound
const HONK_BOOST_INTERVAL_MIN = 1.1; // fully riled up, lower bound
const HONK_BOOST_INTERVAL_MAX = 3.2; // ...and upper bound
const HONK_BOOST_PER_BUMP = 0.6;
const HONK_BOOST_DECAY = 0.35; // per second

const DUST_POOL = 36;
const DUST_LIFE = 0.34;
const SMOKE_LIFE = 0.85;
const SHARD_POOL = 60;
const SHARD_LIFE = 0.9;

const DUST_TINT = new THREE.Color("#efe7d6");
const SMOKE_TINT = new THREE.Color("#6b6459");
const SHARD_TINTS = [
  new THREE.Color("#e4572e"),
  new THREE.Color("#ffb238"),
  new THREE.Color("#2c2c30"),
  new THREE.Color("#8a5f3c"),
];

interface CarAnim {
  heat: number;
  jumpY: number;
  jumpVel: number;
  airborne: boolean;
  squashT: number;
  exploded: number; // seconds remaining hidden, 0 = alive and visible
  honkAt: number; // clock.elapsedTime of this car's next honk
  honkBoost: number; // 0..1, rises on bumps, cools down on its own
}

interface Puff {
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  smoke: boolean;
}

interface Shard {
  life: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  color: THREE.Color;
}

// Traffic in one InstancedMesh: per-car paint comes from instanceColor, which
// multiplies the white body while leaving the dark glass and tyres dark.
export default function Cars({ layout }: { layout: SceneLayout }) {
  const { mesh, lanes } = useMemo(() => {
    const count = PAL.carColors.length;
    const mesh = new THREE.InstancedMesh(makeCarGeometry(), vertexColorMat, count);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    const color = new THREE.Color();
    const lanes = PAL.carColors.map((hex, i) => {
      mesh.setColorAt(i, color.set(hex));
      const eastbound = i % 2 === 0;
      return { speed: 13 + (i % 3) * 3.5, offset: i * 137.7, dir: eastbound ? 1 : -1 };
    });
    return { mesh, lanes };
  }, []);

  const anims = useMemo<CarAnim[]>(
    () =>
      lanes.map(() => ({
        heat: 0,
        jumpY: 0,
        jumpVel: 0,
        airborne: false,
        squashT: 0,
        exploded: 0,
        // stagger first honks across the whole span so traffic doesn't all
        // pop off at once when the scene loads
        honkAt: Math.random() * HONK_INTERVAL_MAX,
        honkBoost: 0,
      })),
    [lanes],
  );

  const boxes = useMemo<CarBox[]>(
    () => lanes.map((_, i) => ({ index: i, x: 0, z: 0, active: true })),
    [lanes],
  );
  useEffect(() => {
    carHitState.boxes = boxes;
    return () => {
      if (carHitState.boxes === boxes) carHitState.boxes = [];
    };
  }, [boxes]);

  // dust (bump landings) and smoke (part of an explosion) share one pool and
  // one soft-blob geometry, just tinted and sized differently per spawn
  const { dustMesh, puffs } = useMemo(() => {
    const puffs: Puff[] = Array.from({ length: DUST_POOL }, () => ({
      life: 0,
      maxLife: DUST_LIFE,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      scale: 0,
      smoke: false,
    }));
    const dustMesh = new THREE.InstancedMesh(makePuffGeometry(), vertexColorMat, DUST_POOL);
    dustMesh.frustumCulled = false;
    dustMesh.castShadow = false;
    dustMesh.receiveShadow = false;
    return { dustMesh, puffs };
  }, []);

  // explosion debris: chunky boxes flung outward with gravity
  const { shardMesh, shards } = useMemo(() => {
    const shards: Shard[] = Array.from({ length: SHARD_POOL }, () => ({
      life: 0,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      scale: 0,
      color: SHARD_TINTS[0],
    }));
    const shardMesh = new THREE.InstancedMesh(makeShardGeometry(), vertexColorMat, SHARD_POOL);
    shardMesh.frustumCulled = false;
    shardMesh.castShadow = false;
    shardMesh.receiveShadow = false;
    return { shardMesh, shards };
  }, []);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      mesh.dispose();
      dustMesh.geometry.dispose();
      dustMesh.dispose();
      shardMesh.geometry.dispose();
      shardMesh.dispose();
    },
    [mesh, dustMesh, shardMesh],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // one voice per car: traffic whooshes past as it crosses the camera
  const voices = useMemo(() => lanes.map((_, i) => sceneAudio.voice("car", i)), [lanes]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => voices.forEach((v) => v.dispose()), [voices]);

  const spawnPuff = (x: number, y: number, z: number, smoke: boolean) => {
    let slot = puffs.find((p) => p.life <= 0);
    if (!slot) slot = puffs.reduce((a, b) => (a.life < b.life ? a : b));
    const spread = smoke ? 1.4 : 0.45;
    slot.life = slot.maxLife = smoke ? SMOKE_LIFE : DUST_LIFE;
    slot.x = x + (Math.random() - 0.5) * spread;
    slot.y = y + Math.random() * (smoke ? 0.5 : 0.15);
    slot.z = z + (Math.random() - 0.5) * spread;
    slot.vx = (Math.random() - 0.5) * (smoke ? 3.2 : 1.1);
    slot.vy = (smoke ? 2.4 : 0.9) + Math.random() * (smoke ? 1.6 : 0.6);
    slot.vz = (Math.random() - 0.5) * (smoke ? 3.2 : 1.1);
    slot.scale = smoke ? 0.9 + Math.random() * 0.6 : 0.22 + Math.random() * 0.16;
    slot.smoke = smoke;
  };

  const spawnShard = (x: number, y: number, z: number) => {
    let slot = shards.find((s) => s.life <= 0);
    if (!slot) slot = shards.reduce((a, b) => (a.life < b.life ? a : b));
    const a = Math.random() * Math.PI * 2;
    const up = 4 + Math.random() * 5;
    const out = 2 + Math.random() * 4;
    slot.life = SHARD_LIFE;
    slot.x = x;
    slot.y = y + 0.3;
    slot.z = z;
    slot.vx = Math.cos(a) * out;
    slot.vy = up;
    slot.vz = Math.sin(a) * out;
    slot.scale = 0.18 + Math.random() * 0.24;
    slot.color = SHARD_TINTS[(Math.random() * SHARD_TINTS.length) | 0];
  };

  const bump = (i: number, x: number, y: number, z: number, pan: number, t: number) => {
    const a = anims[i];
    if (a.exploded > 0) return;
    a.honkBoost = Math.min(1, a.honkBoost + HONK_BOOST_PER_BUMP);
    // pull the next honk closer in, capped so a bump can't un-schedule one
    // that was already about to happen
    a.honkAt = Math.min(a.honkAt, t + 0.2 + Math.random() * 0.6);
    a.heat = Math.min(EXPLODE_AT, a.heat + HEAT_PER_CLICK);
    if (a.heat >= EXPLODE_AT) {
      a.exploded = RESPAWN_TIME;
      a.heat = 0;
      a.jumpY = 0;
      a.jumpVel = 0;
      a.airborne = false;
      a.squashT = 0;
      spawnPuff(x, y, z, true);
      spawnPuff(x, y, z, true);
      spawnPuff(x, y, z, true);
      for (let s = 0; s < 12; s++) spawnShard(x, y, z);
      sceneAudio.playExplosion(pan);
      return;
    }
    a.jumpVel += BASE_IMPULSE + a.heat * HEAT_IMPULSE;
    a.airborne = true;
    sceneAudio.playBump(pan, a.heat / EXPLODE_AT);
  };

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime;
    const start = layout.startX - 120;
    const span = layout.endX + 120 - start;

    // drain taps queued by GrabNav since the last frame
    while (carClickQueue.length) {
      const i = carClickQueue.pop()!;
      const box = boxes[i];
      if (!box || !box.active) continue;
      tmp.set(box.x, 1, box.z);
      const pan = placementOf(tmp, camera, 70, tmp).pan;
      bump(i, box.x, 1, box.z, pan, t);
    }

    for (let i = 0; i < lanes.length; i++) {
      const { speed, offset, dir } = lanes[i];
      const a = anims[i];
      const d = (speed * t + offset) % span;
      const x = dir > 0 ? start + d : start + span - d;
      const z = dir > 0 ? -2.2 : 2.2;

      if (a.exploded > 0) {
        a.exploded = Math.max(0, a.exploded - dt);
        boxes[i].active = false;
        dummy.position.set(x, 0, z);
        dummy.scale.setScalar(0.0001);
        dummy.rotation.set(0, dir > 0 ? 0 : Math.PI, 0);
      } else {
        boxes[i].active = true;
        a.heat = Math.max(0, a.heat - HEAT_COOL_RATE * dt);
        a.jumpVel -= GRAVITY * dt;
        a.jumpY += a.jumpVel * dt;
        if (a.jumpY <= 0) {
          if (a.airborne) {
            a.squashT = THREE.MathUtils.clamp(Math.abs(a.jumpVel) / 13, 0.35, 1);
            spawnPuff(x, 0, z, false);
            if (Math.abs(a.jumpVel) > 4) spawnPuff(x, 0, z, false);
          }
          a.jumpY = 0;
          a.jumpVel = 0;
          a.airborne = false;
        }
        a.squashT = Math.max(0, a.squashT - dt * 6);

        const stretch = a.airborne ? THREE.MathUtils.clamp(a.jumpVel / 9, -0.28, 0.32) : 0;
        const scaleY = 1 + stretch * 0.5 - a.squashT * 0.32;
        const scaleXZ = 1 - stretch * 0.26 + a.squashT * 0.22;

        dummy.position.set(x, a.jumpY, z);
        dummy.rotation.set(0, dir > 0 ? 0 : Math.PI, 0);
        dummy.scale.set(scaleXZ, scaleY, scaleXZ);

        a.honkBoost = Math.max(0, a.honkBoost - HONK_BOOST_DECAY * dt);
        if (t >= a.honkAt) {
          const placement = placementOf(dummy.position, camera, 70, tmp);
          sceneAudio.playHonk(placement.pan, placement.gain);
          const lo = THREE.MathUtils.lerp(HONK_INTERVAL_MIN, HONK_BOOST_INTERVAL_MIN, a.honkBoost);
          const hi = THREE.MathUtils.lerp(HONK_INTERVAL_MAX, HONK_BOOST_INTERVAL_MAX, a.honkBoost);
          a.honkAt = t + lo + Math.random() * (hi - lo);
        }
      }

      boxes[i].x = x;
      boxes[i].z = z;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      voices[i].place(placementOf(dummy.position, camera, 70, tmp));
    }
    mesh.instanceMatrix.needsUpdate = true;

    // dust & smoke puffs
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      if (p.life <= 0) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        dustMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= (p.smoke ? 1.2 : 3.5) * dt;
      p.vx *= 0.94;
      p.vz *= 0.94;
      const age = 1 - Math.max(0, p.life) / p.maxLife;
      const s = p.scale * Math.sin(Math.PI * Math.min(1, age)) * (1 + age * (p.smoke ? 1.4 : 0.4));
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(Math.max(0, s));
      dummy.updateMatrix();
      dustMesh.setMatrixAt(i, dummy.matrix);
      dustMesh.setColorAt(i, p.smoke ? SMOKE_TINT : DUST_TINT);
    }
    dustMesh.instanceMatrix.needsUpdate = true;
    if (dustMesh.instanceColor) dustMesh.instanceColor.needsUpdate = true;

    // explosion debris
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i];
      if (s.life <= 0) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        shardMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      s.life -= dt;
      s.vy -= GRAVITY * 0.6 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      if (s.y < 0.1) {
        s.y = 0.1;
        s.vy = 0;
        s.vx *= 0.85;
        s.vz *= 0.85;
      }
      const fade = Math.max(0, s.life / SHARD_LIFE);
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(s.x * 1.7, s.y * 2.1, s.z * 1.3);
      dummy.scale.setScalar(s.scale * fade);
      dummy.updateMatrix();
      shardMesh.setMatrixAt(i, dummy.matrix);
      shardMesh.setColorAt(i, s.color);
    }
    shardMesh.instanceMatrix.needsUpdate = true;
    if (shardMesh.instanceColor) shardMesh.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <primitive object={mesh} />
      <primitive object={dustMesh} />
      <primitive object={shardMesh} />
    </>
  );
}
