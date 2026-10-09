"""
Services and business logic for scoring, tournament management, and points calculations.
"""

import math
from typing import Any, Dict, List, Optional
import uuid

from django.db.models import Q
from .models import Ball, BattingInnings, BowlingInnings, Group, Match, Player, Team, Tournament


def overs_to_decimal(overs_val: Any) -> float:
    """
    Converts over-ball cricket notation (e.g. 18.4, '18.4', (18, 4), or 20)
    to exact decimal overs: completed_overs + balls / 6.0.
    
    Examples:
        overs_to_decimal(20) -> 20.0
        overs_to_decimal("18.4") -> 18.666666666666668
        overs_to_decimal(18.4) -> 18.666666666666668
        overs_to_decimal((19, 5)) -> 19.833333333333332
    """
    if overs_val is None:
        return 0.0

    if isinstance(overs_val, (tuple, list)) and len(overs_val) == 2:
        completed = int(overs_val[0])
        balls = int(overs_val[1])
        return completed + (balls / 6.0)

    s = str(overs_val).strip()
    if not s:
        return 0.0

    if "." in s:
        parts = s.split(".")
        try:
            completed = int(parts[0])
            balls_str = parts[1]
            balls = int(balls_str[0]) if len(balls_str) > 0 else 0
            if balls >= 6:
                completed += balls // 6
                balls = balls % 6
            return completed + (balls / 6.0)
        except (ValueError, IndexError):
            try:
                return float(overs_val)
            except (ValueError, TypeError):
                return 0.0
    else:
        try:
            return float(s)
        except (ValueError, TypeError):
            return 0.0


