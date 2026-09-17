'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export default function FeedShimmerSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Daily Theme Hero Shimmer */}
      <div className="relative rounded-2xl border border-[#382D4F]/80 p-7 bg-[#292232] overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7B61FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-2xl">
          {/* Tag Pill + Count Shimmer */}
          <div className="flex items-center gap-3">
            <div className="h-6 w-28 rounded-full shimmer-pill" />
            <div className="h-4 w-20 rounded-md shimmer-pill opacity-60" />
          </div>

          {/* Title Shimmer */}
          <div className="space-y-2">
            <div className="h-8 w-3/4 rounded-lg shimmer-pill" />
            <div className="h-4 w-full rounded-md shimmer-pill opacity-70" />
            <div className="h-4 w-2/3 rounded-md shimmer-pill opacity-50" />
          </div>

          {/* Buttons Shimmer */}
          <div className="pt-2 flex items-center gap-3">
            <div className="h-10 w-40 rounded-xl shimmer-pill" />
            <div className="h-10 w-32 rounded-xl shimmer-box border border-[#382D4F]" />
          </div>
        </div>
      </div>

      {/* 2. Fresh Shelf Cards Shimmer */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-48 rounded-md shimmer-pill" />
            <Sparkles className="w-4 h-4 text-[#7B61FF]/40 animate-pulse" />
          </div>
          <div className="h-4 w-20 rounded-md shimmer-pill opacity-50" />
        </div>

        {/* Card Row Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-[#292232] border border-[#382D4F]/70 flex flex-col gap-3"
            >
              {/* Cover Art Box */}
              <div className="w-full aspect-square rounded-xl shimmer-pill" />

              {/* Title & Artist */}
              <div className="space-y-1.5 px-0.5">
                <div className="h-4 w-4/5 rounded shimmer-pill" />
                <div className="h-3 w-3/5 rounded shimmer-pill opacity-60" />
              </div>

              {/* Channel tag pill & hearts */}
              <div className="flex items-center justify-between pt-1 border-t border-[#382D4F]/40">
                <div className="h-4 w-14 rounded-full shimmer-pill opacity-70" />
                <div className="h-3 w-8 rounded shimmer-pill opacity-50" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Loved / Top Tracks Table Shimmer */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 rounded-md shimmer-pill" />
          <div className="h-4 w-24 rounded-md shimmer-pill opacity-50" />
        </div>

        {/* Table Skeleton */}
        <div className="rounded-xl border border-[#382D4F]/80 overflow-hidden bg-[#292232]">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-[#221B2C] border-b border-[#382D4F]/80">
            <div className="col-span-1 h-3 w-4 rounded shimmer-pill opacity-40" />
            <div className="col-span-6 sm:col-span-5 h-3 w-20 rounded shimmer-pill opacity-40" />
            <div className="col-span-2 hidden sm:block h-3 w-16 rounded shimmer-pill opacity-40" />
            <div className="col-span-2 hidden sm:block h-3 w-12 rounded shimmer-pill opacity-40" />
            <div className="col-span-1 text-right h-3 w-6 rounded shimmer-pill opacity-40 ml-auto" />
          </div>

          {/* Table Rows */}
          {[1, 2, 3, 4].map((row) => (
            <div
              key={row}
              className="grid grid-cols-12 gap-3 items-center px-4 py-3 border-b border-[#382D4F]/40 last:border-b-0"
            >
              <div className="col-span-1 flex items-center justify-center">
                <div className="h-3 w-3 rounded shimmer-pill opacity-50" />
              </div>
              <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg shimmer-pill flex-shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-3.5 w-3/4 rounded shimmer-pill" />
                  <div className="h-2.5 w-1/2 rounded shimmer-pill opacity-60" />
                </div>
              </div>
              <div className="col-span-2 hidden sm:block">
                <div className="h-5 w-20 rounded-full shimmer-pill opacity-70" />
              </div>
              <div className="col-span-2 hidden sm:block">
                <div className="h-3 w-14 rounded shimmer-pill opacity-50" />
              </div>
              <div className="col-span-1 flex items-center justify-end gap-2">
                <div className="h-3 w-6 rounded shimmer-pill opacity-50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
