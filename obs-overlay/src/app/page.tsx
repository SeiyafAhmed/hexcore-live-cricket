"use client";

import { useState, useEffect, useRef } from 'react';
import { useMatchState, MatchState } from '@/hooks/useMatchState';
import Scorebug from '@/components/Scorebug';
import BroadcastAlert, { AlertData } from '@/components/BroadcastAlert';
import PlayerOutCard, { PlayerOutData } from '@/components/PlayerOutCard';
import { AnimatePresence } from 'framer-motion';

const DEFAULT_PREVIEW_STATE: MatchState = {
  runs: 95,
  wickets: 3,
  overs_completed: 4,
  balls_this_over: 5,
  max_overs: 5,
  striker: { name: 'Mohamed Raazim', runs: 28, balls: 14, '4s': 3, '6s': 1 },
  non_striker: { name: 'Mohamed Saad', runs: 16, balls: 9, '4s': 2, '6s': 0 },
  bowler: { name: 'Inshaf Ahmed', runs: 18, overs: 1.5, wickets: 2 },
  this_over: ['1', '0', '4', '6', 'Wd'],
  batting_team_name: 'Northern Navigator',
  bowling_team_name: 'Central Champions',
  batting_team_color: '#ff007f',
  bowling_team_color: '#059669',
  batting_team_logo: '/logos/nn.png',
  bowling_team_logo: '/logos/cc.png',
  theme_color: '#ff007f',
  ball_speed: null,
};

/**
 * Helper to determine if a delivery is an extra or not off the bat.
 * By cricket rules, runs scored from wides, byes, leg-byes, or penalties
 * are NOT hit by the batsman.
 */
function isExtraOrNotOffBat(ballLabel: string): boolean {
  if (!ballLabel) return false;
  const s = ballLabel.trim().toLowerCase();

  // 1. Wide delivery (e.g. "wd", "wd+6b", "6+wd", "1+wd", "wide")
  if (s.includes('wd') || s.includes('wide')) {
    return true;
  }

  // 2. Penalty runs (e.g. "5 pen")
  if (s.includes('pen')) {
    return true;
  }

  // 3. Leg Byes (e.g. "4lb", "1lb", "nb+4lb", "4l nb", "lb", "leg bye")
  if (s.includes('lb') || s.includes('leg bye') || s.includes('l nb')) {
    return true;
  }

  // 4. Byes: 'b' that is not part of 'nb' / 'no ball'
  // (e.g. "4b", "6b", "1b", "wd+6b", "nb+4b", "4b nb", "byes")
  const stripped = s.replace(/no[\s_-]?ball/g, '').replace(/nb/g, '');
  if (stripped.includes('b')) {
    return true;
  }

  return false;
}

/**
 * Checks if any batsman's individual score or boundary counter increased.
 * In cricket, 4 and 6 animations should only play when the runs came off the bat.
 */
function getBatterScoreGains(current: MatchState, previous: MatchState): {
  type: 'FOUR' | 'SIX';
  player: string;
  score: string;
} | null {
  // Check full batsmen_stats map first
  if (current.batsmen_stats && previous.batsmen_stats) {
    for (const name of Object.keys(current.batsmen_stats)) {
      const curB = current.batsmen_stats[name];
      const prevB = previous.batsmen_stats[name];
      if (curB && prevB) {
        const runDiff = curB.runs - prevB.runs;
        const sixesDiff = (curB['6s'] ?? 0) - (prevB['6s'] ?? 0);
        const foursDiff = (curB['4s'] ?? 0) - (prevB['4s'] ?? 0);

        if (runDiff === 6 || sixesDiff > 0) {
          return {
            type: 'SIX',
            player: name,
            score: `${curB.runs} (${curB.balls})`,
          };
        }
        if (runDiff === 4 || foursDiff > 0) {
          return {
            type: 'FOUR',
            player: name,
            score: `${curB.runs} (${curB.balls})`,
          };
        }
      }
    }
  }

  // Check striker & non_striker objects if batsmen_stats is incomplete
  const curBatters = [current.striker, current.non_striker].filter(Boolean);
  const prevBatters = [previous.striker, previous.non_striker].filter(Boolean);
  for (const cb of curBatters) {
    if (!cb) continue;
    const pb = prevBatters.find(p => p && p.name === cb.name);
    if (pb) {
      const runDiff = cb.runs - pb.runs;
      const sixesDiff = (cb['6s'] ?? 0) - (pb['6s'] ?? 0);
      const foursDiff = (cb['4s'] ?? 0) - (pb['4s'] ?? 0);

      if (runDiff === 6 || sixesDiff > 0) {
        return {
          type: 'SIX',
          player: cb.name,
          score: `${cb.runs} (${cb.balls})`,
        };
      }
      if (runDiff === 4 || foursDiff > 0) {
        return {
          type: 'FOUR',
          player: cb.name,
          score: `${cb.runs} (${cb.balls})`,
        };
      }
    }
  }

  return null;
}