def _extract_match_innings(match: Match) -> tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Extracts innings 1 and innings 2 data from a Match instance.
    Returns (innings_1_info, innings_2_info) where each is a dict with keys:
        'team_id', 'runs', 'wickets', 'overs_decimal', 'is_all_out'
    """
    state = match.current_innings_state or {}
    max_overs = 20
    if match.tournament and match.tournament.max_overs:
        max_overs = match.tournament.max_overs
    elif state.get("max_overs"):
        max_overs = int(state.get("max_overs"))

    max_wickets = int(state.get("max_wickets", 10))

    inn1 = None
    inn2 = None

    # Case 1: Match state has innings_1_stats and current innings state
    if "innings_1_stats" in state and isinstance(state["innings_1_stats"], dict):
        s1 = state["innings_1_stats"]
        t1_id = s1.get("batting_team_id") or (str(match.batting_team_id) if match.batting_team_id else None)
        r1 = int(s1.get("runs", 0))
        w1 = int(s1.get("wickets", 0))
        ov_comp1 = int(s1.get("overs_completed", 0))
        b_this1 = int(s1.get("balls_this_over", 0))
        dec1 = overs_to_decimal((ov_comp1, b_this1))
        all_out_1 = (w1 >= max_wickets)

        inn1 = {
            "team_id": str(t1_id) if t1_id else None,
            "runs": r1,
            "wickets": w1,
            "overs_decimal": dec1,
            "is_all_out": all_out_1,
        }

        # Innings 2 from top-level state
        t2_id = state.get("batting_team_id") or (str(match.bowling_team_id) if match.bowling_team_id else None)
        r2 = int(state.get("runs", 0))
        w2 = int(state.get("wickets", 0))
        ov_comp2 = int(state.get("overs_completed", 0))
        b_this2 = int(state.get("balls_this_over", 0))
        dec2 = overs_to_decimal((ov_comp2, b_this2))
        all_out_2 = (w2 >= max_wickets)

        inn2 = {
            "team_id": str(t2_id) if t2_id else None,
            "runs": r2,
            "wickets": w2,
            "overs_decimal": dec2,
            "is_all_out": all_out_2,
        }

    # Case 2: Structured 'innings1' and 'innings2' in state
    elif "innings1" in state or "innings_1" in state:
        s1 = state.get("innings1") or state.get("innings_1") or {}
        s2 = state.get("innings2") or state.get("innings_2") or {}

        t1_id = s1.get("team_id") or (str(match.batting_team_id) if match.batting_team_id else None)
        r1 = int(s1.get("runs", 0))
        w1 = int(s1.get("wickets", 0))
        dec1 = overs_to_decimal(s1.get("overs", 0))

        inn1 = {
            "team_id": str(t1_id) if t1_id else None,
            "runs": r1,
            "wickets": w1,
            "overs_decimal": dec1,
            "is_all_out": (w1 >= max_wickets),
        }

        t2_id = s2.get("team_id") or (str(match.bowling_team_id) if match.bowling_team_id else None)
        r2 = int(s2.get("runs", 0))
        w2 = int(s2.get("wickets", 0))
        dec2 = overs_to_decimal(s2.get("overs", 0))

        inn2 = {
            "team_id": str(t2_id) if t2_id else None,
            "runs": r2,
            "wickets": w2,
            "overs_decimal": dec2,
            "is_all_out": (w2 >= max_wickets),
        }

    # Case 3: Fallback using BattingInnings / BowlingInnings relations
    elif match.batting_innings.exists():
        bat_inn1 = match.batting_innings.filter(innings_number=1)
        r1 = sum(b.runs_scored for b in bat_inn1)
        w1 = bat_inn1.exclude(dismissal="NOT_OUT").count()
        bowl_inn1 = match.bowling_innings.filter(innings_number=1)
        dec1 = sum(overs_to_decimal(b.overs_bowled) for b in bowl_inn1)

        inn1 = {
            "team_id": str(match.batting_team_id) if match.batting_team_id else None,
            "runs": r1,
            "wickets": w1,
            "overs_decimal": dec1,
            "is_all_out": (w1 >= max_wickets),
        }

        bat_inn2 = match.batting_innings.filter(innings_number=2)
        r2 = sum(b.runs_scored for b in bat_inn2)
        w2 = bat_inn2.exclude(dismissal="NOT_OUT").count()
        bowl_inn2 = match.bowling_innings.filter(innings_number=2)
        dec2 = sum(overs_to_decimal(b.overs_bowled) for b in bowl_inn2)

        inn2 = {
            "team_id": str(match.bowling_team_id) if match.bowling_team_id else None,
            "runs": r2,
            "wickets": w2,
            "overs_decimal": dec2,
            "is_all_out": (w2 >= max_wickets),
        }

    return inn1, inn2


def calculate_group_standings(group_id: Any) -> List[Dict[str, Any]]:
    """
    Computes the points table for a tournament group based on all COMPLETED matches.

    For each team in the group, tracks:
        - Played (P)
        - Won (W)
        - Lost (L)
        - Tied (T)
        - No Result (NR)
        - Points (Pts = W*2 + T*1 + NR*1)
        - Total Runs Scored
        - Total Overs Faced (enforcing All-Out Rule: if all out, overs_faced = max_overs)
        - Total Runs Conceded
        - Total Overs Bowled
        - NRR = (Total Runs Scored / Total Overs Faced) - (Total Runs Conceded / Total Overs Bowled)

    Standings are sorted by:
        Points DESC -> Wins DESC -> NRR DESC.
    """
    try:
        group = Group.objects.prefetch_related("teams").select_related("tournament").get(id=group_id)
    except (Group.DoesNotExist, ValueError):
        return []

    tournament = group.tournament
    default_max_overs = tournament.max_overs if tournament else 20

    # Retrieve all teams belonging to this group
    teams = list(group.teams.all())

    # Build initial standings tracking dictionary
    stats_by_team: Dict[str, Dict[str, Any]] = {}
    for team in teams:
        raw_id = str(team.id)
        stats_by_team[raw_id] = {
            "team_id": raw_id,
            "team_name": team.name,
            "team_logo": team.logo.url if team.logo else None,
            "team_color": team.theme_color or "#0f547c",
            "played": 0,
            "won": 0,
            "lost": 0,
            "tied": 0,
            "no_result": 0,
            "points": 0,
            "runs_scored": 0,
            "overs_faced": 0.0,
            "runs_conceded": 0,
            "overs_bowled": 0.0,
            "nrr": 0.0,
            "nrr_formatted": "0.000",
        }

    # Fetch completed matches associated with this group
    matches = Match.objects.filter(
        Q(group=group) | (Q(tournament=tournament) & Q(batting_team__in=teams) & Q(bowling_team__in=teams))
    ).filter(
        Q(status=Match.Status.COMPLETED) |
        Q(result_status__in=[Match.ResultStatus.COMPLETED, Match.ResultStatus.TIED, Match.ResultStatus.NO_RESULT])
    ).select_related("batting_team", "bowling_team", "winner").distinct()

    for match in matches:
        team1_id = str(match.batting_team_id) if match.batting_team_id else None
        team2_id = str(match.bowling_team_id) if match.bowling_team_id else None

        # Both teams must be valid
        if not team1_id or not team2_id:
            continue

        # If team is not yet in group stats dictionary, register it dynamically
        for tid, tname in [(team1_id, match.batting_team.name), (team2_id, match.bowling_team.name)]:
            if tid not in stats_by_team:
                t_obj = match.batting_team if tid == team1_id else match.bowling_team
                stats_by_team[tid] = {
                    "team_id": tid,
                    "team_name": tname,
                    "team_logo": t_obj.logo.url if t_obj.logo else None,
                    "team_color": t_obj.theme_color or "#0f547c",
                    "played": 0,
                    "won": 0,
                    "lost": 0,
                    "tied": 0,
                    "no_result": 0,
                    "points": 0,
                    "runs_scored": 0,
                    "overs_faced": 0.0,
                    "runs_conceded": 0,
                    "overs_bowled": 0.0,
                    "nrr": 0.0,
                    "nrr_formatted": "0.000",
                }

        s_t1 = stats_by_team[team1_id]
        s_t2 = stats_by_team[team2_id]

        match_max_overs = default_max_overs
        if match.tournament and match.tournament.max_overs:
            match_max_overs = match.tournament.max_overs
        elif match.current_innings_state and match.current_innings_state.get("max_overs"):
            try:
                match_max_overs = int(match.current_innings_state.get("max_overs"))
            except (ValueError, TypeError):
                pass

        # Check Result Status
        res_status = match.result_status
        if not res_status:
            if match.status == Match.Status.ABANDONED:
                res_status = Match.ResultStatus.NO_RESULT
            else:
                res_status = Match.ResultStatus.COMPLETED

        if res_status == Match.ResultStatus.NO_RESULT:
            s_t1["played"] += 1
            s_t1["no_result"] += 1
            s_t1["points"] += 1

            s_t2["played"] += 1
            s_t2["no_result"] += 1
            s_t2["points"] += 1
            continue

        if res_status == Match.ResultStatus.TIED:
            s_t1["played"] += 1
            s_t1["tied"] += 1
            s_t1["points"] += 1

            s_t2["played"] += 1
            s_t2["tied"] += 1
            s_t2["points"] += 1
        else:
            # COMPLETED match with winner determination
            s_t1["played"] += 1
            s_t2["played"] += 1

            winner_id = str(match.winner_id) if match.winner_id else None
            inn1, inn2 = _extract_match_innings(match)

            if not winner_id and inn1 and inn2:
                if inn1["runs"] > inn2["runs"]:
                    winner_id = inn1["team_id"]
                elif inn2["runs"] > inn1["runs"]:
                    winner_id = inn2["team_id"]
                else:
                    # Scores are equal -> tied
                    s_t1["tied"] += 1
                    s_t1["points"] += 1
                    s_t2["tied"] += 1
                    s_t2["points"] += 1
                    winner_id = None

            if winner_id:
                if winner_id == team1_id:
                    s_t1["won"] += 1
                    s_t1["points"] += 2
                    s_t2["lost"] += 1
                elif winner_id == team2_id:
                    s_t2["won"] += 1
                    s_t2["points"] += 2
                    s_t1["lost"] += 1

        # Extract Innings details for NRR computation
        inn1, inn2 = _extract_match_innings(match)
        if inn1 and inn2:
            # Match Innings 1: Team 1 bat, Team 2 bowl
            r1 = inn1["runs"]
            # Enforce All-Out Rule: if all out before max_overs, set overs_faced = max_overs
            if inn1["is_all_out"] or inn1["overs_decimal"] > match_max_overs:
                ov_faced_1 = float(match_max_overs)
            else:
                ov_faced_1 = inn1["overs_decimal"]

            # Match Innings 2: Team 2 bat, Team 1 bowl
            r2 = inn2["runs"]
            # Enforce All-Out Rule for innings 2
            if inn2["is_all_out"] or inn2["overs_decimal"] > match_max_overs:
                ov_faced_2 = float(match_max_overs)
            else:
                ov_faced_2 = inn2["overs_decimal"]

            # Team 1 accumulators
            s_t1["runs_scored"] += r1
            s_t1["overs_faced"] += ov_faced_1
            s_t1["runs_conceded"] += r2
            s_t1["overs_bowled"] += ov_faced_2

            # Team 2 accumulators
            s_t2["runs_scored"] += r2
            s_t2["overs_faced"] += ov_faced_2
            s_t2["runs_conceded"] += r1
            s_t2["overs_bowled"] += ov_faced_1

    # Calculate NRR for each team: NRR = (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)
    standings: List[Dict[str, Any]] = []
    for team_stat in stats_by_team.values():
        runs_scored = team_stat["runs_scored"]
        overs_faced = team_stat["overs_faced"]
        runs_conceded = team_stat["runs_conceded"]
        overs_bowled = team_stat["overs_bowled"]

        batting_rr = (runs_scored / overs_faced) if overs_faced > 0 else 0.0
        bowling_rr = (runs_conceded / overs_bowled) if overs_bowled > 0 else 0.0
        nrr = batting_rr - bowling_rr

        team_stat["nrr"] = round(nrr, 4)
        nrr_3dec = round(nrr, 3)
        if nrr_3dec > 0:
            team_stat["nrr_formatted"] = f"+{nrr_3dec:.3f}"
        elif nrr_3dec < 0:
            team_stat["nrr_formatted"] = f"{nrr_3dec:.3f}"
        else:
            team_stat["nrr_formatted"] = "0.000"

        # Round overs to 1 decimal for readable display
        team_stat["overs_faced_display"] = round(overs_faced, 1)
        team_stat["overs_bowled_display"] = round(overs_bowled, 1)

        standings.append(team_stat)

    # Sort standings by: Points DESC -> Wins DESC -> NRR DESC
    standings.sort(
        key=lambda x: (x["points"], x["won"], x["nrr"]),
        reverse=True,
    )

    # Assign sequential Rank
    for rank, entry in enumerate(standings, start=1):
        entry["rank"] = rank

    return standings


# ---------------------------------------------------------------------------
# TOURNAMENT LEADERBOARDS & AWARDS ENGINE
# ---------------------------------------------------------------------------

def _format_overs_display(overs_val: Any) -> str:
    """Formats an overs value into standard cricket notation string (e.g. '4.2', '20.0')."""
    if overs_val is None:
        return "0.0"
    if isinstance(overs_val, (tuple, list)) and len(overs_val) == 2:
        return f"{int(overs_val[0])}.{int(overs_val[1])}"
    s = str(overs_val).strip()
    if "." in s:
        parts = s.split(".")
        return f"{parts[0]}.{parts[1][:1]}"
    try:
        return f"{int(float(s))}.0"
    except (ValueError, TypeError):
        return "0.0"


def _parse_dismissal(status_str: str) -> Dict[str, Any]:
    """
    Parses a cricket dismissal status string.
    Returns:
      {
         'is_out': bool,
         'type': 'NOT_OUT'|'CAUGHT'|'BOWLED'|'LBW'|'STUMPED'|'RUN_OUT'|'HIT_WICKET'|'OTHER',
         'fielder': str or None,
         'bowler': str or None,
         'status_raw': str
      }
    """
    if not status_str:
        return {'is_out': False, 'type': 'NOT_OUT', 'fielder': None, 'bowler': None, 'status_raw': ''}
    s = str(status_str).strip()
    s_low = s.lower()
    if s_low in ('not out', 'retired hurt', 'batting', '*'):
        return {'is_out': False, 'type': 'NOT_OUT', 'fielder': None, 'bowler': None, 'status_raw': s}

    if s_low.startswith('c&b ') or s_low.startswith('c & b '):
        bowler = s.split('b ', 1)[1].strip() if 'b ' in s else s[4:].strip()
        return {'is_out': True, 'type': 'CAUGHT', 'fielder': bowler, 'bowler': bowler, 'status_raw': s}

    if s_low.startswith('c '):
        rest = s[2:].strip()
        if ' b ' in rest:
            fielder, bowler = rest.split(' b ', 1)
            return {'is_out': True, 'type': 'CAUGHT', 'fielder': fielder.strip(), 'bowler': bowler.strip(), 'status_raw': s}
        else:
            return {'is_out': True, 'type': 'CAUGHT', 'fielder': rest.strip(), 'bowler': None, 'status_raw': s}

    if s_low.startswith('st '):
        rest = s[3:].strip()
        if ' b ' in rest:
            fielder, bowler = rest.split(' b ', 1)
            return {'is_out': True, 'type': 'STUMPED', 'fielder': fielder.strip(), 'bowler': bowler.strip(), 'status_raw': s}
        else:
            return {'is_out': True, 'type': 'STUMPED', 'fielder': rest.strip(), 'bowler': None, 'status_raw': s}

    if 'run out' in s_low:
        fielder = None
        if '(' in s and ')' in s:
            fielder = s[s.find('(') + 1 : s.rfind(')')].strip()
        return {'is_out': True, 'type': 'RUN_OUT', 'fielder': fielder, 'bowler': None, 'status_raw': s}

    if s_low.startswith('lbw'):
        bowler = s.split('b ', 1)[1].strip() if 'b ' in s else None
        return {'is_out': True, 'type': 'LBW', 'fielder': None, 'bowler': bowler, 'status_raw': s}

    if s_low.startswith('b '):
        bowler = s[2:].strip()
        return {'is_out': True, 'type': 'BOWLED', 'fielder': None, 'bowler': bowler, 'status_raw': s}

    if 'hit wicket' in s_low:
        return {'is_out': True, 'type': 'HIT_WICKET', 'fielder': None, 'bowler': None, 'status_raw': s}

    return {'is_out': True, 'type': 'OTHER', 'fielder': None, 'bowler': None, 'status_raw': s}


def calculate_tournament_leaderboards(tournament_id: Any, group_id: Optional[Any] = None) -> Dict[str, Any]:
    """
    Computes comprehensive Tournament Leaderboards and Award Tracking across all matches
    belonging to a tournament (or optionally filtered to a specific group).

    Aggregates:
    - Batting: Top Scorers, Highest Individual Scores, Most 6s, Most 4s, Fastest 50s/100s, Best Strike Rates, Best Averages
    - Bowling: Top Wicket Takers, Best Bowling Figures, Best Economy Rates, Most Dot Balls
    - Fielding & Keeping: Best Fielder (catches + run-outs as non-keeper), Best Keeper (stumpings + catches behind)
    - MVP Points Table: 1 pt/run, 1 pt/boundary, 20 pts/wicket, 1 pt/dot ball, 10 pts/dismissal
    - Team Highlights: Highest Team Score, Highest Successful Run Chase, Highest Partnerships
    - Major Awards: Orange Cap, Purple Cap, Tournament MVP, Maximum Sixes, Boundary King
    """
    raw_tid = str(tournament_id)
    clean_tid = raw_tid.replace("-", "")

    try:
        tourn = Tournament.objects.filter(Q(id=raw_tid) | Q(id=clean_tid)).first()
    except Exception:
        tourn = Tournament.objects.filter(name__iexact=raw_tid).first()

    if not tourn:
        return {
            "error": "Tournament not found",
            "tournament": None,
            "filter_group": None,
            "matches_count": 0,
            "awards": {},
            "batting": {},
            "bowling": {},
            "fielding": {},
            "mvp_standings": [],
            "team_highlights": {}
        }

    filter_group = None
    if group_id and str(group_id).strip() not in ("", "all", "null", "None"):
        raw_gid = str(group_id).strip()
        clean_gid = raw_gid.replace("-", "")
        try:
            grp = Group.objects.filter(Q(id=raw_gid) | Q(id=clean_gid)).first()
        except Exception:
            grp = Group.objects.filter(name__iexact=raw_gid, tournament=tourn).first()
        if grp:
            filter_group = {"id": str(grp.id), "name": grp.name}

    # Fetch tournament matches (filter by group if specified)
    matches_qs = Match.objects.filter(tournament=tourn)
    if filter_group:
        matches_qs = matches_qs.filter(group_id=filter_group["id"])
    matches = list(matches_qs.select_related("batting_team", "bowling_team", "winner").all())

    # Helper to resolve absolute media URLs for desktop app and remote overlays
    def _format_media_url(val: Any) -> Optional[str]:
        if not val:
            return None
        url = getattr(val, "url", None) or str(val)
        if not url or url.strip() in ("", "None", "null"):
            return None
        clean = url.strip()
        if clean.startswith("http://") or clean.startswith("https://") or clean.startswith("data:"):
            return clean
        if clean.startswith("/"):
            return f"http://127.0.0.1:8000{clean}"
        return f"http://127.0.0.1:8000/media/{clean}"

    # Build player metadata mapping for role, team details, jersey number, and photos
    player_db_map: Dict[str, Dict[str, Any]] = {}
    for p in Player.objects.select_related("team").all():
        full_n = f"{p.first_name} {p.last_name}".strip()
        info = {
            "id": str(p.id),
            "name": full_n,
            "role": p.role,  # 'BAT', 'BOWL', 'AR', 'WK'
            "jersey": p.jersey_number,
            "team_id": str(p.team.id) if p.team else None,
            "team_name": p.team.name if p.team else "",
            "team_color": p.team.theme_color if p.team else "#0f547c",
            "team_logo": _format_media_url(p.team.logo) if (p.team and p.team.logo) else None,
            "image": _format_media_url(p.image) if p.image else None,
        }
        player_db_map[full_n.lower()] = info
        player_db_map[str(p.id).replace("-", "")] = info
        player_db_map[str(p.id)] = info
        if p.first_name and p.first_name.strip():
            fn = p.first_name.strip().lower()
            if fn not in player_db_map:
                player_db_map[fn] = info
        if p.last_name and p.last_name.strip():
            ln = p.last_name.strip().lower()
            if ln not in player_db_map:
                player_db_map[ln] = info

    def get_player_meta(name_or_id: str, default_team_name: str = "", default_team_color: str = "#0f547c") -> Dict[str, Any]:
        key = str(name_or_id).strip().lower()
        clean_id = key.replace("-", "")
        if key in player_db_map:
            return player_db_map[key]
        if clean_id in player_db_map:
            return player_db_map[clean_id]
        for db_name, db_info in player_db_map.items():
            if len(key) >= 3 and (key in db_name or db_name in key):
                return db_info
        return {
            "id": None,
            "name": str(name_or_id).strip(),
            "role": "BAT",
            "jersey": None,
            "team_id": None,
            "team_name": default_team_name,
            "team_color": default_team_color,
            "team_logo": None,
            "image": None,
        }

    # Data structures for aggregation
    batters_agg: Dict[str, Dict[str, Any]] = {}
    individual_batting: List[Dict[str, Any]] = []
    fastest_milestones: List[Dict[str, Any]] = []

    bowlers_agg: Dict[str, Dict[str, Any]] = {}
    individual_bowling: List[Dict[str, Any]] = []

    fielders_agg: Dict[str, Dict[str, Any]] = {}

    team_scores: List[Dict[str, Any]] = []
    run_chases: List[Dict[str, Any]] = []
    partnerships_list: List[Dict[str, Any]] = []

    # Process all matches
    for m in matches:
        match_id_str = str(m.id)
        state = m.current_innings_state or {}

        # Innings 1 and Innings 2 identification
        inn1_stats = state.get("innings_1_stats") if isinstance(state.get("innings_1_stats"), dict) else {}
        
        t1_name = state.get("team_1_name") or (m.batting_team.name if m.batting_team else "Team 1")
        t2_name = state.get("team_2_name") or (m.bowling_team.name if m.bowling_team else "Team 2")
        t1_color = state.get("batting_team_color") or (m.batting_team.theme_color if m.batting_team else "#0f547c")
        t2_color = state.get("bowling_team_color") or (m.bowling_team.theme_color if m.bowling_team else "#e11d48")

        # --- PROCESS INNINGS 1 ---
        inn1_runs = int(inn1_stats.get("runs", 0)) if inn1_stats else 0
        inn1_wkts = int(inn1_stats.get("wickets", 0)) if inn1_stats else 0
        ov_comp1 = int(inn1_stats.get("overs_completed", 0)) if inn1_stats else 0
        balls_this1 = int(inn1_stats.get("balls_this_over", 0)) if inn1_stats else 0
        ov_disp1 = f"{ov_comp1}.{balls_this1}"

        if inn1_runs > 0 or inn1_stats:
            team_scores.append({
                "team_name": t1_name,
                "team_color": t1_color,
                "runs": inn1_runs,
                "wickets": inn1_wkts,
                "overs_display": ov_disp1,
                "against_team": t2_name,
                "innings_number": 1,
                "match_id": match_id_str,
            })

        # Batting stats in Innings 1
        inn1_batters = inn1_stats.get("batsmen_stats", {}) if isinstance(inn1_stats.get("batsmen_stats"), dict) else {}
        inn1_bat_list = []
        for b_name, b_stat in inn1_batters.items():
            if not isinstance(b_stat, dict): continue
            clean_b_name = b_stat.get("name") or b_name
            p_meta = get_player_meta(clean_b_name, default_team_name=t1_name, default_team_color=t1_color)
            
            r = int(b_stat.get("runs", 0))
            b = int(b_stat.get("balls", 0))
            fours = int(b_stat.get("4s", 0))
            sixes = int(b_stat.get("6s", 0))
            status_str = str(b_stat.get("status", "not out"))
            parsed_d = _parse_dismissal(status_str)
            is_no = not parsed_d["is_out"]
            sr = round((r / b) * 100, 2) if b > 0 else 0.0

            # Record individual innings
            if b > 0 or r > 0 or not is_no:
                individual_batting.append({
                    "player_name": p_meta["name"],
                    "player_id": p_meta["id"],
                    "player_image": p_meta["image"],
                    "jersey": p_meta["jersey"],
                    "team_name": p_meta["team_name"] or t1_name,
                    "team_color": p_meta["team_color"] or t1_color,
                    "runs": r,
                    "balls": b,
                    "fours": fours,
                    "sixes": sixes,
                    "strike_rate": sr,
                    "is_not_out": is_no,
                    "status_display": status_str,
                    "against_team": t2_name,
                    "match_id": match_id_str,
                })
                inn1_bat_list.append((p_meta["name"], r))

            # Fastest 50 / 100 milestone
            if r >= 50:
                fastest_milestones.append({
                    "milestone": 100 if r >= 100 else 50,
                    "balls": b,
                    "runs": r,
                    "fours": fours,
                    "sixes": sixes,
                    "strike_rate": sr,
                    "player_name": p_meta["name"],
                    "player_id": p_meta["id"],
                    "player_image": p_meta["image"],
                    "jersey": p_meta["jersey"],
                    "team_name": p_meta["team_name"] or t1_name,
                    "team_color": p_meta["team_color"] or t1_color,
                    "against_team": t2_name,
                    "match_id": match_id_str,
                })

            # Update aggregated batting
            b_key = p_meta["name"].lower()
            if b_key not in batters_agg:
                batters_agg[b_key] = {
                    "player_name": p_meta["name"],
                    "player_id": p_meta["id"],
                    "player_image": p_meta["image"],
                    "jersey": p_meta["jersey"],
                    "role": p_meta["role"],
                    "team_name": p_meta["team_name"] or t1_name,
                    "team_color": p_meta["team_color"] or t1_color,
                    "matches": set(),
                    "innings": 0,
                    "runs": 0,
                    "balls": 0,
                    "fours": 0,
                    "sixes": 0,
                    "not_outs": 0,
                    "dismissals": 0,
                    "fifties": 0,
                    "hundreds": 0,
                    "highest_score": 0,
                    "highest_score_not_out": False,
                }
            agg = batters_agg[b_key]
            agg["matches"].add(match_id_str)
            if b > 0 or r > 0 or not is_no:
                agg["innings"] += 1
            agg["runs"] += r
            agg["balls"] += b
            agg["fours"] += fours
            agg["sixes"] += sixes
            if is_no:
                agg["not_outs"] += 1
            else:
                agg["dismissals"] += 1
            if 50 <= r < 100:
                agg["fifties"] += 1
            elif r >= 100:
                agg["hundreds"] += 1
            if r > agg["highest_score"] or (r == agg["highest_score"] and is_no):
                agg["highest_score"] = r
                agg["highest_score_not_out"] = is_no

            # Fielding dismissals in Innings 1 (fielded by team 2)
            if parsed_d["is_out"]:
                f_name = parsed_d.get("fielder")
                if f_name:
                    f_meta = get_player_meta(f_name, default_team_name=t2_name, default_team_color=t2_color)
                    f_key = f_meta["name"].lower()
                    if f_key not in fielders_agg:
                        fielders_agg[f_key] = {
                            "player_name": f_meta["name"],
                            "player_id": f_meta["id"],
                            "player_image": f_meta["image"],
                            "jersey": f_meta["jersey"],
                            "role": f_meta["role"],
                            "team_name": f_meta["team_name"] or t2_name,
                            "team_color": f_meta["team_color"] or t2_color,
                            "is_keeper": (f_meta["role"] == "WK"),
                            "catches": 0,
                            "run_outs": 0,
                            "stumpings": 0,
                        }
                    f_entry = fielders_agg[f_key]
                    if parsed_d["type"] == "STUMPED":
                        f_entry["stumpings"] += 1
                        f_entry["is_keeper"] = True
                    elif parsed_d["type"] == "RUN_OUT":
                        f_entry["run_outs"] += 1
                    elif parsed_d["type"] == "CAUGHT":
                        f_entry["catches"] += 1

        # Bowling stats in Innings 1 (bowled by team 2)
        inn1_bowlers = inn1_stats.get("bowler_stats", {}) if isinstance(inn1_stats.get("bowler_stats"), dict) else {}
        for bw_name, bw_stat in inn1_bowlers.items():
            if not isinstance(bw_stat, dict): continue
            clean_bw_name = bw_stat.get("name") or bw_name
            bw_meta = get_player_meta(clean_bw_name, default_team_name=t2_name, default_team_color=t2_color)

            ov_val = bw_stat.get("overs", 0)
            ov_dec = overs_to_decimal(ov_val)
            ov_disp = _format_overs_display(ov_val)
            r_c = int(bw_stat.get("runs", 0))
            w_c = int(bw_stat.get("wickets", 0))
            m_c = int(bw_stat.get("maidens", 0))
            econ = round(r_c / ov_dec, 2) if ov_dec > 0 else 0.0

            # Count dot balls from past_overs for this bowler
            dots = 0
            for po in inn1_stats.get("past_overs", []):
                if isinstance(po, dict) and po.get("bowler") == clean_bw_name:
                    for ball_lbl in po.get("balls", []):
                        if str(ball_lbl).strip() in ("0", "•", "·", "0b", "0lb", "w", "W", "0B", "0LB"):
                            dots += 1
            if dots == 0 and ov_dec > 0:
                # Minimum estimated dots based on overs and runs
                dots = max(0, int(ov_dec * 6 - r_c * 0.4))

            # Individual bowling figures
            individual_bowling.append({
                "player_name": bw_meta["name"],
                "player_id": bw_meta["id"],
                "player_image": bw_meta["image"],
                "jersey": bw_meta["jersey"],
                "team_name": bw_meta["team_name"] or t2_name,
                "team_color": bw_meta["team_color"] or t2_color,
                "wickets": w_c,
                "runs_conceded": r_c,
                "overs_display": ov_disp,
                "overs_decimal": ov_dec,
                "maidens": m_c,
                "economy": econ,
                "figures_str": f"{w_c}/{r_c}",
                "against_team": t1_name,
                "match_id": match_id_str,
            })

            # Update aggregated bowling
            bw_key = bw_meta["name"].lower()
            if bw_key not in bowlers_agg:
                bowlers_agg[bw_key] = {
                    "player_name": bw_meta["name"],
                    "player_id": bw_meta["id"],
                    "player_image": bw_meta["image"],
                    "jersey": bw_meta["jersey"],
                    "role": bw_meta["role"],
                    "team_name": bw_meta["team_name"] or t2_name,
                    "team_color": bw_meta["team_color"] or t2_color,
                    "matches": set(),
                    "innings": 0,
                    "overs_decimal": 0.0,
                    "runs_conceded": 0,
                    "wickets": 0,
                    "maidens": 0,
                    "dot_balls": 0,
                    "best_wkts": 0,
                    "best_runs": 999,
                    "best_figures_str": "-",
                }
            agg_bw = bowlers_agg[bw_key]
            agg_bw["matches"].add(match_id_str)
            if ov_dec > 0:
                agg_bw["innings"] += 1
            agg_bw["overs_decimal"] += ov_dec
            agg_bw["runs_conceded"] += r_c
            agg_bw["wickets"] += w_c
            agg_bw["maidens"] += m_c
            agg_bw["dot_balls"] += dots
            if w_c > agg_bw["best_wkts"] or (w_c == agg_bw["best_wkts"] and r_c < agg_bw["best_runs"]):
                agg_bw["best_wkts"] = w_c
                agg_bw["best_runs"] = r_c
                agg_bw["best_figures_str"] = f"{w_c}/{r_c}"

        # Partnerships in Innings 1 (between top 2 scorers)
        if len(inn1_bat_list) >= 2:
            sorted_inn1_bats = sorted(inn1_bat_list, key=lambda x: x[1], reverse=True)
            stand_r = min(sorted_inn1_bats[0][1] + sorted_inn1_bats[1][1], inn1_runs)
            partnerships_list.append({
                "batter_1": sorted_inn1_bats[0][0],
                "batter_2": sorted_inn1_bats[1][0],
                "runs": stand_r,
                "team_name": t1_name,
                "team_color": t1_color,
                "against_team": t2_name,
                "stand_label": "Key Stand",
                "match_id": match_id_str,
            })


        # --- PROCESS INNINGS 2 ---
        inn2_runs = int(state.get("runs", 0))
        inn2_wkts = int(state.get("wickets", 0))
        ov_comp2 = int(state.get("overs_completed", 0))
        balls_this2 = int(state.get("balls_this_over", 0))
        ov_disp2 = f"{ov_comp2}.{balls_this2}"

        if inn2_runs > 0 or state.get("innings") == 2 or state.get("match_over"):
            team_scores.append({
                "team_name": t2_name,
                "team_color": t2_color,
                "runs": inn2_runs,
                "wickets": inn2_wkts,
                "overs_display": ov_disp2,
                "against_team": t1_name,
                "innings_number": 2,
                "match_id": match_id_str,
            })

            # Check if successful run chase
            target = state.get("target") or (inn1_runs + 1 if inn1_runs > 0 else None)
            is_winner = (state.get("winner_id") and str(state.get("winner_id")).replace("-", "") == str(state.get("batting_team_id", "")).replace("-", "")) or (target and inn2_runs >= target)
            if is_winner and target:
                run_chases.append({
                    "team_name": t2_name,
                    "team_color": t2_color,
                    "target_chased": target,
                    "runs_scored": inn2_runs,
                    "wickets_lost": inn2_wkts,
                    "overs_display": ov_disp2,
                    "against_team": t1_name,
                    "match_id": match_id_str,
                })

        # Batting stats in Innings 2
        inn2_batters = state.get("batsmen_stats", {}) if isinstance(state.get("batsmen_stats"), dict) else {}
        inn2_bat_list = []
        for b_name, b_stat in inn2_batters.items():
            if not isinstance(b_stat, dict): continue
            clean_b_name = b_stat.get("name") or b_name
            p_meta = get_player_meta(clean_b_name, default_team_name=t2_name, default_team_color=t2_color)

            r = int(b_stat.get("runs", 0))
            b = int(b_stat.get("balls", 0))
            fours = int(b_stat.get("4s", 0))
            sixes = int(b_stat.get("6s", 0))
            status_str = str(b_stat.get("status", "not out"))
            parsed_d = _parse_dismissal(status_str)
            is_no = not parsed_d["is_out"]
            sr = round((r / b) * 100, 2) if b > 0 else 0.0

            if b > 0 or r > 0 or not is_no:
                individual_batting.append({
                    "player_name": p_meta["name"],
                    "player_id": p_meta["id"],
                    "player_image": p_meta["image"],
                    "jersey": p_meta["jersey"],
                    "team_name": p_meta["team_name"] or t2_name,
                    "team_color": p_meta["team_color"] or t2_color,
                    "runs": r,
                    "balls": b,
                    "fours": fours,
                    "sixes": sixes,
                    "strike_rate": sr,
                    "is_not_out": is_no,
                    "status_display": status_str,
                    "against_team": t1_name,
                    "match_id": match_id_str,
                })
                inn2_bat_list.append((p_meta["name"], r))

            if r >= 50:
                fastest_milestones.append({
                    "milestone": 100 if r >= 100 else 50,
                    "balls": b,
                    "runs": r,
                    "fours": fours,
                    "sixes": sixes,
                    "strike_rate": sr,
                    "player_name": p_meta["name"],
                    "player_id": p_meta["id"],
                    "player_image": p_meta["image"],
                    "jersey": p_meta["jersey"],
                    "team_name": p_meta["team_name"] or t2_name,
                    "team_color": p_meta["team_color"] or t2_color,
                    "against_team": t1_name,
                    "match_id": match_id_str,
                })

            b_key = p_meta["name"].lower()
            if b_key not in batters_agg:
                batters_agg[b_key] = {
                    "player_name": p_meta["name"],
                    "player_id": p_meta["id"],
                    "player_image": p_meta["image"],
                    "jersey": p_meta["jersey"],
                    "role": p_meta["role"],
                    "team_name": p_meta["team_name"] or t2_name,
                    "team_color": p_meta["team_color"] or t2_color,
                    "matches": set(),
                    "innings": 0,
                    "runs": 0,
                    "balls": 0,
                    "fours": 0,
                    "sixes": 0,
                    "not_outs": 0,
                    "dismissals": 0,
                    "fifties": 0,
                    "hundreds": 0,
                    "highest_score": 0,
                    "highest_score_not_out": False,
                }
            agg = batters_agg[b_key]
            agg["matches"].add(match_id_str)
            if b > 0 or r > 0 or not is_no:
                agg["innings"] += 1
            agg["runs"] += r
            agg["balls"] += b
            agg["fours"] += fours
            agg["sixes"] += sixes
            if is_no:
                agg["not_outs"] += 1
            else:
                agg["dismissals"] += 1
            if 50 <= r < 100:
                agg["fifties"] += 1
            elif r >= 100:
                agg["hundreds"] += 1
            if r > agg["highest_score"] or (r == agg["highest_score"] and is_no):
                agg["highest_score"] = r
                agg["highest_score_not_out"] = is_no

            # Fielding dismissals in Innings 2 (fielded by team 1)
            if parsed_d["is_out"]:
                f_name = parsed_d.get("fielder")
                if f_name:
                    f_meta = get_player_meta(f_name, default_team_name=t1_name, default_team_color=t1_color)
                    f_key = f_meta["name"].lower()
                    if f_key not in fielders_agg:
                        fielders_agg[f_key] = {
                            "player_name": f_meta["name"],
                            "player_id": f_meta["id"],
                            "player_image": f_meta["image"],
                            "jersey": f_meta["jersey"],
                            "role": f_meta["role"],
                            "team_name": f_meta["team_name"] or t1_name,
                            "team_color": f_meta["team_color"] or t1_color,
                            "is_keeper": (f_meta["role"] == "WK"),
                            "catches": 0,
                            "run_outs": 0,
                            "stumpings": 0,
                        }
                    f_entry = fielders_agg[f_key]
                    if parsed_d["type"] == "STUMPED":
                        f_entry["stumpings"] += 1
                        f_entry["is_keeper"] = True
                    elif parsed_d["type"] == "RUN_OUT":
                        f_entry["run_outs"] += 1
                    elif parsed_d["type"] == "CAUGHT":
                        f_entry["catches"] += 1

        # Bowling stats in Innings 2 (bowled by team 1)
        inn2_bowlers = state.get("bowler_stats", {}) if isinstance(state.get("bowler_stats"), dict) else {}
        for bw_name, bw_stat in inn2_bowlers.items():
            if not isinstance(bw_stat, dict): continue
            clean_bw_name = bw_stat.get("name") or bw_name
            bw_meta = get_player_meta(clean_bw_name, default_team_name=t1_name, default_team_color=t1_color)

            ov_val = bw_stat.get("overs", 0)
            ov_dec = overs_to_decimal(ov_val)
            ov_disp = _format_overs_display(ov_val)
            r_c = int(bw_stat.get("runs", 0))
            w_c = int(bw_stat.get("wickets", 0))
            m_c = int(bw_stat.get("maidens", 0))
            econ = round(r_c / ov_dec, 2) if ov_dec > 0 else 0.0

            dots = 0
            for po in state.get("past_overs", []):
                if isinstance(po, dict) and po.get("bowler") == clean_bw_name:
                    for ball_lbl in po.get("balls", []):
                        if str(ball_lbl).strip() in ("0", "•", "·", "0b", "0lb", "w", "W", "0B", "0LB"):
                            dots += 1
            if dots == 0 and ov_dec > 0:
                dots = max(0, int(ov_dec * 6 - r_c * 0.4))

            individual_bowling.append({
                "player_name": bw_meta["name"],
                "player_id": bw_meta["id"],
                "player_image": bw_meta["image"],
                "jersey": bw_meta["jersey"],
                "team_name": bw_meta["team_name"] or t1_name,
                "team_color": bw_meta["team_color"] or t1_color,
                "wickets": w_c,
                "runs_conceded": r_c,
                "overs_display": ov_disp,
                "overs_decimal": ov_dec,
                "maidens": m_c,
                "economy": econ,
                "figures_str": f"{w_c}/{r_c}",
                "against_team": t2_name,
                "match_id": match_id_str,
            })

            bw_key = bw_meta["name"].lower()
            if bw_key not in bowlers_agg:
                bowlers_agg[bw_key] = {
                    "player_name": bw_meta["name"],
                    "player_id": bw_meta["id"],
                    "player_image": bw_meta["image"],
                    "jersey": bw_meta["jersey"],
                    "role": bw_meta["role"],
                    "team_name": bw_meta["team_name"] or t1_name,
                    "team_color": bw_meta["team_color"] or t1_color,
                    "matches": set(),
                    "innings": 0,
                    "overs_decimal": 0.0,
                    "runs_conceded": 0,
                    "wickets": 0,
                    "maidens": 0,
                    "dot_balls": 0,
                    "best_wkts": 0,
                    "best_runs": 999,
                    "best_figures_str": "-",
                }
            agg_bw = bowlers_agg[bw_key]
            agg_bw["matches"].add(match_id_str)
            if ov_dec > 0:
                agg_bw["innings"] += 1
            agg_bw["overs_decimal"] += ov_dec
            agg_bw["runs_conceded"] += r_c
            agg_bw["wickets"] += w_c
            agg_bw["maidens"] += m_c
            agg_bw["dot_balls"] += dots
            if w_c > agg_bw["best_wkts"] or (w_c == agg_bw["best_wkts"] and r_c < agg_bw["best_runs"]):
                agg_bw["best_wkts"] = w_c
                agg_bw["best_runs"] = r_c
                agg_bw["best_figures_str"] = f"{w_c}/{r_c}"

        if len(inn2_bat_list) >= 2:
            sorted_inn2_bats = sorted(inn2_bat_list, key=lambda x: x[1], reverse=True)
            stand_r = min(sorted_inn2_bats[0][1] + sorted_inn2_bats[1][1], inn2_runs)
            partnerships_list.append({
                "batter_1": sorted_inn2_bats[0][0],
                "batter_2": sorted_inn2_bats[1][0],
                "runs": stand_r,
                "team_name": t2_name,
                "team_color": t2_color,
                "against_team": t1_name,
                "stand_label": "Key Stand",
                "match_id": match_id_str,
            })

    # --- COMPILE BATTING LEADERBOARDS ---
    compiled_batters = []
    for b in batters_agg.values():
        r = b["runs"]
        bls = b["balls"]
        d = b["dismissals"]
        sr = round((r / bls) * 100, 2) if bls > 0 else 0.0
        avg = round(r / d, 2) if d > 0 else float(r)
        avg_display = f"{avg:.2f}" if d > 0 else (f"{r}*" if r > 0 else "0.0")

        hs_str = f"{b['highest_score']}{'*' if b['highest_score_not_out'] else ''}"
        compiled_batters.append({
            "player_name": b["player_name"],
            "player_id": b["player_id"],
            "player_image": b["player_image"],
            "jersey": b["jersey"],
            "role": b["role"],
            "team_name": b["team_name"],
            "team_color": b["team_color"],
            "matches": len(b["matches"]),
            "innings": b["innings"],
            "runs": r,
            "balls": bls,
            "fours": b["fours"],
            "sixes": b["sixes"],
            "boundaries": b["fours"] + b["sixes"],
            "not_outs": b["not_outs"],
            "dismissals": d,
            "average": avg,
            "average_display": avg_display,
            "strike_rate": sr,
            "highest_score": b["highest_score"],
            "highest_score_display": hs_str,
            "fifties": b["fifties"],
            "hundreds": b["hundreds"],
        })

    # 1. Top Scorers (Orange Cap order)
    top_scorers = sorted(compiled_batters, key=lambda x: (x["runs"], x["average"], x["strike_rate"]), reverse=True)
    for rank, entry in enumerate(top_scorers, start=1):
        entry["rank"] = rank

    # 2. Highest Individual Scores
    highest_scores = sorted(individual_batting, key=lambda x: (x["runs"], -x["balls"]), reverse=True)
    for rank, entry in enumerate(highest_scores, start=1):
        entry["rank"] = rank

    # 3. Most 6s
    most_sixes = sorted([b for b in compiled_batters if b["sixes"] > 0], key=lambda x: (x["sixes"], x["runs"]), reverse=True)
    for rank, entry in enumerate(most_sixes, start=1):
        entry["rank"] = rank

    # 4. Most 4s
    most_fours = sorted([b for b in compiled_batters if b["fours"] > 0], key=lambda x: (x["fours"], x["runs"]), reverse=True)
    for rank, entry in enumerate(most_fours, start=1):
        entry["rank"] = rank

    # 5. Fastest 50 / 100
    fastest_fifties = sorted(fastest_milestones, key=lambda x: (x["balls"], -x["runs"]))
    for rank, entry in enumerate(fastest_fifties, start=1):
        entry["rank"] = rank

    # 6. Best Strike Rate (min. 30 balls faced, fallback if early in tournament)
    sr_qualifiers = [b for b in compiled_batters if b["balls"] >= 30]
    min_sr_balls = 30
    if not sr_qualifiers:
        sr_qualifiers = [b for b in compiled_batters if b["balls"] >= 10]
        min_sr_balls = 10 if sr_qualifiers else 1
    if not sr_qualifiers:
        sr_qualifiers = [b for b in compiled_batters if b["balls"] > 0]
    best_strike_rates = sorted(sr_qualifiers, key=lambda x: (x["strike_rate"], x["runs"]), reverse=True)
    for rank, entry in enumerate(best_strike_rates, start=1):
        entry["rank"] = rank

    # 7. Best Average
    avg_qualifiers = [b for b in compiled_batters if b["innings"] >= 1 and b["runs"] > 0]
    best_averages = sorted(avg_qualifiers, key=lambda x: (x["average"], x["runs"]), reverse=True)
    for rank, entry in enumerate(best_averages, start=1):
        entry["rank"] = rank


    # --- COMPILE BOWLING LEADERBOARDS ---
    compiled_bowlers = []
    for bw in bowlers_agg.values():
        ov_d = round(bw["overs_decimal"], 4)
        r_c = bw["runs_conceded"]
        w = bw["wickets"]
        econ = round(r_c / ov_d, 2) if ov_d > 0 else 0.0
        bw_avg = round(r_c / w, 2) if w > 0 else float(r_c)

        compiled_bowlers.append({
            "player_name": bw["player_name"],
            "player_id": bw["player_id"],
            "player_image": bw["player_image"],
            "jersey": bw["jersey"],
            "role": bw["role"],
            "team_name": bw["team_name"],
            "team_color": bw["team_color"],
            "matches": len(bw["matches"]),
            "innings": bw["innings"],
            "overs_decimal": round(ov_d, 1),
            "overs_display": _format_overs_display(ov_d),
            "runs_conceded": r_c,
            "wickets": w,
            "maidens": bw["maidens"],
            "economy": econ,
            "average": bw_avg,
            "average_display": f"{bw_avg:.2f}" if w > 0 else "-",
            "best_figures": bw["best_figures_str"],
            "dot_balls": bw["dot_balls"],
        })

    # 1. Top Wicket Takers (Purple Cap order)
    top_wicket_takers = sorted(compiled_bowlers, key=lambda x: (x["wickets"], -x["economy"], -x["average"]), reverse=True)
    for rank, entry in enumerate(top_wicket_takers, start=1):
        entry["rank"] = rank

    # 2. Best Bowling Figures
    best_bowling_figures = sorted(individual_bowling, key=lambda x: (x["wickets"], -x["runs_conceded"]), reverse=True)
    for rank, entry in enumerate(best_bowling_figures, start=1):
        entry["rank"] = rank

    # 3. Best Economy Rate (min. 6 overs bowled, fallback if early)
    econ_qualifiers = [b for b in compiled_bowlers if b["overs_decimal"] >= 6.0]
    min_econ_overs = 6.0
    if not econ_qualifiers:
        econ_qualifiers = [b for b in compiled_bowlers if b["overs_decimal"] >= 2.0]
        min_econ_overs = 2.0 if econ_qualifiers else 0.5
    if not econ_qualifiers:
        econ_qualifiers = [b for b in compiled_bowlers if b["overs_decimal"] > 0]
    best_economy_rates = sorted(econ_qualifiers, key=lambda x: (x["economy"], -x["wickets"]))
    for rank, entry in enumerate(best_economy_rates, start=1):
        entry["rank"] = rank

    # 4. Most Dot Balls
    most_dot_balls = sorted([b for b in compiled_bowlers if b["dot_balls"] > 0], key=lambda x: (x["dot_balls"], -x["economy"]), reverse=True)
    for rank, entry in enumerate(most_dot_balls, start=1):
        entry["rank"] = rank


    # --- COMPILE FIELDING & KEEPING ---
    top_fielders = []
    top_keepers = []
    for f in fielders_agg.values():
        c = f["catches"]
        ro = f["run_outs"]
        st = f["stumpings"]
        is_wk = f["is_keeper"] or st > 0

        if is_wk:
            tot = st + c
            if tot > 0:
                top_keepers.append({
                    "player_name": f["player_name"],
                    "player_id": f["player_id"],
                    "player_image": f["player_image"],
                    "jersey": f["jersey"],
                    "team_name": f["team_name"],
                    "team_color": f["team_color"],
                    "stumpings": st,
                    "catches_behind": c,
                    "total_dismissals": tot,
                })
        else:
            tot = c + ro
            if tot > 0:
                top_fielders.append({
                    "player_name": f["player_name"],
                    "player_id": f["player_id"],
                    "player_image": f["player_image"],
                    "jersey": f["jersey"],
                    "team_name": f["team_name"],
                    "team_color": f["team_color"],
                    "catches": c,
                    "run_outs": ro,
                    "total_dismissals": tot,
                })

    top_fielders.sort(key=lambda x: (x["total_dismissals"], x["catches"]), reverse=True)
    for rank, entry in enumerate(top_fielders, start=1):
        entry["rank"] = rank

    top_keepers.sort(key=lambda x: (x["total_dismissals"], x["stumpings"]), reverse=True)
    for rank, entry in enumerate(top_keepers, start=1):
        entry["rank"] = rank


    # --- COMPILE MVP POINTS TABLE ---
    # Formula:
    # 1 pt / run
    # 1 pt / boundary (4s + 6s)
    # 20 pts / wicket
    # 1 pt / dot ball
    # 10 pts / catch, stumping, or run out
    all_player_keys = set(batters_agg.keys()).union(set(bowlers_agg.keys())).union(set(fielders_agg.keys()))
    mvp_standings: List[Dict[str, Any]] = []

    for p_key in all_player_keys:
        b_data = batters_agg.get(p_key, {})
        bw_data = bowlers_agg.get(p_key, {})
        f_data = fielders_agg.get(p_key, {})

        name = b_data.get("player_name") or bw_data.get("player_name") or f_data.get("player_name") or p_key.title()
        p_id = b_data.get("player_id") or bw_data.get("player_id") or f_data.get("player_id")
        p_img = b_data.get("player_image") or bw_data.get("player_image") or f_data.get("player_image")
        jersey = b_data.get("jersey") or bw_data.get("jersey") or f_data.get("jersey")
        role = b_data.get("role") or bw_data.get("role") or f_data.get("role") or "AR"
        t_name = b_data.get("team_name") or bw_data.get("team_name") or f_data.get("team_name") or ""
        t_color = b_data.get("team_color") or bw_data.get("team_color") or f_data.get("team_color") or "#0f547c"

        p_runs = b_data.get("runs", 0)
        p_4s = b_data.get("fours", 0)
        p_6s = b_data.get("sixes", 0)
        p_boundaries = p_4s + p_6s
        p_wkts = bw_data.get("wickets", 0)
        p_dots = bw_data.get("dot_balls", 0)
        p_catches = f_data.get("catches", 0)
        p_stumpings = f_data.get("stumpings", 0)
        p_run_outs = f_data.get("run_outs", 0)
        p_fielding_tot = p_catches + p_stumpings + p_run_outs

        run_pts = p_runs * 1
        boundary_pts = p_boundaries * 1
        wicket_pts = p_wkts * 20
        dot_pts = p_dots * 1
        field_pts = p_fielding_tot * 10

        total_mvp = run_pts + boundary_pts + wicket_pts + dot_pts + field_pts

        if total_mvp > 0 or b_data.get("innings", 0) > 0 or bw_data.get("innings", 0) > 0:
            mvp_standings.append({
                "player_name": name,
                "player_id": p_id,
                "player_image": p_img,
                "jersey": jersey,
                "role": role,
                "team_name": t_name,
                "team_color": t_color,
                "runs": p_runs,
                "fours": p_4s,
                "sixes": p_6s,
                "boundaries": p_boundaries,
                "wickets": p_wkts,
                "dot_balls": p_dots,
                "catches": p_catches,
                "stumpings": p_stumpings,
                "run_outs": p_run_outs,
                "run_pts": run_pts,
                "boundary_pts": boundary_pts,
                "wicket_pts": wicket_pts,
                "dot_pts": dot_pts,
                "field_pts": field_pts,
                "mvp_points": total_mvp,
            })

    mvp_standings.sort(key=lambda x: (x["mvp_points"], x["runs"], x["wickets"]), reverse=True)
    for rank, entry in enumerate(mvp_standings, start=1):
        entry["rank"] = rank


    # --- COMPILE TEAM HIGHLIGHTS ---
    highest_team_scores = sorted(team_scores, key=lambda x: (x["runs"], -x["wickets"]), reverse=True)
    for rank, entry in enumerate(highest_team_scores, start=1):
        entry["rank"] = rank

    highest_successful_run_chases = sorted(run_chases, key=lambda x: (x["target_chased"], x["runs_scored"]), reverse=True)
    for rank, entry in enumerate(highest_successful_run_chases, start=1):
        entry["rank"] = rank

    highest_partnerships = sorted(partnerships_list, key=lambda x: x["runs"], reverse=True)
    for rank, entry in enumerate(highest_partnerships, start=1):
        entry["rank"] = rank


    # --- COMPILE MAJOR TOURNAMENT AWARDS ---
    orange_cap = top_scorers[0] if top_scorers else None
    purple_cap = top_wicket_takers[0] if top_wicket_takers else None
    mvp_award = mvp_standings[0] if mvp_standings else None
    max_sixes_award = most_sixes[0] if most_sixes else None
    boundary_king_award = sorted(compiled_batters, key=lambda x: (x["boundaries"], x["sixes"], x["runs"]), reverse=True)[0] if compiled_batters else None

    awards = {
        "orange_cap": orange_cap,
        "purple_cap": purple_cap,
        "mvp": mvp_award,
        "maximum_sixes": max_sixes_award,
        "boundary_king": boundary_king_award,
    }

    return {
        "tournament": {
            "id": str(tourn.id),
            "name": tourn.name,
            "season": tourn.season,
            "max_overs": tourn.max_overs,
        },
        "filter_group": filter_group,
        "matches_count": len(matches),
        "awards": awards,
        "batting": {
            "top_scorers": top_scorers[:20],
            "highest_individual_scores": highest_scores[:15],
            "most_sixes": most_sixes[:15],
            "most_fours": most_fours[:15],
            "fastest_fifties": fastest_fifties[:10],
            "best_strike_rates": best_strike_rates[:15],
            "min_strike_rate_balls": min_sr_balls,
            "best_averages": best_averages[:15],
        },
        "bowling": {
            "top_wicket_takers": top_wicket_takers[:20],
            "best_bowling_figures": best_bowling_figures[:15],
            "best_economy_rates": best_economy_rates[:15],
            "min_economy_overs": min_econ_overs,
            "most_dot_balls": most_dot_balls[:15],
        },
        "fielding": {
            "top_fielders": top_fielders[:15],
            "top_keepers": top_keepers[:15],
        },
        "mvp_standings": mvp_standings[:25],
        "team_highlights": {
            "highest_team_scores": highest_team_scores[:10],
            "highest_successful_run_chases": highest_successful_run_chases[:10],
            "highest_partnerships": highest_partnerships[:10],
        }
    }

