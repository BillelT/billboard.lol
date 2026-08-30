"use client";
import { useState } from "react";
import OgBillboardScene, { type OgBillboardData } from "@/components/OgBillboardScene";
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

// ?debug=1 turns this into a scene builder: the OgScenePanel edits `data` in
// place, so you can shape the exact billboard you want and see the real 3D
// render update live, before ever generating a PNG.
export default function OgRenderClient({ params }: { params: Record<string, string | undefined> }) {
  const [data, setData] = useState<OgBillboardData>(() => dataFromParams(params));
  const debug = "debug" in params;

  return (
    <>
      <OgBillboardScene data={data} />
      {debug && <OgScenePanel data={data} onChange={setData} />}
    </>
  );
}
