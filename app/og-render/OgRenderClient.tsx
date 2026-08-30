"use client";
import { useState } from "react";
import OgBillboardScene, { DEFAULT_SCENE_CONFIG, type OgBillboardData, type SceneConfig } from "@/components/OgBillboardScene";
import OgScenePanel from "@/components/OgScenePanel";

function dataFromParams(params: Record<string, string | undefined>): OgBillboardData {
  return {
    name: params.name ?? "example.com",
    color: params.color ?? "#2f6bff",
    amount: Number(params.amount ?? 0),
    description: params.description || null,
    title: params.title || null,
    category: params.category || null,
    clickCount: params.clicks ? Number(params.clicks) : null,
    claimedAt: params.claimedAt || null,
  };
}

function sceneFromParams(params: Record<string, string | undefined>): SceneConfig {
  if (!params.scene) return DEFAULT_SCENE_CONFIG;
  try {
    return { ...DEFAULT_SCENE_CONFIG, ...JSON.parse(decodeURIComponent(params.scene)) };
  } catch {
    return DEFAULT_SCENE_CONFIG;
  }
}

// ?debug=1 turns this into a full scene builder: OgScenePanel edits `data`
// (billboard content) and `scene` (camera + decor placement) in place, so
// the whole render — not just the billboard's text — is malleable, live.
export default function OgRenderClient({ params }: { params: Record<string, string | undefined> }) {
  const [data, setData] = useState<OgBillboardData>(() => dataFromParams(params));
  const [scene, setScene] = useState<SceneConfig>(() => sceneFromParams(params));
  const debug = "debug" in params;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1b1f26",
        overflow: "hidden",
      }}
    >
      <OgBillboardScene data={data} scene={scene} />
      {debug && <OgScenePanel data={data} onDataChange={setData} scene={scene} onSceneChange={setScene} />}
    </div>
  );
}
