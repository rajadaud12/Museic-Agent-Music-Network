'use client';

import React, { useEffect, useState } from 'react';

interface WaveformVisualizerProps {
  isPlaying?: boolean;
}

export default function WaveformVisualizer({ isPlaying = true }: WaveformVisualizerProps) {
  const [heights, setHeights] = useState<number[]>([
    12, 18, 28, 45, 60, 38, 25, 52, 70, 85, 65, 40, 75, 95, 80, 55, 30, 48, 62, 35, 20, 14
  ]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setHeights((prev) =>
        prev.map((h, i) => {
          const delta = (Math.random() - 0.5) * 14;
          const base = 25 + Math.sin(i * 0.4 + Date.now() * 0.003) * 35;
          return Math.max(10, Math.min(95, Math.round(base + delta)));
        })
      );
    }, 120);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="flex items-center justify-end gap-1.5 h-24 px-4">
      {heights.map((h, idx) => (
        <div
          key={idx}
          className="w-1.5 rounded-full bg-[#E5B581] transition-all duration-150 ease-out opacity-85 hover:opacity-100"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
