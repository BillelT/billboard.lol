"use client";
import { useRef, useState } from "react";
import { PANEL_W, ROAD_Z, ROAD_HALF_W, type SceneConfig, type TreeItem } from "./OgBillboardScene";

type Category = "trees" | "rocks" | "bushes" | "grass" | "poles";
type Selection = { category: Category } & { index: number };

const CATEGORIES: Category[] = ["trees", "rocks", "bushes", "grass", "poles"];
const CATEGORY_COLOR: Record<Category, string> = {
  trees: "#4bbf5b",
  rocks: "#aab0b6",
  bushes: "#3f9f4a",
  grass: "#8fdb6a",
  poles: "#b98a5c",
};
const CATEGORY_LABEL: Record<Category, string> = {
  trees: "tree",
  rocks: "rock",
  bushes: "bush",
  grass: "grass",
  poles: "pole",
};
const CATEGORY_RADIUS: Record<Category, number> = {
  trees: 4.5,
  rocks: 3,
  bushes: 3.5,
  grass: 2.5,
  poles: 3.5,
};
const CATEGORY_DEFAULT: Record<Category, () => Record<string, unknown>> = {
  trees: () => ({ kind: "round", x: 0, z: -10, scale: 1 }),
  rocks: () => ({ x: 4, z: -6, scale: 0.5 }),
  bushes: () => ({ x: -4, z: -4, scale: 1 }),
  grass: () => ({ x: 0, z: -8, scale: 1 }),
  poles: () => ({ x: 20, z: -5, scale: 1 }),
};

// World extent the map covers — generous enough for the camera's own
// travel range plus every decor default.
const WX_MIN = -55;
const WX_MAX = 55;
const WZ_MIN = -55; // far background, drawn at the top
const WZ_MAX = 35; // near the camera, drawn at the bottom
const MAP_W = 272;
const MAP_H = 222;

function sx(x: number) {
  return ((x - WX_MIN) / (WX_MAX - WX_MIN)) * MAP_W;
}
function sz(z: number) {
  return ((z - WZ_MIN) / (WZ_MAX - WZ_MIN)) * MAP_H;
}

function itemsOf(scene: SceneConfig, cat: Category): Array<{ x: number; z: number; scale: number }> {
  return scene[cat] as Array<{ x: number; z: number; scale: number }>;
}

function moveItem(scene: SceneConfig, cat: Category, index: number, x: number, z: number): SceneConfig {
  const arr = itemsOf(scene, cat);
  return { ...scene, [cat]: arr.map((it, i) => (i === index ? { ...it, x, z } : it)) } as SceneConfig;
}
function scaleItem(scene: SceneConfig, cat: Category, index: number, scale: number): SceneConfig {
  const arr = itemsOf(scene, cat);
  return { ...scene, [cat]: arr.map((it, i) => (i === index ? { ...it, scale } : it)) } as SceneConfig;
}
function removeItem(scene: SceneConfig, cat: Category, index: number): SceneConfig {
  const arr = itemsOf(scene, cat);
  return { ...scene, [cat]: arr.filter((_, i) => i !== index) } as SceneConfig;
}
function addItem(scene: SceneConfig, cat: Category): SceneConfig {
  const arr = itemsOf(scene, cat);
  return { ...scene, [cat]: [...arr, CATEGORY_DEFAULT[cat]()] } as SceneConfig;
}
function setTreeKind(scene: SceneConfig, index: number, kind: TreeItem["kind"]): SceneConfig {
  return { ...scene, trees: scene.trees.map((t, i) => (i === index ? { ...t, kind } : t)) };
}

