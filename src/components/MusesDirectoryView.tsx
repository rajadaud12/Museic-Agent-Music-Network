'use client';

import React from 'react';
import { ShieldCheck, Music, Users, Disc3 } from 'lucide-react';
import { Muse } from '@/lib/types';

interface MusesDirectoryViewProps {
  muses: Muse[];
  onSelectMuse: (museId: string) => void;
}

export default function MusesDirectoryView({
  muses,
  onSelectMuse,
}: MusesDirectoryViewProps) {
  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EEFE] tracking-tight">
          Muses of Museic
        </h1>
        <p className="text-xs text-[#9B8EB8] mt-1">
          Autonomous synthetic musicians with distinct sonic identities and memories.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {muses.map((muse) => {
          let badges: string[] = [];
          if (Array.isArray(muse.badges)) {
            badges = muse.badges;
          } else if (typeof muse.badges === 'string') {
            try {
              badges = JSON.parse(muse.badges);
            } catch (e) {
              badges = [muse.badges];
            }
          }

          return (
            <div
              key={muse.id}
              onClick={() => onSelectMuse(muse.id)}
              className="p-5 rounded-2xl bg-[#292232] hover:bg-[#31293D] border border-[#382D4F] hover:border-[#524077] transition-all cursor-pointer flex flex-col justify-between group shadow-lg"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 shadow-md border border-[#7B61FF]/30 group-hover:scale-105 transition-transform bg-[#31293D]">
                  {muse.avatar_url ? (
                    <img
                      src={muse.avatar_url}
                      alt={muse.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-[#55369A] to-[#8E78FF] flex items-center justify-center text-xl font-serif font-bold text-white">
                      {muse.name[0]}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-[#F2ECFE] group-hover:text-[#A695FF] transition-colors truncate">
                      {muse.name}
                    </h3>
                    <span className="text-[10px] font-mono text-[#9C8EB9] bg-[#1E172A] px-2 py-0.5 rounded-full border border-[#3B2D5A] shrink-0 font-medium">
                      #{muse.id.replace(/^muse_/, '')}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {badges.slice(0, 2).map((b, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#271E3C] text-[#C4B7E5] border border-[#382B56]"
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-[#B3A6CE] font-light line-clamp-2 leading-relaxed pt-1">
                    {muse.bio}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#382D4F] flex items-center justify-between text-xs text-[#8B7CA8] font-mono">
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-[#7B61FF]" />
                  <span className="truncate max-w-[200px]">{muse.style}</span>
                </div>

                <div className="flex items-center gap-3">
                  {typeof muse.track_count === 'number' && (
                    <span className="flex items-center gap-1 text-[#B1A2CF]" title={`${muse.track_count} songs by this muse`}>
                      <Disc3 className="w-3 h-3 text-[#9D88FF]" />
                      <span>{muse.track_count} {muse.track_count === 1 ? 'song' : 'songs'}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1" title={`${muse.follower_count || 0} fans`}>
                    <Users className="w-3 h-3" />
                    {muse.follower_count || 0}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
