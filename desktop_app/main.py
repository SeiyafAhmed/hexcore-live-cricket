import eel
import copy
import base64
import time
import os
import json
import sqlite3
import uuid
import api
from state_client import state_manager, ws_manager

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(PROJECT_ROOT, "db.sqlite3")
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "active_match.json")

state = {}
history_stack = []

def save_persisted_state():
    global state, history_stack
    if not state or not state.get("team_1_name"):
        return
    try:
        data = {
            "state": state,
            "history_stack": history_stack[-25:] if history_stack else []
        }
        temp_file = STATE_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(temp_file, STATE_FILE)
    except Exception as e:
        print(f"[save_persisted_state] Error saving state: {e}", flush=True)
    try:
        cur_mid = state.get("match_id")
        if os.path.exists(DB_PATH) and cur_mid:
            conn = sqlite3.connect(DB_PATH)
            try:
                cur = conn.cursor()
                raw_mid = str(cur_mid).replace("-", "")
                cur.execute("UPDATE scoring_match SET current_innings_state = ? WHERE (id = ? OR id = ?)", (json.dumps(state), str(cur_mid), raw_mid))
                conn.commit()
            finally:
                conn.close()
    except Exception as ex:
        pass

def clear_persisted_state():
    global state, history_stack
    cur_mid = state.get("match_id") if isinstance(state, dict) else None
    state = {}
    history_stack = []
    if os.path.exists(STATE_FILE):
        try:
            os.remove(STATE_FILE)
        except Exception as e:
            print(f"[clear_persisted_state] Error removing {STATE_FILE}: {e}", flush=True)
    try:
        if os.path.exists(DB_PATH) and cur_mid:
            conn = sqlite3.connect(DB_PATH)
            try:
                cur = conn.cursor()
                raw_mid = cur_mid.replace("-", "")
                cur.execute("UPDATE scoring_match SET status = 'COMPLETED' WHERE (id = ? OR id = ?) AND status = 'LIVE'", (cur_mid, raw_mid))
                conn.commit()
            finally:
                conn.close()
    except Exception as ex:
        print(f"[clear_persisted_state] SQLite update error: {ex}", flush=True)

def load_persisted_state():
    global state, history_stack
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                loaded_state = data.get("state") if ("state" in data and isinstance(data["state"], dict)) else data
                if isinstance(loaded_state, dict) and loaded_state.get("team_1_name"):
                    state = loaded_state
                    if not state.get("match_id"):
                        state["match_id"] = str(uuid.uuid4())
                    history_stack = data.get("history_stack", []) if "history_stack" in data else []
                    print(f"[load_persisted_state] Restored active match from {STATE_FILE} (overs: {state.get('overs_completed', 0)}.{state.get('balls_this_over', 0)}, match_id: {state.get('match_id')})", flush=True)
                    return True
        except Exception as e:
            print(f"[load_persisted_state] Error loading {STATE_FILE}: {e}", flush=True)

    # Fallback to SQLite DB for LIVE match
    try:
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            try:
                cur = conn.cursor()
                cur.execute("SELECT id, current_innings_state FROM scoring_match WHERE status = 'LIVE' ORDER BY updated_at DESC LIMIT 1")
                row = cur.fetchone()
                if row and row[1]:
                    db_id = row[0]
                    raw_val = row[1]
                    loaded = json.loads(raw_val) if isinstance(raw_val, str) else raw_val
                    if isinstance(loaded, dict) and loaded.get("team_1_name"):
                        state = loaded
                        if not state.get("match_id") and db_id:
                            state["match_id"] = str(db_id)
                        history_stack = []
                        print(f"[load_persisted_state] Restored LIVE match from SQLite (overs: {state.get('overs_completed', 0)}.{state.get('balls_this_over', 0)}, match_id: {state.get('match_id')})", flush=True)
                        save_persisted_state()
                        return True
            finally:
                conn.close()
    except Exception as ex:
        print(f"[load_persisted_state] SQLite fallback error: {ex}", flush=True)

    return False

# Attempt restoring state on startup
load_persisted_state()
if state:
    ws_manager.send_state(state)

def save_state_for_undo():
    global state, history_stack
    history_stack.append(copy.deepcopy(state))
    save_persisted_state()

def swap_batsmen():
    global state
    state["striker"], state["non_striker"] = state["non_striker"], state["striker"]

