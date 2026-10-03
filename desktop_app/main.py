import eel
import copy
import base64
import api
from ws_client import ws_manager

state = {}
history_stack = []

def save_state_for_undo():
    global state, history_stack
    history_stack.append(copy.deepcopy(state))

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
        if state.get("innings", 1) == 2 and (state["wickets"] >= 10 or (state.get("target") and state["runs"] >= state["target"])):
            is_innings_over = True
        elif state.get("innings", 1) == 1 and state["wickets"] >= 10:
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
    state["runs"] = 0
    state["wickets"] = 0
    state["overs_completed"] = 0
    state["balls_this_over"] = 0
    state["this_over"] = []
    state["past_overs"] = []
    state["batsmen_stats"] = {}
    state["bowler_stats"] = {}
    state["out_batsmen"] = []
    state["extras"] = {"wd": 0, "nb": 0, "b": 0, "lb": 0}
    state["bowler_runs_this_over"] = 0
    state["previous_bowler"] = None
    
    state["striker"] = None
    state["non_striker"] = None
    state["bowler"] = None
    
    state["innings"] = 2
    state["target"] = target
    
    # Swap batting and bowling team IDs for the second innings

    
    bid1 = state.get("batting_team_id")
    bid2 = state.get("bowling_team_id")
    state["batting_team_id"] = bid2
    state["bowling_team_id"] = bid1
    
    eel.showInnings2SetupPrompt(target)

@eel.expose
def start_innings_2(striker, non_striker, bowler):
    global state
    state["striker"] = {"name": striker, "runs": 0, "balls": 0, "4s": 0, "6s": 0, "status": "not out"}
    state["non_striker"] = {"name": non_striker, "runs": 0, "balls": 0, "4s": 0, "6s": 0, "status": "not out"}
    state["bowler"] = {"name": bowler, "runs": 0, "overs": 0.0, "wickets": 0, "maidens": 0}
    
    state["batsmen_stats"][striker] = state["striker"].copy()
    state["batsmen_stats"][non_striker] = state["non_striker"].copy()
    state["bowler_stats"][bowler] = state["bowler"].copy()
    
    ws_manager.send_state(state)

def end_match():
    state["match_over"] = True
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
def console_log(msg):
    print("JS LOG:", msg, flush=True)

@eel.expose
def start_match(batId, batName, bowlId, bowlName, striker, nonstriker, bowler, overs):
    global state, history_stack
    history_stack = []
    
    state = {
        "innings": 1,
        "target": None,
        "max_overs": int(overs),
        "balls_per_over": 6,
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
        "bowling_team_id": bowlId
    }
    
    state["batsmen_stats"][striker] = state["striker"].copy()
    state["batsmen_stats"][nonstriker] = state["non_striker"].copy()
    state["bowler_stats"][bowler] = state["bowler"].copy()
    
    ws_manager.send_state(state)

def sync_active_stats():
    global state
    if "batsmen_stats" in state and state.get("striker") and state.get("non_striker") and state.get("bowler"):
        state["batsmen_stats"][state["striker"]["name"]] = state["striker"].copy()
        state["batsmen_stats"][state["non_striker"]["name"]] = state["non_striker"].copy()
        state["bowler_stats"][state["bowler"]["name"]] = state["bowler"].copy()

@eel.expose
def get_state():
    global state
    sync_active_stats()
    return copy.deepcopy(state)

@eel.expose
def undo():
    global state, history_stack
    if not history_stack:
        return
    state = history_stack.pop()
    sync_active_stats()
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
    if state.get("innings") == 2:
        if state["wickets"] >= 10 or (state.get("target") and state["runs"] >= state["target"]):
            end_match()
    elif state.get("innings") == 1 and state["wickets"] >= 10:
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
        state.setdefault("out_batsmen", []).append(out_batsman)
        state["non_striker"]["status"] = status
        state.setdefault("batsmen_stats", {})[out_batsman] = state["non_striker"].copy()
        
        state["non_striker"] = {"name": new_bat_name, "runs": 0, "balls": 0, "4s": 0, "6s": 0, "status": "not out"}
        state["batsmen_stats"][new_bat_name] = state["non_striker"].copy()
    else:
        out_batsman = state["striker"]["name"]
        state.setdefault("out_batsmen", []).append(out_batsman)
        state["striker"]["status"] = status
        state.setdefault("batsmen_stats", {})[out_batsman] = state["striker"].copy()
        
        state["striker"] = {"name": new_bat_name, "runs": 0, "balls": 0, "4s": 0, "6s": 0, "status": "not out"}
        state["batsmen_stats"][new_bat_name] = state["striker"].copy()
    
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
    if state.get("innings") == 2:
        if state["wickets"] >= 10 or (state.get("target") and state["runs"] >= state["target"]):
            end_match()
    elif state.get("innings") == 1 and state["wickets"] >= 10:
        end_first_innings()

if __name__ == "__main__":
    import os
    
    ws_manager.start()
    try:
        web_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web')
        eel.init(web_dir)
        eel.start('index.html', size=(1200, 800), port=0)
    finally:
        ws_manager.stop()
        ws_manager.join()
