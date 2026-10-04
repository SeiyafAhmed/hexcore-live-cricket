"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { MatchState } from '@/hooks/useMatchState';

function RollingNumber({ value }: { value: number | string }) {
  return (
    <div className="relative inline-block overflow-hidden h-10 w-6">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center font-bold"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export default function Scorebug({ state }: { state: MatchState }) {
  const overString = `${state.overs_completed}.${state.balls_this_over}`;

  return (
    <motion.div
      initial={{ y: 150, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 150, opacity: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center bg-zinc-900/90 text-white rounded-xl shadow-2xl overflow-hidden backdrop-blur-md border border-white/10"
    >
      {/* Team Color Tab */}
      <div 
        className="w-4 h-full absolute left-0"
        style={{ backgroundColor: state.theme_color || '#1A2B3C' }}
      />
      
      <div className="pl-8 pr-6 py-4 flex items-center gap-8">
        
        {/* Score Block */}
        <div className="flex items-center text-4xl font-black gap-1">
          <RollingNumber value={state.runs} />
          <span className="text-zinc-500 mb-1">/</span>
          <RollingNumber value={state.wickets} />
        </div>

        {/* Overs & Info */}
        <div className="flex flex-col border-l border-white/20 pl-6">
          <div className="text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-1">
            Overs
          </div>
          <div className="text-xl font-bold font-mono">
            {overString}
          </div>
        </div>

        {/* Batters */}
        <div className="flex flex-col border-l border-white/20 pl-6 gap-1 min-w-[150px]">
          {(state.current_batters || []).slice(0, 2).map((batter, idx) => (
            <div key={idx} className={`text-sm font-medium ${idx === 0 ? 'text-white' : 'text-zinc-400'}`}>
              {batter}{idx === 0 && '*'}
            </div>
          ))}
        </div>
        
        {/* Bowler */}
        <div className="flex flex-col border-l border-white/20 pl-6 min-w-[120px]">
          <div className="text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-1">
            Bowler
          </div>
          <div className="text-sm font-medium text-white">
            {typeof state.bowler === 'object' && state.bowler !== null ? (state.bowler as any).name : (state.bowler || '')}
          </div>
        </div>
        
      </div>
    </motion.div>
  );
}