def check_over_end():
    global state
    if state["balls_this_over"] >= state["balls_per_over"]:
        if state.get("bowler_runs_this_over", 0) == 0:
            state["bowler"]["maidens"] = state["bowler"].get("maidens", 0) + 1
        state["bowler_runs_this_over"] = 0
        
        state["overs_completed"] += 1
        state["balls_this_over"] = 0
        state["past_overs"].append({
            "bowler": state["bowler"]["name"],
            "runs": state["bowler"]["runs"],
            "wickets": state["bowler"]["wickets"],
            "balls": list(state["this_over"])
        })
        state["this_over"] = []
        state["previous_bowler"] = state["bowler"]["name"]
        
        is_innings_over = False
        max_w = state.get("max_wickets", 10)
        if state.get("innings", 1) == 2 and (state["wickets"] >= max_w or (state.get("target") and state["runs"] >= state["target"])):
            is_innings_over = True
        elif state.get("innings", 1) == 1 and state["wickets"] >= max_w:
            is_innings_over = True
            
        if state["overs_completed"] >= state["max_overs"] or is_innings_over:
            sync_active_stats()
            ws_manager.send_state(state)
            if state.get("innings", 1) == 1:
                end_first_innings()
            else:
                end_match()
            return
            
        eel.showNewOverPrompt(state["previous_bowler"])
        swap_batsmen()
        sync_active_stats()
        ws_manager.send_state(state)

def end_first_innings():
    global state
    sync_active_stats()
    target = state["runs"] + 1
    
    state["innings_1_stats"] = {
        "runs": state["runs"],
        "wickets": state["wickets"],
        "overs_completed": state["overs_completed"],
        "balls_this_over": state["balls_this_over"],
        "batsmen_stats": copy.deepcopy(state.get("batsmen_stats", {})),
        "bowler_stats": copy.deepcopy(state.get("bowler_stats", {})),
        "extras": copy.deepcopy(state.get("extras", {})),
        "batting_team_id": state.get("batting_team_id"),
        "bowling_team_id": state.get("bowling_team_id")
    }
    
    # Reset stats for innings 2
    pen_runs = state.get("bowling_team_penalty", 0)
    state["runs"] = pen_runs
    state["wickets"] = 0
    state["overs_completed"] = 0
    state["balls_this_over"] = 0
    state["this_over"] = []
    state["past_overs"] = []
    state["batsmen_stats"] = {}
    state["bowler_stats"] = {}
    state["out_batsmen"] = []
    state["extras"] = {"wd": 0, "nb": 0, "b": 0, "lb": 0}
    if pen_runs > 0:
        state["extras"]["pen"] = pen_runs
    state["bowler_runs_this_over"] = 0
    state["previous_bowler"] = None
    
    state["striker"] = None
    state["non_striker"] = None
    state["bowler"] = None
    state["ball_speed"] = None
    state["last_event"] = None
    
    state["innings"] = 2
    state["target"] = target
    
    # Swap batting and bowling team IDs for the second innings

    
    bid1 = state.get("batting_team_id")
    bid2 = state.get("bowling_team_id")
    state["batting_team_id"] = bid2
    state["bowling_team_id"] = bid1
    
    sync_active_stats()
    save_persisted_state()
    ws_manager.send_state(state)
    eel.showInnings2SetupPrompt(target)

@eel.expose
def start_innings_2(striker, non_striker, bowler):
    global state
    state["striker"] = {"name": striker, "runs": 0, "balls": 0, "4s": 0, "6s": 0, "status": "not out"}
    state["non_striker"] = {"name": non_striker, "runs": 0, "balls": 0, "4s": 0, "6s": 0, "status": "not out"}
    state["bowler"] = {"name": bowler, "runs": 0, "overs": 0.0, "wickets": 0, "maidens": 0}
    
    state.setdefault("batsmen_stats", {})[striker] = state["striker"].copy()
    state["batsmen_stats"][non_striker] = state["non_striker"].copy()
    state.setdefault("bowler_stats", {})[bowler] = state["bowler"].copy()
    
    bat_id = state.get("batting_team_id")
    bowl_id = state.get("bowling_team_id")
    try:
        teams = api.get_teams()
        for t in teams:
            tid = str(t.get("id")).replace("-", "")
            if tid == str(bat_id).replace("-", ""):
                state["batting_team_name"] = t.get("name")
                state["batting_team_color"] = t.get("theme_color") or "#ff007f"
                state["theme_color"] = state["batting_team_color"]
                state["batting_team_logo"] = t.get("logo")
            elif tid == str(bowl_id).replace("-", ""):
                state["bowling_team_name"] = t.get("name")
                state["bowling_team_color"] = t.get("theme_color") or "#dc2626"
                state["bowling_team_logo"] = t.get("logo")
    except Exception as e:
        print("[start_innings_2] Team lookup error:", e)

    sync_active_stats()
    ws_manager.send_state(state)

