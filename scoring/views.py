"""
DRF viewsets for the scoring app.

All viewsets use MultiPartParser + FormParser so that image uploads
are accepted via multipart/form-data alongside JSON payloads.
"""

from django.db.models import Avg, Count, Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Ball, BattingInnings, BowlingInnings, Match, Player, Team
from .serializers import (
    BallSerializer,
    BattingInningsSerializer,
    BowlingInningsSerializer,
    MatchSerializer,
    PlayerSerializer,
    PlayerStatsSerializer,
    TeamSerializer,
)


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
# Match
# ---------------------------------------------------------------------------

class MatchViewSet(viewsets.ModelViewSet):
    """CRUD for matches."""

    queryset = Match.objects.select_related("batting_team", "bowling_team")
    serializer_class = MatchSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = "id"
    filterset_fields = ["status", "batting_team", "bowling_team"]


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
