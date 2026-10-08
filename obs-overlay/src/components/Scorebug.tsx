"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchState } from '@/hooks/useMatchState';

function getTeamLogoUrl(logoPath?: string | null, teamName?: string) {
  if (logoPath?.startsWith('http')) return logoPath;
  if (logoPath) {
    const filename = logoPath.split('/').pop();
    if (filename) return `/logos/${filename}`;
  }
  const name = (teamName || '').toLowerCase();
  if (name.includes('north') || name.includes('navigat')) return '/logos/nn.png';
  if (name.includes('south') || name.includes('strik')) return '/logos/ss.png';
  if (name.includes('central') || name.includes('champ')) return '/logos/cc.png';
  if (name.includes('east') || name.includes('eagle')) return '/logos/ee.png';
  if (name.includes('west') || name.includes('warrior')) return '/logos/ww.png';
  return null;
}

function formatSpeed(speed?: string | number | null): string | null {
  if (speed == null) return null;
  const s = String(speed).trim();
  if (!s || s === '0' || s === 'null' || s === 'undefined') return null;
  if (/km\/h|kph|mph/i.test(s)) return s;
  return `${s} km/h`;
}

function BallChip({ ball }: { ball?: string }) {
  if (!ball) {
    return (
      <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white/20 font-mono shrink-0">
        •
      </div>
    );
  }

  const upper = ball.toUpperCase();
  const isWicket = upper.includes('W') && !upper.includes('WD');
  const isFour = ball === '4';
  const isSix = ball === '6';
  const isWide = upper.includes('WD');
  const isNoBall = upper.includes('NB');

  let style = "bg-white/10 border-white/20 text-white";
  if (isWicket) {
    style = "bg-rose-600 border-rose-400 text-white font-extrabold shadow-[0_0_12px_rgba(225,29,72,0.6)]";
  } else if (isFour) {
    style = "bg-sky-500 border-sky-300 text-white font-extrabold shadow-[0_0_12px_rgba(14,165,233,0.5)]";
  } else if (isSix) {
    style = "bg-amber-400 border-amber-200 text-slate-950 font-black shadow-[0_0_12px_rgba(251,191,36,0.6)]";
  } else if (isWide || isNoBall) {
    style = "bg-orange-500 border-orange-300 text-white font-bold";
  } else if (ball === '0' || ball === '.') {
    style = "bg-white/5 border-white/10 text-white/40";
  }

  // Auto-scale width and font size for composite labels like Wd+1B
  const len = ball.length;
  let sizeClass = "w-7 h-7 text-[13px]";
  if (len === 2) {
    sizeClass = "min-w-[28px] h-7 px-1 text-[11px] font-extrabold";
  } else if (len >= 3) {
    sizeClass = "min-w-[36px] h-7 px-1.5 text-[10px] font-black tracking-tight";
  }

  return (
    <div
      className={`rounded-md border flex items-center justify-center shrink-0 leading-none transition-all whitespace-nowrap ${sizeClass} ${style}`}
    >
      {ball === '.' ? '•' : ball}
    </div>
  );
}

import { AlertType } from './BroadcastAlert';