def end_match():
    global state
    state["match_over"] = True

    # Compute match outcome and winner
    r1 = 0
    w1_id = None
    if "innings_1_stats" in state and isinstance(state["innings_1_stats"], dict):
        r1 = int(state["innings_1_stats"].get("runs", 0))
        w1_id = state["innings_1_stats"].get("batting_team_id")
    r2 = int(state.get("runs", 0))
    w2_id = state.get("batting_team_id")

    if r1 > r2:
        state["winner_id"] = w1_id
        state["result_status"] = "COMPLETED"
    elif r2 > r1:
        state["winner_id"] = w2_id
        state["result_status"] = "COMPLETED"
    else:
        state["winner_id"] = None
        state["result_status"] = "TIED"

    sync_active_stats()
    save_persisted_state()
    ws_manager.send_state(state)
    eel.showMatchOverPrompt()

def _decode_base64_file(data_uri):
    if not data_uri or not isinstance(data_uri, str):
        return None
    try:
        if ";base64," in data_uri:
            _, encoded = data_uri.split(";base64,", 1)
        else:
            encoded = data_uri
        return base64.b64decode(encoded)
    except Exception as e:
        print(f"Error decoding base64: {e}")
        return None

@eel.expose
def get_teams():
    return api.get_teams()

@eel.expose
def create_team(name, theme_color, logo_base64=None, logo_filename=None):
    logo_bytes = _decode_base64_file(logo_base64)
    return api.create_team(name, theme_color, logo_bytes=logo_bytes, logo_filename=logo_filename)

@eel.expose
def update_team(team_id, name, theme_color, logo_base64=None, logo_filename=None):
    logo_bytes = _decode_base64_file(logo_base64)
    return api.update_team(team_id, name, theme_color, logo_bytes=logo_bytes, logo_filename=logo_filename)

@eel.expose
def delete_team(team_id):
    return api.delete_team(team_id)

@eel.expose
def get_players(team_id=None):
    if team_id in ("", "all", "null", "None"):
        team_id = None
    return api.get_players(team_id)

@eel.expose
def create_player(first_name, last_name, jersey_number, role, team_id, image_base64=None, image_filename=None):
    image_bytes = _decode_base64_file(image_base64)
    return api.create_player(first_name, last_name, jersey_number, role, team_id, image_bytes=image_bytes, image_filename=image_filename)

@eel.expose
def update_player(player_id, first_name, last_name, jersey_number, role, team_id, image_base64=None, image_filename=None):
    image_bytes = _decode_base64_file(image_base64)
    return api.update_player(player_id, first_name, last_name, jersey_number, role, team_id, image_bytes=image_bytes, image_filename=image_filename)

@eel.expose
def delete_player(player_id):
    return api.delete_player(player_id)

@eel.expose
def assign_player_to_team(player_id, team_id):
    return api.assign_player_to_team(player_id, team_id)

@eel.expose
def get_tournaments():
    return api.get_tournaments()

@eel.expose
def create_tournament(name, season="", max_overs=20):
    return api.create_tournament(name, season, max_overs)

@eel.expose
def update_tournament(tournament_id, name, season="", max_overs=20):
    return api.update_tournament(tournament_id, name, season, max_overs)

@eel.expose
def delete_tournament(tournament_id):
    return api.delete_tournament(tournament_id)

@eel.expose
def get_groups(tournament_id=None):
    if tournament_id in ("", "all", "null", "None"):
        tournament_id = None
    return api.get_groups(tournament_id)

@eel.expose
def create_group(tournament_id, name, team_ids=None):
    return api.create_group(tournament_id, name, team_ids)

@eel.expose
def update_group(group_id, name):
    return api.update_group(group_id, name)

@eel.expose
def delete_group(group_id):
    return api.delete_group(group_id)

@eel.expose
def assign_teams_to_group(group_id, team_ids):
    return api.assign_teams_to_group(group_id, team_ids)

@eel.expose
def get_group_standings(group_id):
    return api.get_group_standings(group_id)

@eel.expose
def get_tournament_leaderboards(tournament_id, group_id=None):
    if group_id in ("", "all", "null", "None"):
        group_id = None
    return api.get_tournament_leaderboards(tournament_id, group_id)

@eel.expose
def console_log(msg):
    print("JS LOG:", msg, flush=True)

