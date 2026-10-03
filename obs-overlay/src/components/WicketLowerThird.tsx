"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WicketLowerThird({ 
  wickets, 
  currentBatters 
}: { 
  wickets: number; 
  currentBatters: string[] 
}) {
  const [show, setShow] = useState(false);
  const [outBatsman, setOutBatsman] = useState("");
  const prevWickets = useRef(wickets);

  useEffect(() => {
    if (wickets > prevWickets.current) {
      // Wicket occurred! Determine out batsman (simplistic approach: just use the first in list, 
      // or if app sends a specific 'out_batsman' use that. We'll use a placeholder or the main striker).
      setOutBatsman(currentBatters[0] || "Batsman");
      setShow(true);

      const timer = setTimeout(() => {
        setShow(false);
      }, 5000); // Hide after 5 seconds

      return () => clearTimeout(timer);
    }
    prevWickets.current = wickets;
  }, [wickets, currentBatters]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ x: -500, opacity: 0 }} // Slide off-screen left
          transition={{ type: "spring", damping: 15, stiffness: 100 }}
          className="fixed top-20 left-20 bg-red-600 text-white shadow-2xl rounded-lg overflow-hidden border border-red-500/50 flex flex-col min-w-[350px]"
        >
          <div className="bg-red-800 px-6 py-2 text-xs font-black uppercase tracking-[0.3em] opacity-90">
            Wicket
          </div>
          <div className="px-8 py-6 flex flex-col">
            <span className="text-3xl font-bold">{outBatsman}</span>
            <span className="text-red-200 text-sm mt-1 uppercase font-semibold">is out</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