export default function Scorebug({ 
  state,
  activeAlert,
}: { 
  state: MatchState;
  activeAlert?: AlertType | null;
}) {
  // Teams info
  const battingTeamName = state.batting_team_name || state.team_1_name || 'Northern Navigator';
  const bowlingTeamName = state.bowling_team_name || state.team_2_name || 'Central Champions';
  const battingColor = state.batting_team_color || state.theme_color || '#ff007f';
  const bowlingColor = state.bowling_team_color || '#059669';

  const battingLogo = getTeamLogoUrl(state.batting_team_logo, battingTeamName) || '/logos/nn.png';
  const bowlingLogo = getTeamLogoUrl(state.bowling_team_logo, bowlingTeamName) || '/logos/cc.png';

  // Batters
  const strikerName = state.striker?.name || state.current_batters?.[0] || 'Mohamed Raazim';
  const strikerRuns = state.striker?.runs ?? (state.batsmen_stats?.[strikerName]?.runs ?? 0);
  const strikerBalls = state.striker?.balls ?? (state.batsmen_stats?.[strikerName]?.balls ?? 0);
  const striker4s = state.striker?.['4s'] ?? (state.batsmen_stats?.[strikerName]?.['4s'] ?? 0);
  const striker6s = state.striker?.['6s'] ?? (state.batsmen_stats?.[strikerName]?.['6s'] ?? 0);

  const nonStrikerName = state.non_striker?.name || state.current_batters?.[1] || 'Mohamed Saad';
  const nonStrikerRuns = state.non_striker?.runs ?? (state.batsmen_stats?.[nonStrikerName]?.runs ?? 0);
  const nonStrikerBalls = state.non_striker?.balls ?? (state.batsmen_stats?.[nonStrikerName]?.balls ?? 0);

  // Score & Overs
  const runs = state.runs ?? 0;
  const wickets = state.wickets ?? 0;
  const oversCompleted = state.overs_completed ?? 0;
  const ballsThisOver = state.balls_this_over ?? 0;
  const maxOvers = state.max_overs ?? 5;
  const overString = `${oversCompleted}.${ballsThisOver}`;

  const totalBalls = oversCompleted * 6 + ballsThisOver;
  const runRate = totalBalls > 0 ? ((runs / totalBalls) * 6).toFixed(2) : '0.00';

  // 2nd innings / Chase status
  const target = state.target;
  const isSecondInnings = (state.innings === 2) || (target != null && target > 0);
  const runsNeeded = target != null ? Math.max(0, target - runs) : null;
  const ballsRemaining = maxOvers ? Math.max(0, maxOvers * 6 - totalBalls) : null;
  const reqRunRate = (runsNeeded != null && ballsRemaining != null && ballsRemaining > 0)
    ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
    : null;

  // Bowler
  const bowlerName = typeof state.bowler === 'object' && state.bowler ? state.bowler.name : (state.bowler || 'Inshaf Ahmed');
  const bowlerRuns = typeof state.bowler === 'object' && state.bowler ? state.bowler.runs : (state.bowler_stats?.[bowlerName]?.runs ?? 0);
  const bowlerWickets = typeof state.bowler === 'object' && state.bowler ? state.bowler.wickets : (state.bowler_stats?.[bowlerName]?.wickets ?? 0);
  const bowlerOvers = typeof state.bowler === 'object' && state.bowler ? state.bowler.overs : (state.bowler_stats?.[bowlerName]?.overs ?? 0.0);
  const ballSpeed = formatSpeed(state.ball_speed);

  // Ball Speed auto-dismiss timer (disappears after 3 seconds)
  const [visibleSpeed, setVisibleSpeed] = React.useState<string | null>(null);
  const speedTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (ballSpeed) {
      setVisibleSpeed(ballSpeed);
      if (speedTimerRef.current) {
        clearTimeout(speedTimerRef.current);
      }
      speedTimerRef.current = setTimeout(() => {
        setVisibleSpeed(null);
      }, 3000);
    } else {
      setVisibleSpeed(null);
      if (speedTimerRef.current) {
        clearTimeout(speedTimerRef.current);
      }
    }

    return () => {
      if (speedTimerRef.current) {
        clearTimeout(speedTimerRef.current);
      }
    };
  }, [ballSpeed, state.ball_speed_time]);

  // This Over deliveries (at least 6 slots, auto-expands for extra balls)
  const thisOver = state.this_over || [];
  const totalSlots = Math.max(6, thisOver.length);
  const overSlots = Array.from({ length: totalSlots });

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 140 }}
      className="fixed bottom-0 left-0 right-0 w-full flex flex-col items-center justify-end z-50 select-none"
    >
      {/* Target Micro-Banner (If 2nd Innings) */}
      {isSecondInnings && target && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-2 px-7 py-1.5 rounded-full bg-slate-900/95 backdrop-blur-md border border-white/10 text-sm font-semibold tracking-wider text-amber-300 shadow-xl flex items-center gap-3"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span>TARGET: <strong className="text-white text-base">{target}</strong></span>
          <span className="text-white/30">•</span>
          <span>NEED <strong className="text-white text-base">{runsNeeded}</strong> OFF <strong className="text-white text-base">{ballsRemaining}</strong> BALLS</span>
          {reqRunRate && (
            <>
              <span className="text-white/30">•</span>
              <span>REQ RR: <strong className="text-amber-200 text-base">{reqRunRate}</strong></span>
            </>
          )}
        </motion.div>
      )}

      {/* Full Screen Width Broadcast Bar */}
      <div className="w-full relative bg-slate-950/95 backdrop-blur-2xl border-t border-white/15 shadow-[0_-12px_45px_rgba(0,0,0,0.85)] flex items-stretch h-[96px] px-2 md:px-3 lg:px-4">
        
        {/* Dynamic Top Ambient Glow Line */}
        <div 
          className="absolute top-0 left-0 right-0 h-[3px] opacity-95"
          style={{
            background: `linear-gradient(to right, ${battingColor}, ${battingColor} 50%, ${bowlingColor} 80%, ${bowlingColor})`,
          }}
        />

        {/* ---------------- SECTION 1: Batting Team & Big Score ---------------- */}
        <div className="flex items-center pl-1 pr-4 py-1 gap-4 shrink-0 bg-white/[0.02] relative">
          {/* Batting Team Logo with Ambient Ring (Larger than scorecard height) */}
          <div className="relative shrink-0 flex items-center justify-center z-20">
            <div 
              className="absolute -inset-4 rounded-full blur-2xl opacity-50 pointer-events-none"
              style={{ backgroundColor: battingColor }}
            />
            {battingLogo ? (
              <img
                src={battingLogo}
                alt={battingTeamName}
                className="relative w-[124px] h-[124px] object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.85)] filter transition-all -translate-y-3"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                className="relative w-[114px] h-[114px] rounded-3xl flex items-center justify-center font-black text-3xl text-white shadow-2xl -translate-y-2.5 border-2 border-white/20"
                style={{ backgroundColor: battingColor }}
              >
                {battingTeamName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Team Name & Main Score */}
          <div className="relative flex flex-col justify-center">
            {/* Ambient celebration halo glow */}
            {activeAlert === 'FOUR' && (
              <div className="absolute -inset-2 rounded-2xl blur-xl bg-sky-400/35 pointer-events-none animate-pulse" />
            )}
            {activeAlert === 'SIX' && (
              <div className="absolute -inset-2 rounded-2xl blur-xl bg-amber-400/40 pointer-events-none animate-pulse" />
            )}
            {activeAlert === 'WICKET' && (
              <div className="absolute -inset-2 rounded-2xl blur-xl bg-rose-500/40 pointer-events-none animate-pulse" />
            )}

            <div className="relative text-[13px] font-black uppercase tracking-widest text-white/50 mb-0.5 truncate max-w-[150px]">
              {battingTeamName}
            </div>
            <div className="relative flex items-baseline gap-1.5 leading-none">
              <span className="text-[44px] lg:text-[48px] font-black text-white tracking-tight font-sans">
                {runs}
              </span>
              <span 
                className="text-[28px] font-black mx-0.5"
                style={{ color: battingColor }}
              >
                /
              </span>
              <span 
                className="text-[44px] lg:text-[48px] font-black tracking-tight font-sans"
                style={{ color: battingColor }}
              >
                {wickets}
              </span>
            </div>
          </div>

          {/* Overs & Run Rate Stack */}
          <div className="flex flex-col justify-center border-l border-white/10 pl-5 pr-2 leading-tight">
            <div className="text-[13px] uppercase tracking-wider text-white/50 font-bold mb-0.5">
              Overs
            </div>
            <div className="text-[18px] font-bold text-white font-mono">
              {overString} <span className="text-white/40 text-[14px] font-normal">/ {maxOvers}</span>
            </div>
            <div className="text-[13px] font-bold text-emerald-400 font-mono mt-0.5">
              CRR: {runRate}
            </div>
          </div>
        </div>

        {/* Vertical Glass Divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-white/15 to-transparent shrink-0 my-2" />

        {/* ---------------- SECTION 2: Active Batters (Expands horizontally) ---------------- */}
        <div className="flex-1 flex flex-col justify-center px-5 lg:px-6 py-2 gap-2 min-w-[280px]">
          {/* Striker Row */}
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2.5 truncate">
              {/* Glowing Striker Dot Indicator */}
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
              </span>
              <span className="text-[18px] lg:text-[19px] font-bold text-white tracking-wide truncate">
                {strikerName}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 font-mono shrink-0 ml-6">
              <span className="text-[19px] lg:text-[20px] font-bold text-amber-300">
                {strikerRuns}
              </span>
              <span className="text-[14px] text-white/50">
                ({strikerBalls})
              </span>
            </div>
          </div>

          {/* Non-Striker Row */}
          <div className="flex items-center justify-between text-white/70">
            <div className="flex items-center gap-2.5 truncate pl-5">
              <span className="text-[17px] lg:text-[18px] font-semibold text-white/80 tracking-wide truncate">
                {nonStrikerName}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 font-mono shrink-0 ml-6">
              <span className="text-[18px] lg:text-[19px] font-bold text-white/90">
                {nonStrikerRuns}
              </span>
              <span className="text-[14px] text-white/50">
                ({nonStrikerBalls})
              </span>
            </div>
          </div>
        </div>

        {/* Vertical Glass Divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-white/15 to-transparent shrink-0 my-2" />

        {/* ---------------- SECTION 3: Current Bowler ---------------- */}
        <div className="flex flex-col justify-center px-5 lg:px-6 py-2 min-w-[195px] bg-white/[0.01]">
          <div className="flex items-center justify-between gap-3 mb-0.5">
            <span className="text-[13px] font-bold uppercase tracking-wider text-white/50">
              Bowler
            </span>
          </div>
          <div className="text-[18px] lg:text-[19px] font-bold text-white tracking-wide truncate max-w-[190px]">
            {bowlerName}
          </div>
          <div className="text-[14px] font-mono text-white/85 font-semibold mt-0.5">
            <span className="text-rose-400 font-bold text-[16px]">{bowlerWickets}</span>
            <span className="text-white/40"> / </span>
            <span className="text-white font-bold text-[16px]">{bowlerRuns}</span>
            <span className="text-white/50 ml-2 font-normal">
              ({typeof bowlerOvers === 'number' ? bowlerOvers.toFixed(1) : bowlerOvers} ov)
            </span>
          </div>
        </div>

        {/* Vertical Glass Divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-white/15 to-transparent shrink-0 my-2" />

        {/* ---------------- SECTION 4: This Over Ball Chips / Ball Speed ---------------- */}
        <div className="flex flex-col justify-center items-center px-4 py-2 shrink-0 bg-white/[0.01] min-w-[205px] h-full relative">
          <AnimatePresence mode="wait">
            {visibleSpeed ? (
              <motion.div
                key={`speed-display-${visibleSpeed}`}
                initial={{ opacity: 0, scale: 0.88, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: -5 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex flex-col items-center justify-center w-full"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-400 mb-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                  <span>SPEED</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 border border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
                  <span className="text-amber-400 text-sm">⚡</span>
                  <span className="text-[20px] lg:text-[22px] font-black font-mono text-white tracking-wide">
                    {visibleSpeed}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="this-over-chips"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col justify-center items-center w-full"
              >
                <div className="text-[13px] font-bold uppercase tracking-wider text-white/50 mb-1.5 text-center">
                  This Over
                </div>
                <div className="flex items-center gap-1.5">
                  {overSlots.map((_, idx) => (
                    <BallChip key={idx} ball={thisOver[idx]} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Vertical Glass Divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-white/15 to-transparent shrink-0 my-2" />

        {/* ---------------- SECTION 5: Bowling Team Logo ---------------- */}
        <div className="flex items-center pl-3 pr-1 py-1 shrink-0 bg-white/[0.02] relative z-20">
          <div className="relative shrink-0 flex items-center justify-center">
            <div 
              className="absolute -inset-4 rounded-full blur-2xl opacity-45 pointer-events-none"
              style={{ backgroundColor: bowlingColor }}
            />
            {bowlingLogo ? (
              <img
                src={bowlingLogo}
                alt={bowlingTeamName}
                className="relative w-[124px] h-[124px] object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.85)] filter transition-all -translate-y-3"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                className="relative w-[114px] h-[114px] rounded-3xl flex items-center justify-center font-black text-3xl text-white shadow-2xl -translate-y-2.5 border-2 border-white/20"
                style={{ backgroundColor: bowlingColor }}
              >
                {bowlingTeamName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