@eel.expose
def start_match(batId, batName, bowlId, bowlName, striker, nonstriker, bowler, overs, tournament_id=None, group_id=None, match_id=None):
    global state, history_stack
    history_stack = []
    
    assigned_mid = match_id if (match_id and str(match_id).strip() not in ("", "null", "None")) else str(uuid.uuid4())

    state = {
        "match_id": assigned_mid,
        "innings": 1,
        "target": None,
        "max_overs": int(overs),
        "max_wickets": 10,
        "balls_per_over": 6,
        "tournament_id": tournament_id if tournament_id and tournament_id not in ("", "null", "None") else None,
        "group_id": group_id if group_id and group_id not in ("", "null", "None") else None,
        "team_1_name": batName,
        "team_2_name": bowlName,
        "batting_team_id": batId,
        "bowling_team_id": bowlId,
        "striker": {"name": striker, "runs": 0, "balls": 0, "4s": 0, "6s": 0, "status": "not out"},
        "non_striker": {"name": nonstriker, "runs": 0, "balls": 0, "4s": 0, "6s": 0, "status": "not out"},
        "bowler": {"name": bowler, "runs": 0, "overs": 0.0, "wickets": 0, "maidens": 0},
        "runs": 0, "wickets": 0, "overs_completed": 0, "balls_this_over": 0,
        "this_over": [], "past_overs": [], "previous_bowler": None,
        "out_batsmen": [],
        "batsmen_stats": {},
        "bowler_stats": {},
        "extras": {"wd": 0, "nb": 0, "b": 0, "lb": 0},
        "bowling_team_id": bowlId,
        "ball_speed": None,
        "last_event": None
    }
    
    state["batsmen_stats"][striker] = state["striker"].copy()
    state["batsmen_stats"][nonstriker] = state["non_striker"].copy()
    state["bowler_stats"][bowler] = state["bowler"].copy()
    
    state["batting_team_name"] = batName
    state["bowling_team_name"] = bowlName
    state["batting_team_color"] = "#ff007f"
    state["bowling_team_color"] = "#dc2626"
    state["batting_team_logo"] = None
    state["bowling_team_logo"] = None

    try:
        teams = api.get_teams()
        for t in teams:
            tid = str(t.get("id")).replace("-", "")
            raw_bat = str(batId).replace("-", "")
            raw_bowl = str(bowlId).replace("-", "")
            if tid == raw_bat or str(t.get("name")) == str(batName):
                state["batting_team_color"] = t.get("theme_color") or "#ff007f"
                state["theme_color"] = state["batting_team_color"]
                state["batting_team_logo"] = t.get("logo")
            elif tid == raw_bowl or str(t.get("name")) == str(bowlName):
                state["bowling_team_color"] = t.get("theme_color") or "#dc2626"
                state["bowling_team_logo"] = t.get("logo")
    except Exception as e:
        print("[start_match] Team lookup error:", e)

    sync_active_stats()
    ws_manager.send_state(state)

def sync_active_stats():
    global state
    if "batsmen_stats" in state and state.get("striker") and state.get("non_striker") and state.get("bowler"):
        state["batsmen_stats"][state["striker"]["name"]] = state["striker"].copy()
        state["batsmen_stats"][state["non_striker"]["name"]] = state["non_striker"].copy()
        state["bowler_stats"][state["bowler"]["name"]] = state["bowler"].copy()
    if state.get("striker") and state.get("non_striker"):
        state["current_batters"] = [state["striker"]["name"], state["non_striker"]["name"]]
    save_persisted_state()

@eel.expose
def get_state():
    global state
    if not state or not state.get("team_1_name"):
        load_persisted_state()
    sync_active_stats()
    return copy.deepcopy(state)

@eel.expose
def reset_match():
    clear_persisted_state()
    ws_manager.send_state({})
    return True

@eel.expose
def undo():
    global state, history_stack
    if not history_stack:
        return
    state = history_stack.pop()
    state["last_event"] = None
    sync_active_stats()
    save_persisted_state()
    ws_manager.send_state(state)

@eel.expose
def set_new_bowler(name):
    global state
    sync_active_stats()
    if name in state["bowler_stats"]:
        state["bowler"] = state["bowler_stats"][name].copy()
    else:
        state["bowler"] = {"name": name, "runs": 0, "overs": 0.0, "wickets": 0, "maidens": 0}
    
    sync_active_stats()
    ws_manager.send_state(state)

@eel.expose
def set_ball_speed(speed):
    global state
    if not state:
        return None
    if speed is None or str(speed).strip() == "" or str(speed).strip().lower() in ("null", "none"):
        state["ball_speed"] = None
        state["ball_speed_time"] = None
    else:
        state["ball_speed"] = str(speed).strip()
        state["ball_speed_time"] = time.time()
    sync_active_stats()
    ws_manager.send_state(state)
    return state.get("ball_speed")

