"use client";

import { useMatchState } from '@/hooks/useMatchState';
import Scorebug from '@/components/Scorebug';
import WicketLowerThird from '@/components/WicketLowerThird';
import { AnimatePresence } from 'framer-motion';

export default function OverlayPage() {
  // Use localhost in dev, but OBS will use the same if hosted locally
  const { matchState, isConnected } = useMatchState('ws://127.0.0.1:8000/ws/match-state/');

  return (
    <main className="w-screen h-screen overflow-hidden relative">
      {/* 
        The background is transparent globally (via globals.css), 
        so anything not rendered here shows the OBS source underneath.
      */}
      
      {matchState && (
        <>
          <WicketLowerThird 
            wickets={matchState.wickets} 
            currentBatters={matchState.current_batters} 
          />
          
          <AnimatePresence>
            {isConnected && (
              <Scorebug state={matchState} />
            )}
          </AnimatePresence>
        </>
      )}
      
      {!isConnected && (
        <div className="absolute top-4 left-4 px-3 py-1 bg-red-500/80 text-white rounded text-xs font-mono font-bold animate-pulse">
          WS Disconnected
        </div>
      )}
    </main>
  );
}
