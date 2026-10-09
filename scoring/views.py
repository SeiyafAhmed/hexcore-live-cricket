"""
DRF viewsets for the scoring app.

All viewsets use MultiPartParser + FormParser so that image uploads
are accepted via multipart/form-data alongside JSON payloads.
"""

import copy
import json
import queue
import threading
import time
import uuid

from django.db.models import Avg, Count, Sum
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.http import StreamingHttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    Ball,
    BattingInnings,
    BowlingInnings,
    Group,
    Match,
    Player,
    Team,
    Tournament,
)
from .serializers import (
    BallSerializer,
    BattingInningsSerializer,
    BowlingInningsSerializer,
    GroupSerializer,
    MatchSerializer,
    PlayerSerializer,
    PlayerStatsSerializer,
    TeamSerializer,
    TournamentSerializer,
)
from .services import calculate_group_standings, calculate_tournament_leaderboards


# ---------------------------------------------------------------------------
# Team
# ---------------------------------------------------------------------------

class TeamViewSet(viewsets.ModelViewSet):
    """CRUD for teams.  Supports logo upload via multipart/form-data."""

    queryset = Team.objects.annotate(player_count=Count("players"))
    serializer_class = TeamSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = "id"


# ---------------------------------------------------------------------------
# Player
# ---------------------------------------------------------------------------

class PlayerViewSet(viewsets.ModelViewSet):
    """CRUD for players + career stats endpoint."""

    queryset = Player.objects.select_related("team")
    serializer_class = PlayerSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = "id"

    def get_queryset(self):
        qs = super().get_queryset()
        team_id = self.request.query_params.get("team")
        if team_id:
            qs = qs.filter(team_id=team_id)
        return qs

    # ----- Custom action: career stats -----
    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, id=None):
        """
        GET /api/players/<id>/stats/

        Uses Django aggregate functions (Sum, Count) to compute career
        batting and bowling totals from BattingInnings / BowlingInnings.
        """
        player = self.get_object()

        # --- Batting aggregates ---
        batting_agg = BattingInnings.objects.filter(player=player).aggregate(
            batting_matches=Count("id"),
            total_runs=Sum("runs_scored"),
            total_balls_faced=Sum("balls_faced"),
            total_fours=Sum("fours"),
            total_sixes=Sum("sixes"),
        )
        # Fill nulls with 0
        for key in batting_agg:
            if batting_agg[key] is None:
                batting_agg[key] = 0

        # Batting average = total_runs / dismissals (excluding NOT_OUT)
        dismissals = BattingInnings.objects.filter(
            player=player,
        ).exclude(
            dismissal=BattingInnings.DismissalType.NOT_OUT,
        ).count()
        batting_avg = (
            round(batting_agg["total_runs"] / dismissals, 2)
            if dismissals > 0
            else 0.0
        )

        # Strike rate = (total_runs / total_balls_faced) * 100
        career_sr = (
            round(
                (batting_agg["total_runs"] / batting_agg["total_balls_faced"]) * 100, 2
            )
            if batting_agg["total_balls_faced"] > 0
            else 0.0
        )

        # --- Bowling aggregates ---
        bowling_agg = BowlingInnings.objects.filter(player=player).aggregate(
            bowling_matches=Count("id"),
            total_wickets=Sum("wickets"),
            total_runs_conceded=Sum("runs_conceded"),
            total_overs_bowled=Sum("overs_bowled"),
            total_maidens=Sum("maidens"),
        )
        for key in bowling_agg:
            if bowling_agg[key] is None:
                bowling_agg[key] = 0

        total_overs = float(bowling_agg["total_overs_bowled"])
        bowling_economy = (
            round(bowling_agg["total_runs_conceded"] / total_overs, 2)
            if total_overs > 0
            else 0.0
        )

        payload = {
            "player_id": player.id,
            "full_name": f"{player.first_name} {player.last_name}",
            # Batting
            "batting_matches": batting_agg["batting_matches"],
            "total_runs": batting_agg["total_runs"],
            "total_balls_faced": batting_agg["total_balls_faced"],
            "total_fours": batting_agg["total_fours"],
            "total_sixes": batting_agg["total_sixes"],
            "batting_average": batting_avg,
            "career_strike_rate": career_sr,
            # Bowling
            "bowling_matches": bowling_agg["bowling_matches"],
            "total_wickets": bowling_agg["total_wickets"],
            "total_runs_conceded": bowling_agg["total_runs_conceded"],
            "total_overs_bowled": total_overs,
            "total_maidens": bowling_agg["total_maidens"],
            "bowling_economy": bowling_economy,
        }

        serializer = PlayerStatsSerializer(payload)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Tournament & Group
