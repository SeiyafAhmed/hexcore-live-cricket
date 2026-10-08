import json
import threading
import time
import requests
import sqlite3
import os
import uuid
import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(PROJECT_ROOT, "db.sqlite3")

class StateSyncManager(threading.Thread):
    """
    Syncs the live match state from Eel to the Django database and SSE pipeline.
    Replaces WebSocketManager with an HTTP/REST + SQLite persistence client.
    """
    def __init__(self, api_url="http://127.0.0.1:8000/api/match-state/"):
        super().__init__()
        self.api_url = api_url
        self.running = True
        self.queue = []
        self.lock = threading.Lock()
        self.daemon = True

    def run(self):
        while self.running:
            payload = None
            with self.lock:
                if self.queue:
                    # Pop next queued state
                    payload = self.queue.pop(0)

            if payload:
                success = False
                try:
                    resp = requests.post(self.api_url, json=payload, timeout=2.0)
                    if resp.status_code in (200, 201):
                        success = True
                except Exception:
                    # Backend may be starting or temporarily offline
                    pass

                # If Django API POST was unsuccessful, persist directly to SQLite
                if not success:
                    self._save_to_sqlite(payload)
            else:
                time.sleep(0.05)

    def _save_to_sqlite(self, state):
        try:
            if not os.path.exists(DB_PATH):
                return
            conn = sqlite3.connect(DB_PATH)
            try:
                cur = conn.cursor()
                cur.execute("SELECT id FROM scoring_match WHERE status = 'LIVE' ORDER BY updated_at DESC LIMIT 1")
                row = cur.fetchone()
                now = datetime.datetime.now(datetime.timezone.utc).isoformat()
                state_json = json.dumps(state)

                is_over = bool(state.get("match_over"))
                status_val = "COMPLETED" if is_over else "LIVE"
                res_status = state.get("result_status") or ("COMPLETED" if is_over else None)
                winner_id = state.get("winner_id")
                raw_win_id = winner_id.replace("-", "") if winner_id else None
                tourn_id = state.get("tournament_id")
                raw_tourn_id = tourn_id.replace("-", "") if tourn_id else None
                grp_id = state.get("group_id")
                raw_grp_id = grp_id.replace("-", "") if grp_id else None

                if row:
                    match_id = row[0]
                    cur.execute("""
                        UPDATE scoring_match
                        SET current_innings_state = ?, status = ?, result_status = ?, winner_id = ?, tournament_id = COALESCE(?, tournament_id), group_id = COALESCE(?, group_id), updated_at = ?
                        WHERE id = ?
                    """, (state_json, status_val, res_status, raw_win_id, raw_tourn_id, raw_grp_id, now, match_id))
                else:
                    cur.execute("SELECT id FROM scoring_match ORDER BY updated_at DESC LIMIT 1")
                    any_row = cur.fetchone()
                    if any_row:
                        match_id = any_row[0]
                        cur.execute("""
                            UPDATE scoring_match
                            SET current_innings_state = ?, status = ?, result_status = ?, winner_id = ?, tournament_id = COALESCE(?, tournament_id), group_id = COALESCE(?, group_id), updated_at = ?
                            WHERE id = ?
                        """, (state_json, status_val, res_status, raw_win_id, raw_tourn_id, raw_grp_id, now, match_id))
                    else:
                        cur.execute("SELECT id FROM scoring_team LIMIT 2")
                        team_rows = cur.fetchall()
                        bat_tid = team_rows[0][0] if len(team_rows) > 0 else uuid.uuid4().hex
                        bowl_tid = team_rows[1][0] if len(team_rows) > 1 else uuid.uuid4().hex
                        new_id = uuid.uuid4().hex
                        cur.execute("""
                            INSERT INTO scoring_match (id, status, result_status, winner_id, tournament_id, group_id, current_innings_state, created_at, updated_at, batting_team_id, bowling_team_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (new_id, status_val, res_status, raw_win_id, raw_tourn_id, raw_grp_id, state_json, now, now, bat_tid, bowl_tid))
                conn.commit()
            finally:
                conn.close()
        except Exception as ex:
            print(f"[StateSyncManager] SQLite write error: {ex}")

    def send_state(self, state):
        with self.lock:
            # Avoid unbounded queue growth
            if len(self.queue) > 10:
                self.queue = self.queue[-3:]
            self.queue.append(state)

    def stop(self):
        self.running = False

# Singleton instance for the application
state_manager = StateSyncManager()
# Alias for backwards compatibility with any remaining ws_manager references
ws_manager = state_manager