@eel.expose
def process_delivery(label, team_runs, bat_runs, bowl_runs, valid_ball, physical_runs, is_wide):
    global state
    if state.get("match_over"):
        return
    save_state_for_undo()
    
    state["runs"] += team_runs
    state["bowler"]["runs"] += bowl_runs
    state.setdefault("bowler_runs_this_over", 0)
    state["bowler_runs_this_over"] += bowl_runs
    state["striker"]["runs"] += bat_runs
    
    if bat_runs == 4: state["striker"]["4s"] = state["striker"].get("4s", 0) + 1
    if bat_runs == 6: state["striker"]["6s"] = state["striker"].get("6s", 0) + 1
    
    if not is_wide:
        state["striker"]["balls"] += 1
        
    # Boundary animation should only play when player hit (bat_runs is 4 or 6), never for byes/leg byes/wides
    if bat_runs == 4:
        state["last_event"] = {
            "id": f"four-{int(time.time() * 1000)}",
            "type": "FOUR",
            "title": "BOUNDARY FOUR!",
            "subtitle": "CRACKING SHOT TO THE FENCE",
            "player": state["striker"]["name"],
            "scoreInfo": f"{state['striker']['runs']} ({state['striker']['balls']})",
        }
    elif bat_runs == 6:
        state["last_event"] = {
            "id": f"six-{int(time.time() * 1000)}",
            "type": "SIX",
            "title": "MAXIMUM SIX!",
            "subtitle": "CLEAN HIT INTO THE STANDS",
            "player": state["striker"]["name"],
            "scoreInfo": f"{state['striker']['runs']} ({state['striker']['balls']})",
        }
    else:
        state["last_event"] = None
        
    for k in ["wd", "nb", "b", "lb"]:
        state.setdefault("extras", {}).setdefault(k, 0)
        
    if is_wide: 
        state["extras"]["wd"] += 1
        if physical_runs > 0:
            state["extras"]["b"] += physical_runs
    elif "Nb" in label: 
        state["extras"]["nb"] += 1
        if "LB" in label:
            state["extras"]["lb"] += physical_runs
        elif "B" in label:
            state["extras"]["b"] += physical_runs
    else:
        if "LB" in label:
            state["extras"]["lb"] += physical_runs
        elif "B" in label:
            state["extras"]["b"] += physical_runs
            
    state["this_over"].append(label)
    
    if valid_ball:
        state["balls_this_over"] += 1
        b_over_balls = int(round(state["bowler"]["overs"] * 10)) % 10 + 1
        b_over_full = int(state["bowler"]["overs"])
        if b_over_balls == state.get("balls_per_over", 6):
            state["bowler"]["overs"] = float(b_over_full + 1)
        else:
            state["bowler"]["overs"] = float(f"{b_over_full}.{b_over_balls}")
            
    if physical_runs % 2 != 0:
        swap_batsmen()
        
    sync_active_stats()
    ws_manager.send_state(state)
    check_over_end()
    
    if state.get("match_over"):
        return
    max_w = state.get("max_wickets", 10)
    if state.get("innings") == 2:
        if state["wickets"] >= max_w or (state.get("target") and state["runs"] >= state["target"]):
            end_match()
    elif state.get("innings") == 1 and state["wickets"] >= max_w:
        end_first_innings()

