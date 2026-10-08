"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AlertType = 'FOUR' | 'SIX' | 'WICKET';

export interface AlertData {
  id: string;
  type: AlertType;
  title: string;
  subtitle?: string;
  player: string;
  scoreInfo?: string;
  dismissal?: string;
}

interface BroadcastAlertProps {
  currentAlert: AlertData | null;
  onDismiss: () => void;
}

export default function BroadcastAlert({ currentAlert, onDismiss }: BroadcastAlertProps) {
  useEffect(() => {
    if (!currentAlert) return;
    const duration = currentAlert.type === 'WICKET' ? 3800 : 3500;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [currentAlert, onDismiss]);

  const isSix = currentAlert?.type === 'SIX';
  const isFour = currentAlert?.type === 'FOUR';
  const isWicket = currentAlert?.type === 'WICKET';

  let config = {
    word: 'SIX',
    gradient: 'from-[#ea580c] via-[#ff781f] to-[#ea580c]',
    topBorder: 'border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.7)]',
    watermarkColor: 'text-amber-100/25',
    ambientGlow: 'rgba(249, 115, 22, 0.45)',
  };

  if (isFour) {
    config = {
      word: 'FOUR',
      gradient: 'from-[#0369a1] via-[#0ea5e9] to-[#0284c7]',
      topBorder: 'border-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.7)]',
      watermarkColor: 'text-sky-100/25',
      ambientGlow: 'rgba(14, 165, 233, 0.45)',
    };
  } else if (isWicket) {
    config = {
      word: 'WICKET',
      gradient: 'from-[#991b1b] via-[#dc2626] to-[#b91c1c]',
      topBorder: 'border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.7)]',
      watermarkColor: 'text-rose-100/25',
      ambientGlow: 'rgba(220, 38, 38, 0.45)',
    };
  }

  return (
    <AnimatePresence>
      {currentAlert && (
        <motion.div
          key={currentAlert.id}
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="fixed bottom-0 left-0 right-0 w-full h-[96px] z-[60] select-none pointer-events-none overflow-hidden"
        >
          {/* Main Full-Width Ribbon Banner covering overlay scorecard */}
          <div
            className={`w-full h-full relative bg-gradient-to-r ${config.gradient} border-t-[3px] ${config.topBorder} flex items-center overflow-hidden shadow-[0_-12px_45px_rgba(0,0,0,0.85)]`}
          >
            {/* Ambient Glow */}
            <div
              className="absolute -inset-2 blur-xl opacity-50 pointer-events-none"
              style={{ backgroundColor: config.ambientGlow }}
            />

            {/* Layer 1: Huge Watermark Typography in Background */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
              <motion.div
                animate={{ x: [0, -360] }}
                transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                className="flex items-center gap-14 whitespace-nowrap shrink-0"
              >
                {Array.from({ length: 20 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`text-[120px] font-black uppercase tracking-tight font-sans ${config.watermarkColor} leading-none shrink-0`}
                  >
                    {config.word}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Layer 2: Fast Light Sweep Shine */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '260%' }}
              transition={{ duration: 1.15, ease: 'easeOut', repeat: Infinity, repeatDelay: 1.5 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-[-25deg] pointer-events-none z-10"
            />

            {/* Layer 3: Foreground Bold Repeating Text with Mirror Reflection */}
            <div className="relative w-full h-full flex items-center overflow-hidden z-20">
              <motion.div
                animate={{ x: [0, -520] }}
                transition={{ repeat: Infinity, duration: 5.5, ease: 'linear' }}
                className="flex items-center gap-14 lg:gap-16 whitespace-nowrap shrink-0"
              >
                {Array.from({ length: 24 }).map((_, idx) => (
                  <span
                    key={idx}
                    style={{
                      WebkitBoxReflect: 'below -10px linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 60%)',
                    }}
                    className="text-[42px] lg:text-[46px] font-black uppercase tracking-[0.22em] text-[#050505] font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] leading-none shrink-0 select-none"
                  >
                    {config.word}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Subtle Bottom Accent Line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/30 pointer-events-none z-30" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
