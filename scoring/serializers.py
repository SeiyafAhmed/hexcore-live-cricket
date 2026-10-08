"""
DRF serializers for the scoring app.

All serializers that handle ImageField use MultiPartParser-compatible
fields, so image uploads work with multipart/form-data requests.
"""

from rest_framework import serializers

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


# ---------------------------------------------------------------------------
# Team
# ---------------------------------------------------------------------------

class TeamSerializer(serializers.ModelSerializer):
    player_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Team
        fields = [
            "id",
            "name",
            "logo",
            "theme_color",
            "player_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Player
# ---------------------------------------------------------------------------

class PlayerSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.name", read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "jersey_number",
            "image",
            "role",
            "team",
            "team_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class PlayerStatsSerializer(serializers.Serializer):
    """Read-only serializer returned by the /api/players/<id>/stats/ endpoint."""

    # Identity
    player_id = serializers.UUIDField()
    full_name = serializers.CharField()

    # Batting career totals
    batting_matches = serializers.IntegerField()
    total_runs = serializers.IntegerField()
    total_balls_faced = serializers.IntegerField()
    total_fours = serializers.IntegerField()
    total_sixes = serializers.IntegerField()
    batting_average = serializers.FloatField()
    career_strike_rate = serializers.FloatField()

    # Bowling career totals
    bowling_matches = serializers.IntegerField()
    total_wickets = serializers.IntegerField()
    total_runs_conceded = serializers.IntegerField()
    total_overs_bowled = serializers.FloatField()
    total_maidens = serializers.IntegerField()
    bowling_economy = serializers.FloatField()


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Tournament & Group
# ---------------------------------------------------------------------------

class GroupSerializer(serializers.ModelSerializer):
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)
    team_details = TeamSerializer(source="teams", many=True, read_only=True)
    team_count = serializers.IntegerField(source="teams.count", read_only=True)

    class Meta:
        model = Group
        fields = [
            "id",
            "tournament",
            "tournament_name",
            "name",
            "teams",
            "team_details",
            "team_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TournamentSerializer(serializers.ModelSerializer):
    groups = GroupSerializer(many=True, read_only=True)
    group_count = serializers.IntegerField(source="groups.count", read_only=True)
    match_count = serializers.IntegerField(source="matches.count", read_only=True)

    class Meta:
        model = Tournament
        fields = [
            "id",
            "name",
            "season",
            "max_overs",
            "groups",
            "group_count",
            "match_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Match
# ---------------------------------------------------------------------------

class MatchSerializer(serializers.ModelSerializer):
    batting_team_name = serializers.CharField(
        source="batting_team.name", read_only=True
    )
    bowling_team_name = serializers.CharField(
        source="bowling_team.name", read_only=True
    )
    tournament_name = serializers.CharField(
        source="tournament.name", read_only=True
    )
    group_name = serializers.CharField(
        source="group.name", read_only=True
    )
    winner_name = serializers.CharField(
        source="winner.name", read_only=True
    )

    class Meta:
        model = Match
        fields = [
            "id",
            "tournament",
            "tournament_name",
            "group",
            "group_name",
            "batting_team",
            "batting_team_name",
            "bowling_team",
            "bowling_team_name",
            "winner",
            "winner_name",
            "result_status",
            "status",
            "current_innings_state",
            "started_at",
            "ended_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Innings stats
# ---------------------------------------------------------------------------

class BattingInningsSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source="player.__str__", read_only=True)
    strike_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = BattingInnings
        fields = [
            "id",
            "match",
            "player",
            "player_name",
            "runs_scored",
            "balls_faced",
            "fours",
            "sixes",
            "dismissal",
            "innings_number",
            "strike_rate",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class BowlingInningsSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source="player.__str__", read_only=True)
    economy_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = BowlingInnings
        fields = [
            "id",
            "match",
            "player",
            "player_name",
            "overs_bowled",
            "runs_conceded",
            "wickets",
            "maidens",
            "wides",
            "no_balls",
            "innings_number",
            "economy_rate",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Ball
# ---------------------------------------------------------------------------

class BallSerializer(serializers.ModelSerializer):
    batsman_name = serializers.CharField(source="batsman.__str__", read_only=True)
    bowler_name = serializers.CharField(source="bowler.__str__", read_only=True)

    class Meta:
        model = Ball
        fields = [
            "id",
            "match",
            "innings",
            "over",
            "ball_number",
            "batsman",
            "batsman_name",
            "bowler",
            "bowler_name",
            "runs",
            "extras",
            "extra_type",
            "is_wicket",
            "wagon_angle",
            "wagon_distance",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