@eel.expose
def score_wicket(method, new_bat_name, physical_runs=0, illegal_delivery="None", byes_type="None", out_batsman_type="Striker", fielder_name=""):
    global state
    if state.get("match_over"):
        return
    save_state_for_undo()
    
    is_wide = (illegal_delivery == "Wide")
    is_nb = (illegal_delivery == "No Ball")
    
    team_runs = physical_runs
    bat_runs = 0
    bowl_runs = 0
    
    if byes_type == "None":
        bat_runs += physical_runs
        bowl_runs += physical_runs
    elif byes_type == "Byes":
        state["extras"]["b"] += physical_runs
    elif byes_type == "Leg Byes":
        state["extras"]["lb"] += physical_runs
        
    if is_wide:
        # Wides negate byes_type bat_runs logic, physical runs on a wide are byes
        bat_runs = 0
        bowl_runs = 0  # Physical runs are byes, not charged to bowler
        state["extras"]["wd"] += 1
        if physical_runs > 0:
            state["extras"]["b"] += physical_runs
            
    elif is_nb:
        state["extras"]["nb"] += 1
        if byes_type == "None":
            # Runs off the bat on a no ball
            pass
        else:
            # Runs are byes/leg byes, don't count against bowler
            pass
            
    if is_wide or is_nb:
        team_runs += 1
        bowl_runs += 1
        
    valid_ball = not (is_wide or is_nb)
    
    state["runs"] += team_runs
    state["wickets"] += 1
    
    state["bowler"]["runs"] += bowl_runs
    state.setdefault("bowler_runs_this_over", 0)
    state["bowler_runs_this_over"] += bowl_runs
    
    state["striker"]["runs"] += bat_runs
    if valid_ball:
        state["striker"]["balls"] += 1
    
    if method != "Run Out":
        state["bowler"]["wickets"] += 1
        
    if method == "Run Out":
        if is_wide:
            if physical_runs > 0:
                label = f"Wd + {physical_runs}B + W"
            else:
                label = "Wd + W"
        elif is_nb:
            if byes_type == "Byes":
                label = f"Nb + {physical_runs}B + W" if physical_runs > 0 else "Nb + W"
            elif byes_type == "Leg Byes":
                label = f"Nb + {physical_runs}LB + W" if physical_runs > 0 else "Nb + W"
            else:
                label = f"Nb + {physical_runs} + W" if physical_runs > 0 else "Nb + W"
        else:
            if byes_type == "Byes":
                label = f"{physical_runs}B + W"
            elif byes_type == "Leg Byes":
                label = f"{physical_runs}LB + W"
            else:
                label = f"{physical_runs} + W" if physical_runs > 0 else "W"
    else:
        label = "W"
        
    state["this_over"].append(label)
    
    bowler_name = state["bowler"]["name"]
    if method == "Caught":
        if fielder_name == bowler_name:
            status = f"c&b {bowler_name}"
        else:
            status = f"c {fielder_name} b {bowler_name}"
    elif method == "Run Out":
        status = f"run out ({fielder_name})"
    elif method == "Stumped":
        status = f"st {fielder_name} b {bowler_name}"
    elif method == "LBW":
        status = f"lbw b {bowler_name}"
    elif method in ["Bowled", "Hit Wicket"]:
        status = f"b {bowler_name}"
    else:
        status = f"out ({method})"
        
    if out_batsman_type == "Non-Striker":
        out_batsman = state["non_striker"]["name"]
        out_stats = copy.deepcopy(state["non_striker"])
        out_stats["status"] = status
        state.setdefault("out_batsmen", []).append(out_batsman)
        state["non_striker"]["status"] = status
        state.setdefault("batsmen_stats", {})[out_batsman] = out_stats.copy()
        
        state["non_striker"] = {"name": new_bat_name, "runs": 0, "balls": 0, "4s": 0, "6s": 0, "status": "not out"}
        state["batsmen_stats"][new_bat_name] = state["non_striker"].copy()
    else:
        out_batsman = state["striker"]["name"]
        out_stats = copy.deepcopy(state["striker"])
        out_stats["status"] = status
        state.setdefault("out_batsmen", []).append(out_batsman)
        state["striker"]["status"] = status
        state.setdefault("batsmen_stats", {})[out_batsman] = out_stats.copy()
        
        state["striker"] = {"name": new_bat_name, "runs": 0, "balls": 0, "4s": 0, "6s": 0, "status": "not out"}
        state["batsmen_stats"][new_bat_name] = state["striker"].copy()
    
    p_runs = int(out_stats.get("runs", 0))
    p_balls = int(out_stats.get("balls", 0))
    p_fours = int(out_stats.get("4s", 0))
    p_sixes = int(out_stats.get("6s", 0))
    p_sr = round((p_runs / p_balls) * 100, 1) if p_balls > 0 else 0.0

    card_info = {
        "playerName": out_batsman,
        "runs": p_runs,
        "balls": p_balls,
        "fours": p_fours,
        "sixes": p_sixes,
        "strikeRate": p_sr,
        "methodOfOut": status,
        "teamName": state.get("batting_team_name"),
        "teamColor": state.get("batting_team_color") or state.get("theme_color"),
    }

    state["last_wicket"] = card_info
    state["last_event"] = {
        "id": f"wkt-{int(time.time() * 1000)}",
        "type": "WICKET",
        "title": "WICKET FALLEN",
        "subtitle": f"b {bowler_name}" if bowler_name and method != "Run Out" else (status or "OUT!"),
        "player": out_batsman,
        "scoreInfo": f"{state['runs']} / {state['wickets']}",
        "dismissal": status,
        "wicket_card": card_info,
    }
    
    if valid_ball:
        state["balls_this_over"] += 1
        b_over_balls = int(round(state["bowler"]["overs"] * 10)) % 10 + 1
        b_over_full = int(state["bowler"]["overs"])
        if b_over_balls == state.get("balls_per_over", 6):
            state["bowler"]["overs"] = float(b_over_full + 1)
        else:
            state["bowler"]["overs"] = float(f"{b_over_full}.{b_over_balls}")
        
    sync_active_stats()
    ws_manager.send_state(state)
    check_over_end()
    
    if state.get("match_over"):
        return
    max_w = state.get("max_wickets", 10)
    if state.get("innings") == 2:
        if state["wickets"] >= max_w or (state.get("target") and state["runs"] >= state["target"]):
            end_match()
    elif state.get("innings") == 1 and state["wickets"] >= max_w:
        end_first_innings()

