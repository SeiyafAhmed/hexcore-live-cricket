import { useEffect, useState, useRef } from 'react';

export interface MatchState {
  runs: number;
  wickets: number;
  overs_completed: number;
  balls_this_over: number;
  current_batters: string[];
  bowler: string;
  this_over: string[];
  theme_color: string;
}

export function useMatchState(url: string) {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    function connect() {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WS Connected');
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const data: MatchState = JSON.parse(event.data);
          setMatchState(data);
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.current.onclose = () => {
        console.log('WS Disconnected, retrying...');
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };
      
      ws.current.onerror = (err) => {
        console.error('WS Error', err);
        ws.current?.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws.current) {
        ws.current.onclose = null; // prevent reconnect on intentional unmount
        ws.current.close();
      }
    };
  }, [url]);

  return { matchState, isConnected };
}
