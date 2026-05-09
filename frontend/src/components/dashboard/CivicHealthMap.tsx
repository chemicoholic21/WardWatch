'use client';

import { useState } from 'react';
import { Map, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { cn, getGradeColor } from '@/lib/utils';

interface ZoneHealth {
  zone: string;
  healthScore: number;
  grade: string;
  complaints: number;
  resolved: number;
  ghostOffices: number;
}

const zoneData: ZoneHealth[] = [
  { zone: 'East', healthScore: 45.2, grade: 'C', complaints: 1250, resolved: 520, ghostOffices: 4 },
  { zone: 'West', healthScore: 62.8, grade: 'B', complaints: 980, resolved: 610, ghostOffices: 2 },
  { zone: 'North', healthScore: 38.5, grade: 'D', complaints: 1450, resolved: 480, ghostOffices: 5 },
  { zone: 'South', healthScore: 71.3, grade: 'B', complaints: 850, resolved: 620, ghostOffices: 1 },
  { zone: 'Central', healthScore: 55.9, grade: 'C', complaints: 720, resolved: 420, ghostOffices: 0 },
];

export function CivicHealthMap() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Simple SVG map representation of Bengaluru zones
  const zones = [
    { id: 'North', path: 'M 100 20 L 200 20 L 200 80 L 100 80 Z', color: zoneData.find(z => z.zone === 'North')?.grade },
    { id: 'East', path: 'M 200 50 L 280 50 L 280 150 L 200 150 Z', color: zoneData.find(z => z.zone === 'East')?.grade },
    { id: 'South', path: 'M 100 150 L 200 150 L 200 230 L 100 230 Z', color: zoneData.find(z => z.zone === 'South')?.grade },
    { id: 'West', path: 'M 20 50 L 100 50 L 100 150 L 20 150 Z', color: zoneData.find(z => z.zone === 'West')?.grade },
    { id: 'Central', path: 'M 100 80 L 200 80 L 200 150 L 100 150 Z', color: zoneData.find(z => z.zone === 'Central')?.grade },
  ];

  const getZoneColor = (grade?: string) => {
    switch (grade) {
      case 'A': return 'fill-green-500/60 hover:fill-green-500/80';
      case 'B': return 'fill-blue-500/60 hover:fill-blue-500/80';
      case 'C': return 'fill-yellow-500/60 hover:fill-yellow-500/80';
      case 'D': return 'fill-orange-500/60 hover:fill-orange-500/80';
      case 'F': return 'fill-red-500/60 hover:fill-red-500/80';
      default: return 'fill-gray-500/60 hover:fill-gray-500/80';
    }
  };

  const selectedZoneData = zoneData.find(z => z.zone === selectedZone);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">Civic Health Map</h2>
            <p className="text-sm text-muted-foreground">Zone-wise performance</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-lg hover:bg-accent transition-colors">
            <Layers className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Map */}
        <div className="aspect-square bg-muted/30 rounded-lg p-4 flex items-center justify-center">
          <svg viewBox="0 0 300 250" className="w-full h-full">
            {/* Grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
              </pattern>
            </defs>
            <rect width="300" height="250" fill="url(#grid)" />

            {/* Zones */}
            {zones.map((zone) => (
              <path
                key={zone.id}
                d={zone.path}
                className={cn(
                  'cursor-pointer transition-all duration-200 stroke-background stroke-2',
                  getZoneColor(zone.color),
                  selectedZone === zone.id && 'stroke-primary stroke-[3]'
                )}
                onClick={() => setSelectedZone(zone.id)}
              />
            ))}

            {/* Zone Labels */}
            {zones.map((zone) => {
              const bounds = zone.path.match(/\d+/g)?.map(Number) || [];
              const cx = (bounds[0] + bounds[2]) / 2;
              const cy = (bounds[1] + bounds[5]) / 2;
              const data = zoneData.find(z => z.zone === zone.id);

              return (
                <g key={`label-${zone.id}`}>
                  <text
                    x={cx}
                    y={cy - 10}
                    textAnchor="middle"
                    className="fill-foreground text-xs font-medium"
                  >
                    {zone.id}
                  </text>
                  <text
                    x={cx}
                    y={cy + 8}
                    textAnchor="middle"
                    className={cn('text-lg font-bold', getGradeColor(data?.grade || 'C'))}
                  >
                    {data?.grade}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Zone Details */}
        <div className="space-y-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> A (80+)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> B (60-79)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500" /> C (40-59)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" /> D (20-39)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> F (&lt;20)</span>
          </div>

          {/* Zone List */}
          {zoneData.map((zone) => (
            <div
              key={zone.zone}
              className={cn(
                'p-3 rounded-lg border transition-all cursor-pointer',
                selectedZone === zone.zone
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => setSelectedZone(zone.zone)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center font-bold',
                    getGradeColor(zone.grade),
                    'bg-muted'
                  )}>
                    {zone.grade}
                  </span>
                  <div>
                    <p className="font-medium">{zone.zone} Zone</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {zone.healthScore.toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">{zone.complaints} complaints</p>
                  <p className="text-green-400">{zone.resolved} resolved</p>
                </div>
              </div>
              {zone.ghostOffices > 0 && (
                <div className="mt-2 text-xs text-red-400">
                  {zone.ghostOffices} ghost office{zone.ghostOffices > 1 ? 's' : ''} detected
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
