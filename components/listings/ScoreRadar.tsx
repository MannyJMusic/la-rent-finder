'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ScoreRadarProps {
  scores: {
    price_score: number;
    location_score: number;
    size_score: number;
    amenity_score: number;
    quality_score: number;
  };
  className?: string;
}

const LABELS = [
  { key: 'price_score' as const, label: 'Price' },
  { key: 'location_score' as const, label: 'Location' },
  { key: 'size_score' as const, label: 'Size' },
  { key: 'amenity_score' as const, label: 'Amenities' },
  { key: 'quality_score' as const, label: 'Quality' },
];

const NUM_AXES = LABELS.length;
const NUM_RINGS = 4; // concentric rings at 25, 50, 75, 100
const CENTER = 150;
const CHART_RADIUS = 100;
const LABEL_RADIUS = 130;
const ANGLE_OFFSET = -Math.PI / 2; // start from top

function polarToCartesian(value: number, index: number, maxRadius: number): { x: number; y: number } {
  const angle = ANGLE_OFFSET + (2 * Math.PI * index) / NUM_AXES;
  const r = (value / 100) * maxRadius;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

function getPolygonPoints(values: number[], maxRadius: number): string {
  return values
    .map((v, i) => {
      const { x, y } = polarToCartesian(v, i, maxRadius);
      return `${x},${y}`;
    })
    .join(' ');
}

export default function ScoreRadar({ scores, className }: ScoreRadarProps) {
  const values = useMemo(
    () => LABELS.map(({ key }) => Math.max(0, Math.min(100, scores[key] || 0))),
    [scores]
  );

  // Grid ring polygons (25%, 50%, 75%, 100%)
  const gridRings = useMemo(
    () =>
      Array.from({ length: NUM_RINGS }, (_, i) => {
        const pct = ((i + 1) / NUM_RINGS) * 100;
        const ringValues = Array(NUM_AXES).fill(pct) as number[];
        return getPolygonPoints(ringValues, CHART_RADIUS);
      }),
    []
  );

  // Axis lines from center to outer ring
  const axisLines = useMemo(
    () =>
      LABELS.map((_, i) => {
        const { x, y } = polarToCartesian(100, i, CHART_RADIUS);
        return { x, y };
      }),
    []
  );

  // Label positions
  const labelPositions = useMemo(
    () =>
      LABELS.map((item, i) => {
        const { x, y } = polarToCartesian(100, i, LABEL_RADIUS);
        return { ...item, x, y };
      }),
    []
  );

  // Data polygon
  const dataPoints = useMemo(
    () => getPolygonPoints(values, CHART_RADIUS),
    [values]
  );

  // Dot positions for each data point
  const dotPositions = useMemo(
    () => values.map((v, i) => polarToCartesian(v, i, CHART_RADIUS)),
    [values]
  );

  return (
    <div className={cn('rounded-lg bg-zinc-800 p-4', className)}>
      <svg
        viewBox="0 0 300 300"
        className="w-full h-auto max-w-[300px] mx-auto"
        role="img"
        aria-label="Score radar chart"
      >
        {/* Grid rings */}
        {gridRings.map((points, i) => (
          <polygon
            key={`ring-${i}`}
            points={points}
            fill="none"
            stroke="#52525b"
            strokeWidth={i === NUM_RINGS - 1 ? 1.5 : 0.75}
            opacity={0.6}
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((end, i) => (
          <line
            key={`axis-${i}`}
            x1={CENTER}
            y1={CENTER}
            x2={end.x}
            y2={end.y}
            stroke="#52525b"
            strokeWidth={0.75}
            opacity={0.4}
          />
        ))}

        {/* Data polygon fill */}
        <polygon
          points={dataPoints}
          fill="#3B82F6"
          fillOpacity={0.2}
          stroke="#3B82F6"
          strokeWidth={2}
          strokeLinejoin="round"
          className="transition-all duration-500 ease-out"
        />

        {/* Data point dots */}
        {dotPositions.map((pos, i) => (
          <circle
            key={`dot-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={4}
            fill="#3B82F6"
            stroke="#1e293b"
            strokeWidth={1.5}
            className="transition-all duration-500 ease-out"
          />
        ))}

        {/* Labels */}
        {labelPositions.map((item, i) => {
          // Determine text-anchor based on position relative to center
          let anchor: "start" | "middle" | "end" = 'middle';
          if (item.x < CENTER - 10) anchor = 'end';
          else if (item.x > CENTER + 10) anchor = 'start';

          // Determine vertical alignment
          let dy = '0.35em';
          if (item.y < CENTER - 50) dy = '0em';
          else if (item.y > CENTER + 50) dy = '0.8em';

          return (
            <text
              key={`label-${i}`}
              x={item.x}
              y={item.y}
              textAnchor={anchor}
              dy={dy}
              className="fill-zinc-300 text-[11px] font-medium"
            >
              {item.label}
            </text>
          );
        })}

        {/* Score values next to dots */}
        {dotPositions.map((pos, i) => {
          const offsetY = pos.y < CENTER ? -10 : 14;
          return (
            <text
              key={`val-${i}`}
              x={pos.x}
              y={pos.y + offsetY}
              textAnchor="middle"
              className="fill-zinc-400 text-[9px] font-medium"
            >
              {values[i]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
