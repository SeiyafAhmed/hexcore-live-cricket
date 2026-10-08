"""
Services and business logic for scoring, tournament management, and points calculations.
"""

import math
from typing import Any, Dict, List, Optional
import uuid

from django.db.models import Q
from .models import Group, Match, Team


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


def calculate_tournament_leaderboards(tournament_id: Any) -> Dict[str, Any]:
    """
    Aggregates stats to return tournament leaderboards (Batting, Bowling, MVP).
    """
    from django.db.models import Sum, Count, F, ExpressionWrapper, FloatField
    from .models import BattingInnings, BowlingInnings, Player, Tournament

    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except (Tournament.DoesNotExist, ValueError):
        return {}

    batting_qs = BattingInnings.objects.filter(match__tournament=tournament)
    bowling_qs = BowlingInnings.objects.filter(match__tournament=tournament)
    
    # Helper for formatting player data
    def fmt_player(p):
        img_url = None
        if p.get('player__image'):
            # Basic formatting for image URL if it's not a full path
            img_url = f"/media/{p['player__image']}" if not str(p['player__image']).startswith('/media/') else p['player__image']
        return {
            "id": str(p['player__id']),
            "name": f"{p['player__first_name']} {p['player__last_name']}",
            "team": p['player__team__name'],
            "image": img_url
        }

    # --- Batting ---
    top_scorers_qs = batting_qs.values('player__id', 'player__first_name', 'player__last_name', 'player__team__name', 'player__image').annotate(
        total_runs=Sum('runs_scored')
    ).order_by('-total_runs')[:5]
    top_scorers = [{"player": fmt_player(p), "value": p["total_runs"]} for p in top_scorers_qs]

    highest_score_qs = batting_qs.values('player__id', 'player__first_name', 'player__last_name', 'player__team__name', 'player__image', 'runs_scored', 'balls_faced', 'dismissal').order_by('-runs_scored', 'balls_faced')[:5]
    highest_score = [{"player": fmt_player(p), "runs": p["runs_scored"], "balls": p["balls_faced"], "not_out": p["dismissal"] in ["NOT_OUT", "RETIRED"]} for p in highest_score_qs]

    most_6s_qs = batting_qs.values('player__id', 'player__first_name', 'player__last_name', 'player__team__name', 'player__image').annotate(
        total_6s=Sum('sixes')
    ).order_by('-total_6s')[:5]
    most_6s = [{"player": fmt_player(p), "value": p["total_6s"]} for p in most_6s_qs]

    most_4s_qs = batting_qs.values('player__id', 'player__first_name', 'player__last_name', 'player__team__name', 'player__image').annotate(
        total_4s=Sum('fours')
    ).order_by('-total_4s')[:5]
    most_4s = [{"player": fmt_player(p), "value": p["total_4s"]} for p in most_4s_qs]
    
    best_sr_qs = batting_qs.values('player__id', 'player__first_name', 'player__last_name', 'player__team__name', 'player__image').annotate(
        total_runs=Sum('runs_scored'),
        total_balls=Sum('balls_faced')
    ).filter(total_balls__gte=20).annotate(
        sr=ExpressionWrapper(F('total_runs') * 100.0 / F('total_balls'), output_field=FloatField())
    ).order_by('-sr')[:5]
    best_sr = [{"player": fmt_player(p), "value": round(p["sr"], 2)} for p in best_sr_qs]

    # --- Bowling ---
    top_wickets_qs = bowling_qs.values('player__id', 'player__first_name', 'player__last_name', 'player__team__name', 'player__image').annotate(
        total_wickets=Sum('wickets')
    ).order_by('-total_wickets', 'runs_conceded')[:5]
    top_wickets = [{"player": fmt_player(p), "value": p["total_wickets"]} for p in top_wickets_qs]

    best_figures_qs = bowling_qs.values('player__id', 'player__first_name', 'player__last_name', 'player__team__name', 'player__image', 'wickets', 'runs_conceded', 'overs_bowled').order_by('-wickets', 'runs_conceded')[:5]
    best_figures = [{"player": fmt_player(p), "wickets": p["wickets"], "runs": p["runs_conceded"], "overs": float(p["overs_bowled"])} for p in best_figures_qs]

    # --- MVP Points Table ---
    # Points: 1 pt/run, 1 pt/boundary, 20 pts/wicket
    batting_mvp = list(batting_qs.values('player__id').annotate(
        runs=Sum('runs_scored'),
        fours=Sum('fours'),
        sixes=Sum('sixes')
    ))
    bowling_mvp = list(bowling_qs.values('player__id').annotate(
        wickets=Sum('wickets')
    ))
    
    mvp_dict = {}
    player_ids = set([p['player__id'] for p in batting_mvp] + [p['player__id'] for p in bowling_mvp])
    
    if player_ids:
        players_qs = Player.objects.filter(id__in=player_ids).select_related('team')
        players_map = {p.id: p for p in players_qs}
        
        for p_id in player_ids:
            mvp_dict[p_id] = {"points": 0}

        for b in batting_mvp:
            mvp_dict[b['player__id']]["points"] += b['runs'] + b['fours'] + b['sixes']
            
        for b in bowling_mvp:
            mvp_dict[b['player__id']]["points"] += b['wickets'] * 20
            
        mvp_list = []
        for p_id, data in mvp_dict.items():
            if p_id in players_map:
                p = players_map[p_id]
                img_url = p.image.url if p.image else None
                mvp_list.append({
                    "player": {
                        "id": str(p.id),
                        "name": f"{p.first_name} {p.last_name}",
                        "team": p.team.name if p.team else "",
                        "image": img_url
                    },
                    "value": data["points"]
                })
                
        mvp_list.sort(key=lambda x: x["value"], reverse=True)
        mvp_top = mvp_list[:10]
    else:
        mvp_top = []

    return {
        "batting": {
            "top_scorers": top_scorers,
            "highest_score": highest_score,
            "most_6s": most_6s,
            "most_4s": most_4s,
            "best_sr": best_sr,
        },
        "bowling": {
            "top_wickets": top_wickets,
            "best_figures": best_figures,
        },
        "mvp": mvp_top
    }

