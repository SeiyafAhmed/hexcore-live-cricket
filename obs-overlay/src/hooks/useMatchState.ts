import { useEffect, useState, useRef } from 'react';

export interface BatterStat {
  name: string;
  runs: number;
  balls: number;
  '4s'?: number;
  '6s'?: number;
  status?: string;
}

export interface BowlerStat {
  name: string;
  runs: number;
  overs: number;
  wickets: number;
  maidens?: number;
}

export interface WicketCardData {
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  '4s'?: number;
  '6s'?: number;
  strikeRate: number | string;
  methodOfOut: string;
  teamName?: string;
  teamColor?: string;
}

export interface MatchState {
  runs: number;
  wickets: number;
  overs_completed: number;
  balls_this_over: number;
  max_overs?: number;
  target?: number | null;
  innings?: number;
  current_batters?: string[];
  striker?: BatterStat;
  non_striker?: BatterStat;
  bowler?: string | BowlerStat;
  batsmen_stats?: Record<string, BatterStat>;
  bowler_stats?: Record<string, BowlerStat>;
  this_over?: string[];
  theme_color?: string;
  batting_team_name?: string;
  bowling_team_name?: string;
  batting_team_color?: string;
  bowling_team_color?: string;
  batting_team_logo?: string | null;
  bowling_team_logo?: string | null;
  team_1_name?: string;
  team_2_name?: string;
  ball_speed?: string | number | null;
  ball_speed_time?: number | null;
  last_wicket?: WicketCardData | null;
  last_event?: {
    id: string;
    type: 'FOUR' | 'SIX' | 'WICKET';
    title?: string;
    subtitle?: string;
    player?: string;
    scoreInfo?: string;
    dismissal?: string;
    wicket_card?: WicketCardData;
  } | null;
}

export function useMatchState(url?: string) {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let isUnmounted = false;

    // Use native EventSource API to connect to the SSE streaming endpoint
    const endpoint = url || (typeof window !== 'undefined'
      ? `http://${window.location.hostname || '127.0.0.1'}:8000/api/stream/`
      : 'http://127.0.0.1:8000/api/stream/');

    function connect() {
      if (isUnmounted) return;

      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        const es = new EventSource(endpoint);
        eventSourceRef.current = es;

        es.onopen = () => {
          if (isUnmounted) return;
          console.log('[SSE] Connected to match state stream');
          setIsConnected(true);
        };

        es.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            if (!event.data || !event.data.trim()) return;
            const data: MatchState = JSON.parse(event.data);
            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
              setMatchState(data);
              setIsConnected(true);
            }
          } catch (err) {
            console.error('[SSE] Failed to parse stream data:', err);
          }
        };

        es.onerror = () => {
          if (isUnmounted) return;
          console.warn('[SSE] Connection to backend interrupted, browser EventSource will auto-reconnect...');
          setIsConnected(false);
        };
      } catch (err) {
        if (!isUnmounted) {
          console.error('[SSE] Failed to initialize EventSource:', err);
          setIsConnected(false);
        }
      }
    }

    connect();

    return () => {
      isUnmounted = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [url]);

  return { matchState, isConnected };
}
