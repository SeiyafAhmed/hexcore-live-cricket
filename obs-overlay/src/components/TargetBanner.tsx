"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Flame, TrendingUp, Activity, Zap } from 'lucide-react';

export type TargetBannerVariant = 'modular' | 'angular' | 'docked';

interface TargetBannerProps {
  target: number;
  runs: number;
  maxOvers?: number;
  totalBalls: number;
  battingColor?: string;
  variant?: TargetBannerVariant;
}

export default function TargetBanner({
  target,
  runs,
  maxOvers = 20,
  totalBalls,
  battingColor = '#ff007f',
  variant = 'modular',
}: TargetBannerProps) {
  const runsNeeded = Math.max(0, target - runs);
  const totalAllowedBalls = maxOvers * 6;
  const ballsRemaining = Math.max(0, totalAllowedBalls - totalBalls);
  const reqRunRate = (ballsRemaining > 0 && runsNeeded > 0)
    ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
    : (runsNeeded === 0 ? '0.00' : null);

  const progressPercent = Math.min(100, Math.max(0, Math.round((runs / target) * 100)));
  const rrrNum = reqRunRate ? parseFloat(reqRunRate) : 0;

  // Urgency styling based on required run rate
  let urgencyTheme = {
    badge: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />,
    label: 'REQ RR',
  };

  if (rrrNum >= 12.0) {
    urgencyTheme = {
      badge: 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.35)]',
      icon: <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />,
      label: 'REQ RR',
    };
  } else if (rrrNum >= 8.5) {
    urgencyTheme = {
      badge: 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      icon: <TrendingUp className="w-3.5 h-3.5 text-amber-400" />,
      label: 'REQ RR',
    };
  }

  // -------------------------------------------------------------
  // VARIANT 1: MODULAR (Broadcast Elite Segmented Capsule - Default)
  // -------------------------------------------------------------
  if (variant === 'modular') {
    return (
      <motion.div
        initial={{ y: 16, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200 }}
        className="relative mb-2.5 z-40 select-none"
      >
        {/* Ambient Underglow */}
        <div 
          className="absolute -inset-1.5 rounded-2xl blur-xl opacity-35 pointer-events-none"
          style={{ backgroundColor: battingColor || '#f59e0b' }}
        />

        {/* Main Floating Capsule */}
        <div className="relative flex items-center gap-2.5 sm:gap-3.5 px-3 py-1.5 sm:py-2 rounded-2xl bg-slate-950/94 backdrop-blur-2xl border border-white/15 border-t-white/35 shadow-[0_16px_40px_rgba(0,0,0,0.85)]">
          
          {/* Target Chip */}
          <div className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/25 via-amber-400/10 to-transparent border border-amber-400/35 shadow-inner">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] shrink-0">
              <Target className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex flex-col justify-center leading-none">
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300/80">TARGET</span>
              <span className="text-[20px] font-black text-white font-rajdhani tracking-tight leading-none mt-0.5">
                {target}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-gradient-to-b from-transparent via-white/20 to-transparent shrink-0" />

          {/* Equation Module: Need X Runs from Y Balls */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">NEED</span>
            <div className="flex items-baseline gap-1 px-2.5 py-0.5 rounded-lg bg-white/[0.08] border border-white/20 shadow-inner">
              <span className="text-[22px] font-black text-white font-rajdhani tracking-tight leading-none">
                {runsNeeded}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 leading-none">
                RUNS
              </span>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">OFF</span>
            <div className="flex items-baseline gap-1 px-2.5 py-0.5 rounded-lg bg-white/[0.08] border border-white/20 shadow-inner">
              <span className="text-[22px] font-black text-white font-rajdhani tracking-tight leading-none">
                {ballsRemaining}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none">
                BALLS
              </span>
            </div>
          </div>

          {/* Required Run Rate Module */}
          {reqRunRate && (
            <>
              {/* Divider */}
              <div className="w-px h-7 bg-gradient-to-b from-transparent via-white/20 to-transparent shrink-0" />

              <div className={`flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl border ${urgencyTheme.badge}`}>
                <div className="shrink-0">{urgencyTheme.icon}</div>
                <div className="flex flex-col justify-center leading-none">
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] opacity-80">
                    {urgencyTheme.label}
                  </span>
                  <span className="text-[19px] font-black font-rajdhani tracking-tight leading-none mt-0.5">
                    {reqRunRate}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Chase Progress Line */}
          <div className="absolute -bottom-px left-4 right-4 h-[2px] bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                boxShadow: '0 0 10px rgba(251, 191, 36, 0.9)'
              }}
            />
          </div>

        </div>
      </motion.div>
    );
  }

  // -------------------------------------------------------------
  // VARIANT 2: ANGULAR (Tournament Cyber Hex Bar)
  // -------------------------------------------------------------
  if (variant === 'angular') {
    return (
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200 }}
        className="relative mb-2 z-40 select-none"
      >
        <div 
          className="relative px-7 py-2 bg-slate-950/95 backdrop-blur-2xl border-t-2 border-amber-400 border-x border-b border-white/15 shadow-[0_16px_45px_rgba(0,0,0,0.9)] flex items-center gap-5"
          style={{
            clipPath: 'polygon(14px 0%, calc(100% - 14px) 0%, 100% 100%, 0% 100%)',
          }}
        >
          {/* Target */}
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow">
              <Zap className="w-3 h-3 fill-slate-950" />
              TARGET
            </div>
            <span className="text-[22px] font-black text-white font-rajdhani tracking-tight">
              {target}
            </span>
          </div>

          <div className="w-px h-5 bg-white/20 shrink-0" />

          {/* Need */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black tracking-widest text-amber-300 uppercase">NEED</span>
            <span className="text-[24px] font-black text-white font-rajdhani tracking-tight">
              {runsNeeded}
            </span>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">RUNS OFF</span>
            <span className="text-[24px] font-black text-white font-rajdhani tracking-tight">
              {ballsRemaining}
            </span>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">BALLS</span>
          </div>

          {reqRunRate && (
            <>
              <div className="w-px h-5 bg-white/20 shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">REQ RR</span>
                <span className={`text-[20px] font-black font-rajdhani tracking-tight ${rrrNum >= 12 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                  {reqRunRate}
                </span>
              </div>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  // -------------------------------------------------------------
  // VARIANT 3: DOCKED (Seamless Broadcast Roof Tab)
  // -------------------------------------------------------------
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="relative z-40 select-none mb-0 -mb-[1px]"
    >
      <div 
        className="px-8 py-1.5 bg-slate-900/95 backdrop-blur-2xl border-t border-x border-amber-400/40 rounded-t-xl shadow-[0_-8px_25px_rgba(0,0,0,0.6)] flex items-center gap-4 text-xs font-bold"
      >
        <div className="flex items-center gap-1.5 text-amber-400">
          <Target className="w-3.5 h-3.5" />
          <span className="text-[10px] font-black tracking-widest uppercase">TARGET:</span>
          <span className="text-white text-base font-black font-rajdhani">{target}</span>
        </div>

        <span className="text-white/20">•</span>

        <div className="flex items-center gap-1.5 text-slate-200">
          <span className="text-slate-400 text-[10px] tracking-wider uppercase font-black">CHASE:</span>
          <span className="text-amber-300 font-black text-base font-rajdhani">{runsNeeded}</span>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase">OFF</span>
          <span className="text-white font-black text-base font-rajdhani">{ballsRemaining}</span>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase">BALLS</span>
        </div>

        {reqRunRate && (
          <>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px] tracking-wider uppercase font-black">REQ RR:</span>
              <span className={`text-base font-black font-rajdhani ${rrrNum >= 12 ? 'text-rose-400 font-black' : 'text-amber-300'}`}>
                {reqRunRate}
              </span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
