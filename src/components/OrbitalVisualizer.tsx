'use client';

import React, { useEffect, useRef } from 'react';

interface OrbitalVisualizerProps {
  isPlaying: boolean;
  size?: number;
}

export default function OrbitalVisualizer({ isPlaying, size = 180 }: OrbitalVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;
    let pulsePhase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Background card tint
      ctx.fillStyle = '#2B233D';
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 16);
      ctx.fill();

      // Outer ring
      ctx.strokeStyle = 'rgba(142, 128, 179, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 72, 0, Math.PI * 2);
      ctx.stroke();

      // Middle ring
      ctx.strokeStyle = 'rgba(142, 128, 179, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
      ctx.stroke();

      // Inner ring
      ctx.strokeStyle = 'rgba(142, 128, 179, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.stroke();

      // Center glowing core (Amber)
      const pulseSize = isPlaying ? Math.sin(pulsePhase) * 2.5 : 0;
      const coreRadius = 14 + pulseSize;

      // Glow effect
      const gradient = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, coreRadius + 8);
      gradient.addColorStop(0, '#FFB775');
      gradient.addColorStop(0.7, '#F5A962');
      gradient.addColorStop(1, 'rgba(245, 169, 98, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius + 8, 0, Math.PI * 2);
      ctx.fill();

      // Solid central core
      ctx.fillStyle = '#F5A962';
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting node on middle/outer ring
      const orbitRadius = 60;
      const nodeX = centerX + Math.cos(angle) * orbitRadius;
      const nodeY = centerY + Math.sin(angle) * orbitRadius;

      // Node connection ray line (subtle)
      ctx.strokeStyle = 'rgba(235, 225, 255, 0.25)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(nodeX, nodeY);
      ctx.stroke();

      // Orbiting satellite dot
      ctx.fillStyle = '#E8E1FD';
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Extra secondary mini-satellite
      const miniOrbitRadius = 38;
      const miniAngle = -angle * 1.5;
      const miniX = centerX + Math.cos(miniAngle) * miniOrbitRadius;
      const miniY = centerY + Math.sin(miniAngle) * miniOrbitRadius;
      ctx.fillStyle = 'rgba(255, 183, 117, 0.9)';
      ctx.beginPath();
      ctx.arc(miniX, miniY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (isPlaying) {
        angle += 0.018;
        pulsePhase += 0.08;
      } else {
        angle += 0.003;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  return (
    <div className="flex justify-center items-center w-full">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-xl shadow-lg"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
}
