"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WicketCardData } from '@/hooks/useMatchState';

export type PlayerOutData = WicketCardData;

interface PlayerOutCardProps {
  data: PlayerOutData | null;
  onDismiss: () => void;
  durationMs?: number;
}

export default function PlayerOutCard({
  data,
  onDismiss,
  durationMs = 6500,
}: PlayerOutCardProps) {
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [data, onDismiss, durationMs]);

  if (!data) return null;

  const srFormatted = typeof data.strikeRate === 'number'
    ? data.strikeRate.toFixed(1)
    : String(data.strikeRate || '0.0');

  const accentColor = data.teamColor || '#e11d48';

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          key={data.playerName + (data.runs ?? 0)}
          initial={{ y: 36, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 28, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 24, stiffness: 220 }}
          className="fixed bottom-[114px] left-1/2 -translate-x-1/2 z-[55] pointer-events-none select-none"
        >
          {/* Ambient Glow */}
          <div
            className="absolute -inset-1.5 rounded-3xl blur-2xl opacity-40 pointer-events-none"
            style={{ backgroundColor: accentColor }}
          />

          {/* Card Container */}
          <div className="relative flex items-stretch rounded-2xl overflow-hidden bg-slate-950/92 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85)] max-w-[820px] w-auto">
            {/* Left Accent Stripe */}
            <div
              className="w-2.5 shrink-0"
              style={{
                background: `linear-gradient(to bottom, #f43f5e, #e11d48, #9f1239)`,
              }}
            />

            {/* Left Panel: Batsman Identity & Dismissal Method */}
            <div className="flex flex-col justify-center pl-5 pr-6 py-3.5 min-w-[270px] max-w-[380px]">
              {/* Top Meta Line: WICKET tag & Team Name */}
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  WICKET
                </span>
                {data.teamName && (
                  <span className="text-[11px] font-bold text-white/50 tracking-wider uppercase truncate">
                    {data.teamName}
                  </span>
                )}
              </div>

              {/* Player Name */}
              <div className="text-[23px] lg:text-[25px] font-black text-white tracking-wide font-sans truncate leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                {data.playerName}
              </div>

              {/* Method of Out (e.g. c Fielder b Bowler) */}
              <div className="text-[13px] lg:text-[14px] text-slate-300 font-medium italic mt-1 truncate max-w-[340px] leading-snug">
                {data.methodOfOut || 'b Bowler'}
              </div>
            </div>

            {/* Vertical Glass Divider */}
            <div className="w-px bg-gradient-to-b from-transparent via-white/15 to-transparent shrink-0 my-2" />

            {/* Right Panel: Calm, Clean Statistics Grid */}
            <div className="flex items-center px-6 py-3.5 gap-6 lg:gap-7 bg-white/[0.02]">
              {/* RUNS */}
              <div className="flex flex-col items-center justify-center min-w-[52px]">
                <span className="text-[34px] lg:text-[38px] font-black text-amber-300 font-sans tracking-tight leading-none">
                  {data.runs}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-1">
                  RUNS
                </span>
              </div>

              <div className="w-px h-8 bg-white/10 shrink-0" />

              {/* BALLS */}
              <div className="flex flex-col items-center justify-center min-w-[44px]">
                <span className="text-[22px] lg:text-[24px] font-black text-white font-sans tracking-tight leading-none">
                  {data.balls}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-1">
                  BALLS
                </span>
              </div>

              <div className="w-px h-8 bg-white/10 shrink-0" />

              {/* 4s & 6s */}
              <div className="flex items-center gap-3.5">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[20px] lg:text-[22px] font-black text-sky-400 font-sans tracking-tight leading-none">
                    {data.fours}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-1">
                    4s
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[20px] lg:text-[22px] font-black text-orange-400 font-sans tracking-tight leading-none">
                    {data.sixes}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-1">
                    6s
                  </span>
                </div>
              </div>

              <div className="w-px h-8 bg-white/10 shrink-0" />

              {/* STRIKE RATE */}
              <div className="flex flex-col items-center justify-center min-w-[56px]">
                <span className="text-[20px] lg:text-[22px] font-black text-emerald-400 font-mono tracking-tight leading-none">
                  {srFormatted}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-1">
                  S/R
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
