import type { BoardLayout, Scene, SceneNode } from "@tabletest/core";
import { useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactElement, ReactNode, SVGProps } from "react";

interface SceneViewProps {
  readonly scene: Scene;
  readonly legalAnchors?: readonly string[];
  readonly onNodeClick?: (id: string) => void;
  readonly speed?: number;
  readonly className?: string;
  readonly title?: string;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

const viewWidth = 960;
const viewHeight = 620;

function boardSize(layout: BoardLayout): { readonly width: number; readonly height: number } {
  if (layout.type === "grid") {
    const ratio = layout.cols / layout.rows;
    const width = Math.min(520, 430 * ratio);
    return { width, height: width / ratio };
  }
  return { width: 520, height: 360 };
}

function nodePositions(scene: Scene): ReadonlyMap<string, Point> {
  const positions = new Map<string, Point>();
  const boardNodes = scene.nodes.filter((node) => node.kind === "board");
  boardNodes.forEach((node, index) => {
    const size = boardSize(node.layout);
    const offset = (index - (boardNodes.length - 1) / 2) * 40;
    positions.set(node.id, { x: (viewWidth - size.width) / 2 + offset, y: 110 });
  });

  const zones = scene.nodes.filter((node) => node.kind === "zone");
  zones.forEach((node, index) => {
    const row = Math.floor(index / 2);
    const column = index % 2;
    positions.set(node.id, { x: column === 0 ? 80 : 690, y: 160 + row * 180 });
  });

  for (const node of scene.nodes) {
    if (node.kind === "slot") {
      const parent = scene.nodes.find((candidate) => candidate.id === node.parent);
      if (parent?.kind === "board" && parent.layout.type === "grid") {
        const [rowText, columnText] = node.coord.split(",");
        const row = Number(rowText);
        const column = Number(columnText);
        const base = positions.get(parent.id);
        if (!base) continue;
        const size = boardSize(parent.layout);
        positions.set(node.id, {
          x: base.x + ((column - 0.5) * size.width) / parent.layout.cols,
          y: base.y + ((row - 0.5) * size.height) / parent.layout.rows,
        });
      } else if (parent?.kind === "board") {
        const order = node.order ?? 0;
        positions.set(node.id, { x: 260 + (order % 7) * 70, y: 250 + Math.floor(order / 7) * 70 });
      }
    } else if (node.kind === "piece" || node.kind === "card" || node.kind === "die") {
      const parentPosition = positions.get(node.parent);
      if (parentPosition) {
        const siblings = scene.nodes
          .filter((candidate) => candidate.parent === node.parent)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const order = node.order ?? siblings.indexOf(node);
        const zone = scene.nodes.find((candidate) => candidate.id === node.parent);
        const isStack = zone?.kind === "zone" && zone.arrangement === "stack";
        positions.set(node.id, {
          x: parentPosition.x + (isStack ? 3 : (order % 8) * 60),
          y: parentPosition.y + (isStack ? order * 2 : Math.floor(order / 8) * 54),
        });
      } else if (node.parent.startsWith("cell:")) {
        const [rowText, columnText] = node.parent.slice(5).split(",");
        const cellIndex = Number(node.parent.slice(5));
        const slotId = Number.isInteger(cellIndex)
          ? `cell:${cellIndex}`
          : `${rowText},${columnText}`;
        const slotPosition = positions.get(slotId);
        if (slotPosition) positions.set(node.id, slotPosition);
      }
    }
  }

  for (const node of scene.nodes) {
    if (node.kind === "counter") {
      positions.set(node.id, { x: viewWidth - 155, y: 115 + (node.order ?? 0) * 58 });
    }
  }
  return positions;
}

function gridLines(layout: BoardLayout, x: number, y: number): ReactNode {
  if (layout.type !== "grid") return null;
  const size = boardSize(layout);
  return (
    <g>
      {Array.from({ length: layout.cols - 1 }, (_, index) => {
        const lineX = x + ((index + 1) * size.width) / layout.cols;
        return <line key={`v${lineX}`} x1={lineX} y1={y} x2={lineX} y2={y + size.height} />;
      })}
      {Array.from({ length: layout.rows - 1 }, (_, index) => {
        const lineY = y + ((index + 1) * size.height) / layout.rows;
        return <line key={`h${lineY}`} x1={x} y1={lineY} x2={x + size.width} y2={lineY} />;
      })}
    </g>
  );
}

function PieceGlyph({ node }: { readonly node: Extract<SceneNode, { kind: "piece" }> }): ReactNode {
  const shapeProps = { fill: node.color, stroke: "#152b38", strokeWidth: 2 };
  switch (node.shape) {
    case "cross":
      return (
        <path
          d="M -20 -20 L 20 20 M 20 -20 L -20 20"
          fill="none"
          stroke={node.color}
          strokeWidth="9"
          strokeLinecap="round"
        />
      );
    case "square":
      return <rect {...shapeProps} x="-19" y="-19" width="38" height="38" rx="5" />;
    case "triangle":
      return <path {...shapeProps} d="M 0 -23 L 23 19 L -23 19 Z" />;
    case "stone":
      return <ellipse {...shapeProps} cx="0" cy="0" rx="22" ry="16" />;
    default:
      return <circle {...shapeProps} cx="0" cy="0" r="20" />;
  }
}

function renderNode(
  node: SceneNode,
  position: Point,
  anchorSet: ReadonlySet<string>,
  onNodeClick: SceneViewProps["onNodeClick"],
): ReactNode {
  const interactive = anchorSet.has(node.id) && onNodeClick !== undefined;
  const common: SVGProps<SVGGElement> = {
    id: node.id,
    transform: `translate(${position.x} ${position.y})`,
    className: interactive ? "scene-node scene-node--legal" : "scene-node",
    onClick: interactive ? () => onNodeClick(node.id) : undefined,
    onKeyDown: interactive
      ? (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onNodeClick(node.id);
          }
        }
      : undefined,
    role: interactive ? "button" : undefined,
    tabIndex: interactive ? 0 : undefined,
    "aria-label": interactive ? `Legal move: ${node.id}` : undefined,
    style: interactive ? ({ cursor: "pointer" } satisfies CSSProperties) : undefined,
  };
  switch (node.kind) {
    case "board": {
      const size = boardSize(node.layout);
      return (
        <g key={node.id} {...common}>
          <rect
            className="scene-board"
            x="0"
            y="0"
            width={size.width}
            height={size.height}
            rx="14"
          />
          <g className="scene-grid" transform="translate(0 0)">
            {gridLines(node.layout, 0, 0)}
          </g>
          {node.layout.type !== "grid" && (
            <text
              className="scene-board-label"
              x={size.width / 2}
              y={size.height / 2}
              textAnchor="middle"
            >
              {node.layout.type}
            </text>
          )}
        </g>
      );
    }
    case "slot":
      return (
        <g key={node.id} {...common}>
          <rect className="scene-slot" x="-42" y="-36" width="84" height="72" rx="7" />
          {node.label && (
            <text className="scene-slot-label" x="0" y="28" textAnchor="middle">
              {node.label}
            </text>
          )}
        </g>
      );
    case "zone":
      return (
        <g key={node.id} {...common}>
          <rect className="scene-zone" x="-36" y="-27" width="72" height="54" rx="10" />
          <text className="scene-label" x="0" y="47" textAnchor="middle">
            {node.label ?? node.arrangement}
            {node.hiddenCount === undefined ? "" : ` (${node.hiddenCount})`}
          </text>
        </g>
      );
    case "piece":
      return (
        <g key={node.id} {...common}>
          <PieceGlyph node={node} />
          {node.stack !== undefined && (
            <text className="scene-piece-label" x="0" y="5" textAnchor="middle">
              {node.stack}
            </text>
          )}
        </g>
      );
    case "card":
      return (
        <g key={node.id} {...common}>
          <rect className="scene-card" x="-27" y="-38" width="54" height="76" rx="6" />
          <text className="scene-card-label" x="0" y="5" textAnchor="middle">
            {node.face?.rank ?? node.face?.title ?? "Card"}
          </text>
        </g>
      );
    case "die":
      return (
        <g key={node.id} {...common}>
          <rect className="scene-die" x="-24" y="-24" width="48" height="48" rx="8" />
          <text className="scene-piece-label" x="0" y="6" textAnchor="middle">
            {node.value ?? "?"}
          </text>
        </g>
      );
    case "counter":
      return (
        <g key={node.id} {...common}>
          <rect className="scene-counter" x="-65" y="-23" width="130" height="46" rx="12" />
          <text className="scene-counter-label" x="0" y="-2" textAnchor="middle">
            {node.label}
          </text>
          <text className="scene-counter-value" x="0" y="15" textAnchor="middle">
            {node.value}
          </text>
        </g>
      );
  }
}