# ---------------------------------------------------------------------------

class TournamentViewSet(viewsets.ModelViewSet):
    """CRUD for tournaments."""

    queryset = Tournament.objects.prefetch_related("groups__teams").all()
    serializer_class = TournamentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = "id"

    @action(detail=True, methods=["get"], url_path="leaderboards")
    def leaderboards(self, request, id=None):
        """
        GET /api/tournaments/<id>/leaderboards/?group=<group_id>
        Returns comprehensive tournament leaderboards, caps, awards, and highlights.
        """
        tournament = self.get_object()
        group_id = request.query_params.get("group")
        data = calculate_tournament_leaderboards(tournament.id, group_id=group_id)
        return Response(data)


class GroupViewSet(viewsets.ModelViewSet):
    """CRUD for tournament groups + points table standings endpoint."""

    queryset = Group.objects.select_related("tournament").prefetch_related("teams").all()
    serializer_class = GroupSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = "id"

    def get_queryset(self):
        qs = super().get_queryset()
        tournament_id = self.request.query_params.get("tournament")
        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)
        return qs

    @action(detail=True, methods=["get"], url_path="standings")
    def standings(self, request, id=None):
        """
        GET /api/groups/<id>/standings/
        Calls calculate_group_standings and returns the ordered points table array.
        """
        group = self.get_object()
        standings_data = calculate_group_standings(group.id)
        return Response(standings_data)

    @action(detail=True, methods=["post"], url_path="assign-teams")
    def assign_teams(self, request, id=None):
        """
        POST /api/groups/<id>/assign-teams/
        Payload: {"team_ids": ["uuid1", "uuid2", ...]}
        """
        group = self.get_object()
        team_ids = request.data.get("team_ids", [])
        group.teams.set(team_ids)
        serializer = self.get_serializer(group)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Match
# ---------------------------------------------------------------------------

class MatchViewSet(viewsets.ModelViewSet):
    """CRUD for matches."""

    queryset = Match.objects.select_related(
        "tournament", "group", "batting_team", "bowling_team", "winner"
    )
    serializer_class = MatchSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = "id"
    filterset_fields = ["status", "batting_team", "bowling_team", "tournament", "group"]


# ---------------------------------------------------------------------------
# Innings stats
# ---------------------------------------------------------------------------

class BattingInningsViewSet(viewsets.ModelViewSet):
    """CRUD for batting innings records."""

    queryset = BattingInnings.objects.select_related("match", "player")
    serializer_class = BattingInningsSerializer
    lookup_field = "id"
    filterset_fields = ["match", "player", "innings_number"]


class BowlingInningsViewSet(viewsets.ModelViewSet):
    """CRUD for bowling innings records."""

    queryset = BowlingInnings.objects.select_related("match", "player")
    serializer_class = BowlingInningsSerializer
    lookup_field = "id"
    filterset_fields = ["match", "player", "innings_number"]


# ---------------------------------------------------------------------------
# Ball
# ---------------------------------------------------------------------------

class BallViewSet(viewsets.ModelViewSet):
    """CRUD for ball-by-ball delivery logs."""

    queryset = Ball.objects.select_related("match", "batsman", "bowler")
    serializer_class = BallSerializer
    lookup_field = "id"
    filterset_fields = ["match", "innings", "over", "batsman", "bowler"]


# ---------------------------------------------------------------------------
# Server-Sent Events (SSE) Real-Time Data Pipeline
# ---------------------------------------------------------------------------

