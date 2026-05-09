'use client';

import { useState } from 'react';
import { TrendingUp, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataPoint {
  date: string;
  complaints: number;
  resolved: number;
  scams: number;
}

const mockData: DataPoint[] = [
  { date: 'Mar 1', complaints: 145, resolved: 98, scams: 5 },
  { date: 'Mar 2', complaints: 162, resolved: 112, scams: 3 },
  { date: 'Mar 3', complaints: 178, resolved: 125, scams: 8 },
  { date: 'Mar 4', complaints: 152, resolved: 108, scams: 4 },
  { date: 'Mar 5', complaints: 189, resolved: 142, scams: 6 },
  { date: 'Mar 6', complaints: 201, resolved: 158, scams: 9 },
  { date: 'Mar 7', complaints: 168, resolved: 135, scams: 5 },
  { date: 'Mar 8', complaints: 195, resolved: 165, scams: 7 },
  { date: 'Mar 9', complaints: 182, resolved: 148, scams: 4 },
  { date: 'Mar 10', complaints: 176, resolved: 152, scams: 3 },
  { date: 'Mar 11', complaints: 198, resolved: 168, scams: 6 },
  { date: 'Mar 12', complaints: 215, resolved: 178, scams: 8 },
  { date: 'Mar 13', complaints: 188, resolved: 162, scams: 5 },
  { date: 'Mar 14', complaints: 172, resolved: 155, scams: 4 },
];

export function TrendChart() {
  const [timeRange, setTimeRange] = useState('14d');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const maxValue = Math.max(...mockData.map(d => Math.max(d.complaints, d.resolved)));
  const chartHeight = 200;
  const chartWidth = 800;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  const getX = (index: number) =>
    padding.left + (index / (mockData.length - 1)) * (chartWidth - padding.left - padding.right);

  const getY = (value: number) =>
    chartHeight - padding.bottom - (value / maxValue) * (chartHeight - padding.top - padding.bottom);

  const createPath = (key: keyof DataPoint) =>
    mockData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[key] as number)}`)
      .join(' ');

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">Complaint Trends</h2>
            <p className="text-sm text-muted-foreground">Daily complaint activity</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              Complaints
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              Resolved
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              Scams
            </span>
          </div>

          {/* Time Range */}
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent transition-colors">
            <Calendar className="w-4 h-4" />
            Last 14 days
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={getY(maxValue * ratio)}
                x2={chartWidth - padding.right}
                y2={getY(maxValue * ratio)}
                className="stroke-border"
                strokeWidth="1"
                strokeDasharray="4"
              />
              <text
                x={padding.left - 8}
                y={getY(maxValue * ratio)}
                className="fill-muted-foreground text-xs"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {Math.round(maxValue * ratio)}
              </text>
            </g>
          ))}

          {/* Area fills */}
          <path
            d={`${createPath('complaints')} L ${getX(mockData.length - 1)} ${chartHeight - padding.bottom} L ${getX(0)} ${chartHeight - padding.bottom} Z`}
            className="fill-blue-500/10"
          />
          <path
            d={`${createPath('resolved')} L ${getX(mockData.length - 1)} ${chartHeight - padding.bottom} L ${getX(0)} ${chartHeight - padding.bottom} Z`}
            className="fill-green-500/10"
          />

          {/* Lines */}
          <path
            d={createPath('complaints')}
            className="stroke-blue-500 fill-none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={createPath('resolved')}
            className="stroke-green-500 fill-none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Scam bars */}
          {mockData.map((d, i) => (
            <rect
              key={i}
              x={getX(i) - 4}
              y={getY(d.scams * 20)} // Scale scams for visibility
              width="8"
              height={chartHeight - padding.bottom - getY(d.scams * 20)}
              className="fill-red-500/60"
              rx="2"
            />
          ))}

          {/* Data points */}
          {mockData.map((d, i) => (
            <g key={i}>
              <circle
                cx={getX(i)}
                cy={getY(d.complaints)}
                r={hoveredPoint === i ? 6 : 4}
                className="fill-blue-500 stroke-background stroke-2 cursor-pointer transition-all"
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              <circle
                cx={getX(i)}
                cy={getY(d.resolved)}
                r={hoveredPoint === i ? 6 : 4}
                className="fill-green-500 stroke-background stroke-2 cursor-pointer transition-all"
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}

          {/* X-axis labels */}
          {mockData.filter((_, i) => i % 2 === 0).map((d, i) => (
            <text
              key={d.date}
              x={getX(i * 2)}
              y={chartHeight - 8}
              className="fill-muted-foreground text-xs"
              textAnchor="middle"
            >
              {d.date}
            </text>
          ))}

          {/* Tooltip */}
          {hoveredPoint !== null && (
            <g>
              <rect
                x={getX(hoveredPoint) - 50}
                y={getY(mockData[hoveredPoint].complaints) - 60}
                width="100"
                height="50"
                rx="4"
                className="fill-popover stroke-border"
              />
              <text
                x={getX(hoveredPoint)}
                y={getY(mockData[hoveredPoint].complaints) - 45}
                className="fill-foreground text-xs font-medium"
                textAnchor="middle"
              >
                {mockData[hoveredPoint].date}
              </text>
              <text
                x={getX(hoveredPoint)}
                y={getY(mockData[hoveredPoint].complaints) - 28}
                className="fill-blue-400 text-xs"
                textAnchor="middle"
              >
                {mockData[hoveredPoint].complaints} complaints
              </text>
              <text
                x={getX(hoveredPoint)}
                y={getY(mockData[hoveredPoint].complaints) - 14}
                className="fill-green-400 text-xs"
                textAnchor="middle"
              >
                {mockData[hoveredPoint].resolved} resolved
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
