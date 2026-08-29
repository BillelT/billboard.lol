"use client";
import OgBillboardScene, { type OgBillboardData } from "@/components/OgBillboardScene";

export default function OgRenderClient({ params }: { params: Record<string, string | undefined> }) {
  const data: OgBillboardData = {
    name: params.name ?? "example.com",
    color: params.color ?? "#2f6bff",
    amount: Number(params.amount ?? 0),
    description: params.description || null,
    title: params.title || null,
    category: params.category || null,
    clickCount: params.clicks ? Number(params.clicks) : null,
    claimedAt: params.claimedAt || null,
  };
  return <OgBillboardScene data={data} />;
}