class MatchEventHub:
    """Thread-safe pub/sub hub to broadcast match state updates to SSE clients with match_id scoping."""

    def __init__(self):
        self._lock = threading.Lock()
        self._subscribers = {}  # queue.Queue -> normalized target match_id (or None for global)

    def subscribe(self, match_id=None):
        q = queue.Queue(maxsize=100)
        norm_id = str(match_id).replace("-", "").lower() if match_id else None
        with self._lock:
            self._subscribers[q] = norm_id
        return q

    def unsubscribe(self, q):
        with self._lock:
            self._subscribers.pop(q, None)

    def notify(self, data=None, match_id=None):
        norm_id = str(match_id).replace("-", "").lower() if match_id else None
        if not norm_id and isinstance(data, dict) and data.get("match_id"):
            norm_id = str(data["match_id"]).replace("-", "").lower()

        with self._lock:
            for q, sub_match_id in list(self._subscribers.items()):
                # Notify if subscriber listens globally (sub_match_id is None)
                # OR if the event's match_id matches the subscriber's requested match_id
                if sub_match_id is None or norm_id is None or sub_match_id == norm_id:
                    try:
                        q.put_nowait(data)
                    except queue.Full:
                        pass

match_event_hub = MatchEventHub()


@receiver(post_save, sender=Match)
def on_match_saved(sender, instance, **kwargs):
    """Notify relevant SSE clients whenever a Match record is updated in the database."""
    mid = str(instance.id)
    if instance.current_innings_state:
        st = copy.deepcopy(instance.current_innings_state)
        st["match_id"] = mid
        match_event_hub.notify(st, match_id=mid)
    else:
        match_event_hub.notify({"match_id": mid}, match_id=mid)


@receiver(post_save, sender=Ball)
def on_ball_saved(sender, instance, **kwargs):
    """Notify relevant SSE clients whenever a Ball record is logged."""
    if instance.match and instance.match.current_innings_state:
        mid = str(instance.match.id)
        st = copy.deepcopy(instance.match.current_innings_state)
        st["match_id"] = mid
        match_event_hub.notify(st, match_id=mid)


def get_current_match_state(match_id=None):
    """Retrieve the latest or requested match state from the database."""
    try:
        m = None
        if match_id:
            raw_id = str(match_id).replace("-", "")
            try:
                parsed_uuid = uuid.UUID(hex=raw_id)
                m = Match.objects.filter(id=parsed_uuid).first()
            except Exception:
                pass
            if not m:
                m = Match.objects.filter(id=match_id).first()
        else:
            m = Match.objects.filter(status=Match.Status.LIVE).order_by("-updated_at").first()
            if not m:
                m = Match.objects.order_by("-updated_at").first()
        if m and m.current_innings_state:
            st = copy.deepcopy(m.current_innings_state)
            st["match_id"] = str(m.id)
            return st
    except Exception as e:
        print("[get_current_match_state] Error:", e)
    return None


def stream_match_state(request):
    """
    StreamingHttpResponse endpoint for Server-Sent Events (SSE).
    GET /api/stream/?match_id=<id>
    Yields the JSON match state whenever the requested match is updated.
    """
    match_id = request.GET.get("match_id")
    norm_mid = str(match_id).replace("-", "").lower() if match_id else None

    def event_stream():
        q = match_event_hub.subscribe(match_id=match_id)
        last_sent_json = None
        last_ping = time.time()

        try:
            # 1. Immediately yield the current database state upon connection
            initial_state = get_current_match_state(match_id)
            if initial_state:
                raw_json = json.dumps(initial_state)
                last_sent_json = raw_json
                yield f"data: {raw_json}\n\n"

            while True:
                state_to_send = None
                try:
                    # Wait for in-process DB update signal (timeout 0.25s)
                    notified_data = q.get(timeout=0.25)
                    if notified_data:
                        event_mid = str(notified_data.get("match_id", "")).replace("-", "").lower()
                        if not norm_mid or event_mid == norm_mid:
                            state_to_send = notified_data
                        else:
                            state_to_send = get_current_match_state(match_id)
                    else:
                        state_to_send = get_current_match_state(match_id)
                except queue.Empty:
                    # Timeout: Check database to detect direct/external SQLite updates
                    state_to_send = get_current_match_state(match_id)

                if state_to_send is not None:
                    raw_json = json.dumps(state_to_send)
                    if raw_json != last_sent_json:
                        last_sent_json = raw_json
                        yield f"data: {raw_json}\n\n"

                # Keep-alive heartbeat every 15s to keep the SSE connection alive
                now = time.time()
                if now - last_ping >= 15:
                    last_ping = now
                    yield ": keep-alive\n\n"

        except GeneratorExit:
            pass
        finally:
            match_event_hub.unsubscribe(q)

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream"
    )
    response["Cache-Control"] = "no-cache, no-transform"
    response["X-Accel-Buffering"] = "no"
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Headers"] = "*"
    return response