/**
 * Fallback to check if a single ball notation represents a hit boundary (4 or 6).
 * Only used if individual batsman stats are unavailable.
 */
function getHitBoundaryType(ballLabel: string): 'FOUR' | 'SIX' | null {
  if (!ballLabel) return null;
  if (isExtraOrNotOffBat(ballLabel)) return null;

  const s = ballLabel.trim().toLowerCase();

  // Wickets with runs (e.g. "4 + W", "W") should not trigger boundary celebration
  if (s.includes('w')) return null;

  // Check for 6 hit off the bat (e.g. "6", "nb+6", "6+nb", "6 nb")
  if (s === '6' || s === 'nb+6' || s === '6+nb' || s === '6 nb' || s.endsWith('+6') || s.startsWith('6+')) {
    return 'SIX';
  }

  // Check for 4 hit off the bat (e.g. "4", "nb+4", "4+nb", "4 nb")
  if (s === '4' || s === 'nb+4' || s === '4+nb' || s === '4 nb' || s.endsWith('+4') || s.startsWith('4+')) {
    return 'FOUR';
  }

  return null;
}

export default function OverlayPage() {
  const [mounted, setMounted] = useState(false);
  const { matchState, isConnected } = useMatchState();
  const [currentAlert, setCurrentAlert] = useState<AlertData | null>(null);
  const [playerOutCard, setPlayerOutCard] = useState<PlayerOutData | null>(null);
  const pendingOutCardRef = useRef<PlayerOutData | null>(null);
  const [customSpeed, setCustomSpeed] = useState<string | null>(null);
  const [showDevControls, setShowDevControls] = useState(false);
  const prevStateRef = useRef<MatchState | null>(null);
  const lastHandledEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcuts for instant testing: press '4', '6', or 'W'
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === '4') {
        triggerAlert('FOUR');
      } else if (key === '6') {
        triggerAlert('SIX');
      } else if (key === 'w') {
        triggerAlert('WICKET');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matchState]);

  // Helper to trigger broadcast alerts
  const triggerAlert = (type: 'FOUR' | 'SIX' | 'WICKET') => {
    const currentState = matchState || DEFAULT_PREVIEW_STATE;
    const striker = currentState.striker?.name || currentState.current_batters?.[0] || 'Striker';
    const strikerScore = currentState.striker ? `${currentState.striker.runs} (${currentState.striker.balls})` : '';
    const bowler = typeof currentState.bowler === 'object' && currentState.bowler ? currentState.bowler.name : (currentState.bowler || '');

    if (type === 'FOUR') {
      setCurrentAlert({
        id: `four-${Date.now()}`,
        type: 'FOUR',
        title: 'BOUNDARY FOUR!',
        subtitle: 'CRACKING SHOT TO THE ROPE',
        player: striker,
        scoreInfo: strikerScore || '4 RUNS',
      });
    } else if (type === 'SIX') {
      setCurrentAlert({
        id: `six-${Date.now()}`,
        type: 'SIX',
        title: 'MAXIMUM SIX!',
        subtitle: 'CLEAN HIT INTO THE STANDS',
        player: striker,
        scoreInfo: strikerScore || '6 RUNS',
      });
    } else if (type === 'WICKET') {
      const outPlayer = currentState.striker?.name || currentState.current_batters?.[0] || 'Mohamed Raazim';
      const sRuns = currentState.striker?.runs ?? 28;
      const sBalls = currentState.striker?.balls ?? 14;
      const sFours = currentState.striker?.['4s'] ?? 3;
      const sSixes = currentState.striker?.['6s'] ?? 1;
      const sSr = sBalls > 0 ? Math.round((sRuns / sBalls) * 1000) / 10 : 200.0;
      const bowlerName = bowler || 'Inshaf Ahmed';

      pendingOutCardRef.current = {
        playerName: outPlayer,
        runs: sRuns,
        balls: sBalls,
        fours: sFours,
        sixes: sSixes,
        strikeRate: sSr,
        methodOfOut: `c Fielder b ${bowlerName}`,
        teamName: currentState.batting_team_name || 'Northern Navigator',
        teamColor: currentState.batting_team_color || currentState.theme_color || '#ff007f',
      };

      setCurrentAlert({
        id: `wkt-${Date.now()}`,
        type: 'WICKET',
        title: 'WICKET FALLEN',
        subtitle: bowler ? `b ${bowler}` : 'OUT!',
        player: outPlayer,
        scoreInfo: `${currentState.runs}/${currentState.wickets + (matchState ? 0 : 1)}`,
      });
    }
  };

  // Called when BroadcastAlert ribbon finishes: seamlessly trigger PlayerOutCard if a wicket fell
  const handleAlertDismiss = () => {
    const isWkt = currentAlert?.type === 'WICKET';
    setCurrentAlert(null);

    if (isWkt && pendingOutCardRef.current) {
      setPlayerOutCard(pendingOutCardRef.current);
      pendingOutCardRef.current = null;
    }
  };

  // Real-time auto detection from matchState WebSocket stream
  useEffect(() => {
    if (!matchState) return;
    const prev = prevStateRef.current;

    // A. Explicit backend event (highest priority, 100% accurate)
    if (matchState.last_event && matchState.last_event.id) {
      if (matchState.last_event.id !== lastHandledEventIdRef.current) {
        lastHandledEventIdRef.current = matchState.last_event.id;
        const ev = matchState.last_event;
        if (ev.type === 'FOUR') {
          setCurrentAlert({
            id: ev.id,
            type: 'FOUR',
            title: ev.title || 'BOUNDARY FOUR!',
            subtitle: ev.subtitle || 'CRACKING SHOT TO THE FENCE',
            player: ev.player || matchState.striker?.name || 'Batter',
            scoreInfo: ev.scoreInfo || '',
          });
        } else if (ev.type === 'SIX') {
          setCurrentAlert({
            id: ev.id,
            type: 'SIX',
            title: ev.title || 'MAXIMUM SIX!',
            subtitle: ev.subtitle || 'CLEAN HIT INTO THE STANDS',
            player: ev.player || matchState.striker?.name || 'Batter',
            scoreInfo: ev.scoreInfo || '',
          });
        } else if (ev.type === 'WICKET') {
          const cardData: PlayerOutData = ev.wicket_card || matchState.last_wicket || {
            playerName: ev.player || matchState.striker?.name || 'Batsman',
            runs: matchState.batsmen_stats?.[ev.player || '']?.runs ?? 0,
            balls: matchState.batsmen_stats?.[ev.player || '']?.balls ?? 0,
            fours: matchState.batsmen_stats?.[ev.player || '']?.['4s'] ?? 0,
            sixes: matchState.batsmen_stats?.[ev.player || '']?.['6s'] ?? 0,
            strikeRate: matchState.batsmen_stats?.[ev.player || '']?.balls 
              ? Math.round(((matchState.batsmen_stats[ev.player || ''].runs / matchState.batsmen_stats[ev.player || ''].balls) * 100) * 10) / 10 
              : 0,
            methodOfOut: ev.dismissal || ev.subtitle || 'OUT',
            teamName: matchState.batting_team_name,
            teamColor: matchState.batting_team_color || matchState.theme_color,
          };
          pendingOutCardRef.current = cardData;

          setCurrentAlert({
            id: ev.id,
            type: 'WICKET',
            title: ev.title || 'WICKET FALLEN',
            subtitle: ev.subtitle || (ev.dismissal ? ev.dismissal : 'OUT!'),
            player: ev.player || 'Batter',
            scoreInfo: ev.scoreInfo || `${matchState.runs} / ${matchState.wickets}`,
          });
        }
      }
    } 
    // B. State-diff fallback detection (for clients/modes without explicit last_event)
    else if (prev) {
      // 1. WICKET DETECTION
      if (matchState.wickets > prev.wickets && prev.wickets >= 0) {
        const outPlayer = prev.striker?.name || prev.current_batters?.[0] || 'Batter';
        const bowlerName = typeof matchState.bowler === 'object' && matchState.bowler ? matchState.bowler.name : (matchState.bowler || '');
        const outStat = matchState.last_wicket || matchState.batsmen_stats?.[outPlayer] || prev.striker;
        const outStatAny = outStat as Record<string, any> | undefined;
        const bRuns = outStat?.runs ?? 0;
        const bBalls = outStat?.balls ?? 0;
        const bFours = outStatAny?.fours ?? outStatAny?.['4s'] ?? 0;
        const bSixes = outStatAny?.sixes ?? outStatAny?.['6s'] ?? 0;
        const bSr = outStatAny?.strikeRate ?? (bBalls > 0 ? Math.round((bRuns / bBalls) * 1000) / 10 : 0);
        const bMethod = outStatAny?.methodOfOut || outStatAny?.dismissal || outStatAny?.status || (bowlerName ? `b ${bowlerName}` : 'OUT');

        pendingOutCardRef.current = {
          playerName: outPlayer,
          runs: bRuns,
          balls: bBalls,
          fours: bFours,
          sixes: bSixes,
          strikeRate: bSr,
          methodOfOut: bMethod,
          teamName: matchState.batting_team_name,
          teamColor: matchState.batting_team_color || matchState.theme_color,
        };

        setCurrentAlert({
          id: `wkt-${Date.now()}`,
          type: 'WICKET',
          title: 'WICKET FALLEN',
          subtitle: bowlerName ? `b ${bowlerName}` : 'OUT!',
          player: outPlayer,
          scoreInfo: `${matchState.runs} / ${matchState.wickets}`,
        });
      }
      // 2. BOUNDARY DETECTION (ONLY WHEN PLAYER HIT - OFF THE BAT!)
      else {
        const hasNewBall = Boolean(
          matchState.this_over && 
          prev.this_over && 
          matchState.this_over.length > prev.this_over.length
        );
        const lastBall = hasNewBall 
          ? (matchState.this_over![matchState.this_over!.length - 1] || '') 
          : '';

        // If the ball was an extra (byes, leg byes, wide, penalty), NEVER play 4 or 6 animation
        if (!isExtraOrNotOffBat(lastBall)) {
          // Check batter score changes to ensure runs were actually hit off the bat
          const batterGain = getBatterScoreGains(matchState, prev);

          if (batterGain?.type === 'SIX') {
            setCurrentAlert({
              id: `six-${Date.now()}`,
              type: 'SIX',
              title: 'MAXIMUM SIX!',
              subtitle: 'CLEAN HIT INTO THE STANDS',
              player: batterGain.player,
              scoreInfo: batterGain.score,
            });
          } else if (batterGain?.type === 'FOUR') {
            setCurrentAlert({
              id: `four-${Date.now()}`,
              type: 'FOUR',
              title: 'BOUNDARY FOUR!',
              subtitle: 'CRACKING SHOT TO THE FENCE',
              player: batterGain.player,
              scoreInfo: batterGain.score,
            });
          } else if (!batterGain && hasNewBall) {
            // If individual batter stats weren't tracked / available, check explicit ball label
            const boundaryHit = getHitBoundaryType(lastBall);
            const striker = matchState.striker?.name || matchState.current_batters?.[0] || 'Batter';
            const strikerScore = matchState.striker ? `${matchState.striker.runs} (${matchState.striker.balls})` : '';

            if (boundaryHit === 'SIX') {
              setCurrentAlert({
                id: `six-${Date.now()}`,
                type: 'SIX',
                title: 'MAXIMUM SIX!',
                subtitle: 'CLEAN HIT INTO THE STANDS',
                player: striker,
                scoreInfo: strikerScore,
              });
            } else if (boundaryHit === 'FOUR') {
              setCurrentAlert({
                id: `four-${Date.now()}`,
                type: 'FOUR',
                title: 'BOUNDARY FOUR!',
                subtitle: 'CRACKING SHOT TO THE FENCE',
                player: striker,
                scoreInfo: strikerScore,
              });
            }
          }
        }
      }
    }

    prevStateRef.current = matchState;
  }, [matchState]);

  if (!mounted) {
    return null;
  }

  const baseState = matchState || DEFAULT_PREVIEW_STATE;
  const currentDisplayState = customSpeed !== null
    ? { ...baseState, ball_speed: customSpeed === 'OFF' ? null : customSpeed }
    : baseState;

  return (
    <main className="w-screen h-screen overflow-hidden relative select-none" suppressHydrationWarning>
      {/* 
        The background is transparent globally (via globals.css), 
        so anything not rendered here shows the OBS source underneath.
      */}

      {/* Broadcast Event Animation Alert (Four, Six, Wicket) */}
      <BroadcastAlert 
        currentAlert={currentAlert}
        onDismiss={handleAlertDismiss}
      />

      {/* Player Out Card (Appears after Wicket animation) */}
      <PlayerOutCard 
        data={playerOutCard} 
        onDismiss={() => setPlayerOutCard(null)} 
      />

      {/* Full-Width Broadcast Scorebar */}
      <AnimatePresence>
        <Scorebug 
          state={currentDisplayState} 
          activeAlert={currentAlert?.type}
        />
      </AnimatePresence>

      {/* SSE Stream Disconnected Badge (shown only if offline) */}
      {!isConnected && (
        <div 
          className="absolute top-4 left-4 px-3.5 py-1.5 bg-red-600/90 text-white rounded-full text-xs font-mono font-bold animate-pulse shadow-lg backdrop-blur-md border border-red-400/30 flex items-center gap-2"
          suppressHydrationWarning
        >
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          Stream Offline
        </div>
      )}

      {/* Interactive Dev Testing Controls (Press 4, 6, W or click pills) */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {showDevControls ? (
          <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full shadow-xl">
            <button
              onClick={() => triggerAlert('FOUR')}
              className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Test 4
            </button>
            <button
              onClick={() => triggerAlert('SIX')}
              className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Test 6
            </button>
            <button
              onClick={() => triggerAlert('WICKET')}
              className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30 hover:bg-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Test Wicket
            </button>
            <button
              onClick={() => {
                const speeds = ['145.2', '152.8', 'OFF', null];
                const cur = customSpeed;
                const nextIdx = (speeds.indexOf(cur) + 1) % speeds.length;
                setCustomSpeed(speeds[nextIdx]);
              }}
              className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              ⚡ Speed: {customSpeed === 'OFF' ? 'None' : (customSpeed || '143.8')}
            </button>
            <button
              onClick={() => setShowDevControls(false)}
              className="text-white/40 hover:text-white text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDevControls(true)}
            className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-md"
            title="Click or press 4, 6, W on keyboard to test animations"
          >
            ⚡ Test Animations (4 / 6 / W)
          </button>
        )}
      </div>
    </main>
  );
}
