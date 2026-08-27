"use client";
import * as THREE from "three";

// One shared lit material for all vertex-colored geometry in the scene.
export const vertexColorMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0,
});