@api_view(["POST", "GET"])
@permission_classes([AllowAny])
def match_state_api(request):
    """
    GET: Retrieve match state by match_id or latest live match.
    POST: Update or create match state scoped to match_id.
    """
    if request.method == "GET":
        match_id = request.GET.get("match_id")
        state = get_current_match_state(match_id)
        return Response(state or {})

    state_payload = request.data
    if not isinstance(state_payload, dict):
        return Response({"error": "Payload must be a JSON object"}, status=status.HTTP_400_BAD_REQUEST)

    match_id = state_payload.get("match_id") or request.GET.get("match_id")
    match = None

    if match_id:
        raw_id = str(match_id).replace("-", "")
        try:
            parsed_uuid = uuid.UUID(hex=raw_id)
            match = Match.objects.filter(id=parsed_uuid).first()
        except Exception:
            pass
        if not match:
            match = Match.objects.filter(id=match_id).first()

    # Fallback to current live match only if caller did NOT supply an explicit match_id
    if not match and not match_id:
        match = Match.objects.filter(status=Match.Status.LIVE).order_by("-updated_at").first()

    if not match:
        bat_team_id = state_payload.get("batting_team_id")
        bowl_team_id = state_payload.get("bowling_team_id")
        bat_team = Team.objects.filter(id=bat_team_id).first() if bat_team_id else Team.objects.first()
        bowl_team = Team.objects.filter(id=bowl_team_id).first() if bowl_team_id else Team.objects.last()

        if not bat_team:
            bat_team = Team.objects.create(name=state_payload.get("team_1_name") or "Team 1", theme_color="#ff007f")
        if not bowl_team or bowl_team.id == bat_team.id:
            bowl_team = Team.objects.create(name=state_payload.get("team_2_name") or "Team 2", theme_color="#dc2626")

        match_kwargs = {
            "batting_team": bat_team,
            "bowling_team": bowl_team,
            "status": Match.Status.LIVE,
            "current_innings_state": state_payload,
            "tournament_id": state_payload.get("tournament_id"),
            "group_id": state_payload.get("group_id"),
        }
        if match_id:
            try:
                match_kwargs["id"] = uuid.UUID(hex=str(match_id).replace("-", ""))
            except Exception:
                pass
        match = Match.objects.create(**match_kwargs)
    else:
        if state_payload.get("tournament_id"):
            match.tournament_id = state_payload.get("tournament_id")
        if state_payload.get("group_id"):
            match.group_id = state_payload.get("group_id")
        if state_payload.get("winner_id"):
            match.winner_id = state_payload.get("winner_id")
        if state_payload.get("result_status"):
            match.result_status = state_payload.get("result_status")
        if state_payload.get("match_over"):
            match.status = Match.Status.COMPLETED
        else:
            match.status = Match.Status.LIVE

    canonical_mid = str(match.id)
    state_payload["match_id"] = canonical_mid
    match.current_innings_state = state_payload
    match.save()

    return Response({
        "status": "success",
        "match_id": canonical_mid,
        "match_status": match.status,
        "state": state_payload
    })