@eel.expose
def abandon_match():
    global state
    if not state:
        return
    save_state_for_undo()
    state["match_over"] = True
    state["status"] = "ABANDONED"
    state["abandoned"] = True
    state["match_result"] = "Match Abandoned"
    sync_active_stats()
    ws_manager.send_state(state)
    eel.showMatchOverPrompt()

@eel.expose
def end_current_innings():
    global state
    if not state or state.get("match_over"):
        return
    save_state_for_undo()
    sync_active_stats()
    if state.get("innings", 1) == 1:
        end_first_innings()
    else:
        end_match()
    ws_manager.send_state(state)

@eel.expose
def award_penalty_runs(team_name):
    global state
    if not state or state.get("match_over"):
        return
    save_state_for_undo()
    
    batting_team = state.get("team_1_name") if state.get("innings", 1) == 1 else state.get("team_2_name")
    is_batting = (team_name == batting_team)
    
    state.setdefault("extras", {}).setdefault("pen", 0)
    state["last_event"] = None
    
    if is_batting:
        state["runs"] += 5
        state["extras"]["pen"] += 5
        state["this_over"].append("5 Pen")
        
        if state.get("innings") == 2 and state.get("target") and state["runs"] >= state["target"]:
            sync_active_stats()
            ws_manager.send_state(state)
            end_match()
            return
    else:
        state["this_over"].append(f"5 Pen ({team_name})")
        if state.get("innings", 1) == 1:
            state["bowling_team_penalty"] = state.get("bowling_team_penalty", 0) + 5
        else:
            if "innings_1_stats" in state:
                state["innings_1_stats"]["runs"] += 5
                state["innings_1_stats"].setdefault("extras", {}).setdefault("pen", 0)
                state["innings_1_stats"]["extras"]["pen"] += 5
            if state.get("target"):
                state["target"] += 5
                
    sync_active_stats()
    ws_manager.send_state(state)

@eel.expose
def retire_hurt(player_type, new_bat_name):
    global state
    if not state or state.get("match_over"):
        return
    save_state_for_undo()
    sync_active_stats()
    
    clean_name = new_bat_name.strip()
    if not clean_name:
        return
        
    new_bat = {
        "name": clean_name,
        "runs": 0,
        "balls": 0,
        "4s": 0,
        "6s": 0,
        "status": "not out"
    }
    
    if player_type == "Non-Striker":
        old_name = state["non_striker"]["name"]
        if old_name not in state.setdefault("out_batsmen", []):
            state["out_batsmen"].append(old_name)
        state["non_striker"]["status"] = "retired hurt"
        state.setdefault("batsmen_stats", {})[old_name] = state["non_striker"].copy()
        
        if clean_name in state.get("batsmen_stats", {}):
            new_bat = state["batsmen_stats"][clean_name]
            new_bat["status"] = "not out"
        state["non_striker"] = new_bat
        state["batsmen_stats"][clean_name] = new_bat.copy()
        if clean_name in state.get("out_batsmen", []):
            state["out_batsmen"].remove(clean_name)
    else:
        old_name = state["striker"]["name"]
        if old_name not in state.setdefault("out_batsmen", []):
            state["out_batsmen"].append(old_name)
        state["striker"]["status"] = "retired hurt"
        state.setdefault("batsmen_stats", {})[old_name] = state["striker"].copy()
        
        if clean_name in state.get("batsmen_stats", {}):
            new_bat = state["batsmen_stats"][clean_name]
            new_bat["status"] = "not out"
        state["striker"] = new_bat
        state["batsmen_stats"][clean_name] = new_bat.copy()
        if clean_name in state.get("out_batsmen", []):
            state["out_batsmen"].remove(clean_name)
        
    sync_active_stats()
    ws_manager.send_state(state)

@eel.expose
def swap_striker():
    global state
    if not state or state.get("match_over"):
        return False
    if not state.get("striker") or not state.get("non_striker"):
        return False
    save_state_for_undo()
    swap_batsmen()
    sync_active_stats()
    ws_manager.send_state(state)
    return True

@eel.expose
def set_target(new_target):
    global state
    if not state or state.get("match_over") or state.get("innings", 1) == 1:
        return
    save_state_for_undo()
    state["target"] = int(new_target)
    sync_active_stats()
    ws_manager.send_state(state)
    if state.get("innings") == 2 and state["runs"] >= state["target"]:
        end_match()