// Top-down drag-and-drop editor: every tree, rock, bush, grass tuft and pole
// is a colored dot you drag into place, instead of typing x/z into a list.
// Camera position and look-at point are draggable the same way.
export default function OgSceneMap({
  scene,
  onSceneChange,
}: {
  scene: SceneConfig;
  onSceneChange: (next: SceneConfig) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<Selection | null>(null);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = WX_MIN + ((clientX - rect.left) / rect.width) * (WX_MAX - WX_MIN);
    const z = WZ_MIN + ((clientY - rect.top) / rect.height) * (WZ_MAX - WZ_MIN);
    return { x, z };
  };

  const dragItem = (e: React.PointerEvent, cat: Category, index: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected({ category: cat, index });
  };
  const moveDrag = (e: React.PointerEvent, cat: Category, index: number) => {
    if (e.buttons !== 1) return;
    const { x, z } = toWorld(e.clientX, e.clientY);
    onSceneChange(moveItem(scene, cat, index, x, z));
  };

  const dragCamera = (e: React.PointerEvent) => e.currentTarget.setPointerCapture(e.pointerId);
  const moveCamera = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const { x, z } = toWorld(e.clientX, e.clientY);
    onSceneChange({ ...scene, camera: { ...scene.camera, x, z } });
  };
  const moveLookAt = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const { x, z } = toWorld(e.clientX, e.clientY);
    onSceneChange({ ...scene, camera: { ...scene.camera, lookX: x, lookZ: z } });
  };

  const selectedItem = selected ? itemsOf(scene, selected.category)[selected.index] : null;

  return (
    <div className="og-map">
      <svg
        ref={svgRef}
        className="og-map-svg"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        onPointerDown={() => setSelected(null)}
      >
        <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="#2a3340" />
        <rect x={0} y={sz(ROAD_Z - ROAD_HALF_W)} width={MAP_W} height={sz(ROAD_Z + ROAD_HALF_W) - sz(ROAD_Z - ROAD_HALF_W)} fill="#454e58" />
        <rect
          x={sx(-PANEL_W / 2)}
          y={sz(-0.6)}
          width={sx(PANEL_W / 2) - sx(-PANEL_W / 2)}
          height={Math.max(2, sz(0.6) - sz(-0.6))}
          fill="#e8f0f7"
          opacity={0.85}
        />

        {/* camera aim line */}
        <line
          x1={sx(scene.camera.x)}
          y1={sz(scene.camera.z)}
          x2={sx(scene.camera.lookX)}
          y2={sz(scene.camera.lookZ)}
          stroke="#6fb3f0"
          strokeDasharray="3,3"
          strokeWidth={1}
        />

        {CATEGORIES.map((cat) =>
          itemsOf(scene, cat).map((it, i) => {
            const isSel = selected?.category === cat && selected.index === i;
            return (
              <circle
                key={`${cat}-${i}`}
                cx={sx(it.x)}
                cy={sz(it.z)}
                r={CATEGORY_RADIUS[cat] * (isSel ? 1.35 : 1)}
                fill={CATEGORY_COLOR[cat]}
                stroke={isSel ? "#ffffff" : "rgba(0,0,0,0.35)"}
                strokeWidth={isSel ? 1.5 : 0.75}
                style={{ cursor: "grab" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  dragItem(e, cat, i);
                }}
                onPointerMove={(e) => moveDrag(e, cat, i)}
              />
            );
          }),
        )}

        {/* look-at target */}
        <circle
          cx={sx(scene.camera.lookX)}
          cy={sz(scene.camera.lookZ)}
          r={3.5}
          fill="none"
          stroke="#6fb3f0"
          strokeWidth={1.4}
          style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            dragCamera(e);
          }}
          onPointerMove={moveLookAt}
        />
        {/* camera */}
        <path
          d="M -4,3.5 L 4,3.5 L 0,-4.5 Z"
          fill="#ffcf5c"
          stroke="#00000055"
          strokeWidth={0.6}
          transform={`translate(${sx(scene.camera.x)}, ${sz(scene.camera.z)})`}
          style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            dragCamera(e);
          }}
          onPointerMove={moveCamera}
        />
      </svg>

      <div className="og-map-legend">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => onSceneChange(addItem(scene, cat))} title={`add ${CATEGORY_LABEL[cat]}`}>
            <span className="og-map-dot" style={{ background: CATEGORY_COLOR[cat] }} />+{CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {selected && selectedItem && (
        <div className="og-map-toolbar">
          <span>
            {CATEGORY_LABEL[selected.category]} #{selected.index + 1}
          </span>
          {selected.category === "trees" && (
            <select
              value={(selectedItem as TreeItem).kind}
              onChange={(e) => onSceneChange(setTreeKind(scene, selected.index, e.target.value as TreeItem["kind"]))}
            >
              <option value="round">round</option>
              <option value="tall">tall</option>
              <option value="pine">pine</option>
            </select>
          )}
          <input
            type="range"
            min={0.3}
            max={2.2}
            step={0.05}
            value={selectedItem.scale}
            onChange={(e) => onSceneChange(scaleItem(scene, selected.category, selected.index, Number(e.target.value)))}
          />
          <button
            onClick={() => {
              onSceneChange(removeItem(scene, selected.category, selected.index));
              setSelected(null);
            }}
          >
            delete
          </button>
        </div>
      )}
    </div>
  );
}
