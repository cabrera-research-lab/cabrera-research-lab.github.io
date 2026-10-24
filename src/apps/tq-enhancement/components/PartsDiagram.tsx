import { useId } from 'react';
import { PARTS_ICONS } from '@/apps/tq-enhancement/lib/partsIcons';
import type { TqDiagram, TqDiagramNode, TqShapeName } from '@/apps/tq-enhancement/lib/types';

const GRAY = '#888780';
const SHAPE_R = 26;
const ARROW = 9;

function polygonPoints(cx: number, cy: number, r: number, sides: number, rot: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = rot + (i * 2 * Math.PI) / sides;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function Shape({ node }: { node: TqDiagramNode & { shape: TqShapeName } }) {
  const { x, y, shape } = node;
  switch (shape) {
    case 'circle':
      return <circle cx={x} cy={y} r={SHAPE_R} fill={GRAY} />;
    case 'square':
      return <rect x={x - SHAPE_R + 3} y={y - SHAPE_R + 3} width={2 * SHAPE_R - 6} height={2 * SHAPE_R - 6} fill={GRAY} />;
    case 'triangle':
      return <polygon points={polygonPoints(x, y + 4, SHAPE_R + 4, 3, -Math.PI / 2)} fill={GRAY} />;
    case 'pentagon':
      return <polygon points={polygonPoints(x, y, SHAPE_R, 5, -Math.PI / 2)} fill={GRAY} />;
    case 'hexagon':
      return <polygon points={polygonPoints(x, y, SHAPE_R, 6, 0)} fill={GRAY} />;
    case 'diamond':
      return <polygon points={polygonPoints(x, y, SHAPE_R + 2, 4, -Math.PI / 2)} fill={GRAY} />;
  }
}

function arrowEnds(x1: number, y1: number, x2: number, y2: number, gap: number) {
  const distance = Math.hypot(x2 - x1, y2 - y1) || 1;
  const minShaft = ARROW * 2 + 8;
  const inset = Math.min(gap, Math.max(0, (distance - minShaft) / 2));
  const ux = (x2 - x1) / distance;
  const uy = (y2 - y1) / distance;
  return {
    x1: x1 + ux * inset,
    y1: y1 + uy * inset,
    x2: x2 - ux * inset,
    y2: y2 - uy * inset,
  };
}

export function PartsDiagram({ diagram, label }: { diagram: TqDiagram; label: string }) {
  const markerId = `parts-arrow-${useId().replace(/:/g, '')}`;

  return (
    <div className="tq-diagram" role="img" aria-label={label}>
      <svg viewBox="0 0 300 220">
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth={ARROW}
            markerHeight={ARROW}
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={GRAY} />
          </marker>
        </defs>
        {diagram.edges.map(([from, to], index) => {
          const start = diagram.nodes[from];
          const end = diagram.nodes[to];
          if (!start || !end) return null;
          const line = arrowEnds(start.x, start.y, end.x, end.y, diagram.gap);
          return (
            <line
              key={`${from}-${to}-${index}`}
              {...line}
              stroke={GRAY}
              strokeWidth="3"
              markerStart={`url(#${markerId})`}
              markerEnd={`url(#${markerId})`}
            />
          );
        })}
        {diagram.nodes.map((node, index) =>
          node.shape ? <Shape key={`${node.shape}-${index}`} node={{ ...node, shape: node.shape }} /> : null,
        )}
      </svg>
      {diagram.nodes.map((node, index) => {
        if (!node.icon) return null;
        const paths = PARTS_ICONS[node.icon] ?? [];
        return (
          <div
            key={`${node.icon}-${index}`}
            className="tq-diagram-node"
            style={{ left: `${(node.x / 300) * 100}%`, top: `${(node.y / 220) * 100}%` }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {paths.map((d) => (
                <path key={d} d={d} />
              ))}
            </svg>
            {node.caption ? <span>{node.caption}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