@eel.expose
def update_match_format(overs, wickets):
    global state
    if not state or state.get("innings", 1) == 2 or state.get("match_over"):
        return
    current_played_overs = state.get("overs_completed", 0) + (1 if state.get("balls_this_over", 0) > 0 else 0)
    min_overs = max(1, current_played_overs)
    if int(overs) < min_overs:
        print(f"Cannot update format: max overs {overs} is less than current played overs {min_overs}")
        return
    current_wickets = state.get("wickets", 0)
    min_wickets = max(1, current_wickets)
    if int(wickets) < min_wickets or int(wickets) > 10:
        print(f"Cannot update format: wickets {wickets} is invalid or less than current wickets {min_wickets}")
        return
    save_state_for_undo()
    state["max_overs"] = int(overs)
    state["max_wickets"] = int(wickets)
    sync_active_stats()
    ws_manager.send_state(state)
    if state["overs_completed"] >= state["max_overs"] or state["wickets"] >= state["max_wickets"]:
        end_first_innings()

@eel.expose
def get_active_matches():
    results = []
    if not os.path.exists(SQLITE_DB_PATH):
        return results
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT sm.id, sm.current_innings_state, t1.name, t2.name, sm.status, sm.updated_at
                FROM scoring_match sm
                LEFT JOIN scoring_team t1 ON sm.team_1_id = t1.id
                LEFT JOIN scoring_team t2 ON sm.team_2_id = t2.id
                WHERE sm.status = 'LIVE'
                ORDER BY sm.updated_at DESC
            """)
            rows = cur.fetchall()
            for row in rows:
                mid = str(row[0])
                raw_state = row[1]
                t1_name = row[2] or "Team 1"
                t2_name = row[3] or "Team 2"
                parsed_state = None
                if raw_state:
                    try:
                        parsed_state = json.loads(raw_state) if isinstance(raw_state, str) else raw_state
                    except Exception:
                        pass
                if isinstance(parsed_state, dict):
                    t1_name = parsed_state.get("team_1_name") or t1_name
                    t2_name = parsed_state.get("team_2_name") or t2_name
                    runs = parsed_state.get("runs", 0)
                    wkts = parsed_state.get("wickets", 0)
                    overs = f"{parsed_state.get('overs_completed', 0)}.{parsed_state.get('balls_this_over', 0)}"
                    inn = parsed_state.get("innings", 1)
                else:
                    runs, wkts, overs, inn = 0, 0, "0.0", 1
                
                results.append({
                    "id": mid,
                    "team_1_name": t1_name,
                    "team_2_name": t2_name,
                    "score": f"{runs}/{wkts}",
                    "overs": overs,
                    "innings": inn,
                    "is_current": bool(state and (str(state.get("match_id", "")).replace("-", "") == mid.replace("-", "")))
                })
        finally:
            conn.close()
    except Exception as ex:
        print(f"[get_active_matches] Error: {ex}", flush=True)
    return results

@eel.expose
def switch_match(match_id):
    global state, history_stack
    if not match_id:
        return False
    clean_mid = str(match_id).replace("-", "")
    if not os.path.exists(SQLITE_DB_PATH):
        return False
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, current_innings_state FROM scoring_match WHERE id = ? OR id = ?", (str(match_id), clean_mid))
            row = cur.fetchone()
            if row and row[1]:
                raw_val = row[1]
                loaded = json.loads(raw_val) if isinstance(raw_val, str) else raw_val
                if isinstance(loaded, dict):
                    state = loaded
                    state["match_id"] = str(row[0])
                    history_stack = []
                    save_persisted_state()
                    ws_manager.send_state(state)
                    print(f"[switch_match] Switched to match {state['match_id']}", flush=True)
                    return True
        finally:
            conn.close()
    except Exception as ex:
        print(f"[switch_match] Error: {ex}", flush=True)
    return False

if __name__ == "__main__":
    import os
    import bottle
    
    # Register static media route so Eel web client can load player/team media directly
    @bottle.route('/media/<filepath:path>')
    def serve_app_media(filepath):
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        media_dir = os.path.join(project_root, 'media')
        return bottle.static_file(filepath, root=media_dir)

    ws_manager.start()
    try:
        web_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web')
        eel.init(web_dir)
        port = int(os.environ.get("EEL_PORT", 49827))
        try:
            eel.start('index.html', size=(1200, 800), port=port)
        except Exception:
            eel.start('index.html', size=(1200, 800), port=0)
    finally:
        ws_manager.stop()
        ws_manager.join()