export function SceneView({
  scene,
  legalAnchors = [],
  onNodeClick,
  speed = 1,
  className,
  title = "Game table",
}: SceneViewProps): ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const previousRects = useRef(new Map<string, DOMRect>());
  const previousSceneKey = useRef<string | null>(null);
  const positions = nodePositions(scene);
  const sceneKey = JSON.stringify(scene.nodes);
  const anchorSet = new Set(legalAnchors);
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useLayoutEffect(() => {
    const root = svgRef.current;
    if (!root) return;
    if (previousSceneKey.current === sceneKey) return;
    previousSceneKey.current = sceneKey;
    const nextRects = new Map<string, DOMRect>();
    for (const element of root.querySelectorAll<SVGGElement>("g[id]")) {
      const id = element.id;
      const rect = element.getBoundingClientRect();
      if (id) {
        nextRects.set(id, rect);
        const previous = previousRects.current.get(id);
        if (!reducedMotion && previous && rect.width > 0 && rect.height > 0) {
          const dx = previous.left - rect.left;
          const dy = previous.top - rect.top;
          if (Math.abs(dx) + Math.abs(dy) > 1) {
            element.animate(
              [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
              { duration: 360 / Math.max(0.25, Math.min(8, speed)), easing: "ease-out" },
            );
          }
        } else if (!reducedMotion && !previous) {
          element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
        }
      }
    }
    previousRects.current = nextRects;
  }, [sceneKey, reducedMotion, speed]);

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      aria-labelledby="scene-title"
      role="application"
    >
      <title id="scene-title">{title}</title>
      <rect
        className="scene-background"
        x="0"
        y="0"
        width={viewWidth}
        height={viewHeight}
        rx="24"
      />
      {scene.seats.map((seat, index) => (
        <g key={seat.id} className={seat.active ? "scene-seat scene-seat--active" : "scene-seat"}>
          <circle cx={115 + index * 155} cy="48" r="13" fill={seat.color} />
          <text x={138 + index * 155} y="53">
            {seat.name}
            {seat.active ? " · turn" : ""}
          </text>
        </g>
      ))}
      {scene.nodes.map((node) => {
        const position = positions.get(node.id);
        return position ? renderNode(node, position, anchorSet, onNodeClick) : null;
      })}
      <text className="scene-status" x={viewWidth / 2} y={viewHeight - 28} textAnchor="middle">
        {scene.status ?? ""}
      </text>
    </svg>
  );
}
