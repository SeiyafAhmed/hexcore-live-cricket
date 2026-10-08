"""
Models for the cricket scoring system.

Hierarchy:
    Team → Player (FK)
    Match → BattingInnings, BowlingInnings, Ball (FKs)
    Player → BattingInnings, BowlingInnings, Ball (FKs)
"""

import uuid

from django.core.validators import (
    MaxValueValidator,
    MinLengthValidator,
    MinValueValidator,
    RegexValidator,
)
from django.db import models


# ---------------------------------------------------------------------------
# Team & Player
# ---------------------------------------------------------------------------

class Team(models.Model):
    """A cricket team."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    logo = models.ImageField(upload_to="teams/logos/", blank=True, null=True)
    theme_color = models.CharField(
        max_length=7,
        default="#000000",
        validators=[
            RegexValidator(
                regex=r"^#[0-9A-Fa-f]{6}$",
                message="Enter a valid hex colour (e.g. #1A2B3C).",
            ),
        ],
        help_text="Hex colour code, e.g. #FF5733",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Player(models.Model):
    """A player belonging to a team."""

    class Role(models.TextChoices):
        BATSMAN = "BAT", "Batsman"
        BOWLER = "BOWL", "Bowler"
        ALL_ROUNDER = "AR", "All-Rounder"
        WICKET_KEEPER = "WK", "Wicket Keeper"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=60)
    last_name = models.CharField(max_length=60)
    jersey_number = models.PositiveSmallIntegerField(
        validators=[MaxValueValidator(999)],
    )
    image = models.ImageField(upload_to="players/images/", blank=True, null=True)
    role = models.CharField(
        max_length=4,
        choices=Role.choices,
        default=Role.BATSMAN,
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="players",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["team", "jersey_number"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} (#{self.jersey_number})"


# ---------------------------------------------------------------------------
# Tournament & Group
# ---------------------------------------------------------------------------

class Tournament(models.Model):
    """A cricket tournament comprising multiple groups and matches."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    season = models.CharField(max_length=50, blank=True, default="")
    max_overs = models.PositiveSmallIntegerField(
        default=20,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Default overs per innings for matches in this tournament.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.season})" if self.season else self.name


class Group(models.Model):
    """A tournament group or pool containing participating teams."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name="groups",
    )
    name = models.CharField(max_length=100)
    teams = models.ManyToManyField(
        Team,
        related_name="groups",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["tournament", "name"]
        unique_together = [("tournament", "name")]

    def __str__(self):
        return f"{self.tournament.name} - {self.name}"


# ---------------------------------------------------------------------------
# Match
# ---------------------------------------------------------------------------

class Match(models.Model):
    """A cricket match between two teams."""

    class Status(models.TextChoices):
        UPCOMING = "UPCOMING", "Upcoming"
        LIVE = "LIVE", "Live"
        COMPLETED = "COMPLETED", "Completed"
        ABANDONED = "ABANDONED", "Abandoned"

    class ResultStatus(models.TextChoices):
        COMPLETED = "COMPLETED", "Completed"
        NO_RESULT = "NO_RESULT", "No Result"
        TIED = "TIED", "Tied"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches",
    )
    group = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches",
    )
    batting_team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="matches_batting",
    )
    bowling_team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="matches_bowling",
    )
    winner = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches_won",
    )
    result_status = models.CharField(
        max_length=20,
        choices=ResultStatus.choices,
        default=ResultStatus.COMPLETED,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.UPCOMING,
    )
    current_innings_state = models.JSONField(
        default=dict,
        blank=True,
        help_text="Live scoring state for the current innings (runs, wickets, overs, …).",
    )
    started_at = models.DateTimeField(blank=True, null=True)
    ended_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "matches"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.batting_team} vs {self.bowling_team}"


# ---------------------------------------------------------------------------
# Innings stats (permanent records)
# ---------------------------------------------------------------------------

class BattingInnings(models.Model):
    """Permanent batting statistics for a player in a match."""

    class DismissalType(models.TextChoices):
        NOT_OUT = "NOT_OUT", "Not Out"
        BOWLED = "BOWLED", "Bowled"
        CAUGHT = "CAUGHT", "Caught"
        LBW = "LBW", "LBW"
        RUN_OUT = "RUN_OUT", "Run Out"
        STUMPED = "STUMPED", "Stumped"
        HIT_WICKET = "HIT_WICKET", "Hit Wicket"
        RETIRED = "RETIRED", "Retired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="batting_innings",
    )
    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name="batting_innings",
    )
    runs_scored = models.PositiveIntegerField(default=0)
    balls_faced = models.PositiveIntegerField(default=0)
    fours = models.PositiveIntegerField(default=0)
    sixes = models.PositiveIntegerField(default=0)
    dismissal = models.CharField(
        max_length=10,
        choices=DismissalType.choices,
        default=DismissalType.NOT_OUT,
    )
    innings_number = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "batting innings"
        unique_together = [("match", "player", "innings_number")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.player} – {self.runs_scored}({self.balls_faced})"

    @property
    def strike_rate(self):
        if self.balls_faced == 0:
            return 0.0
        return round((self.runs_scored / self.balls_faced) * 100, 2)


class BowlingInnings(models.Model):
    """Permanent bowling statistics for a player in a match."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="bowling_innings",
    )
    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name="bowling_innings",
    )
    overs_bowled = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=0,
        help_text="Overs bowled (e.g. 4.3 means 4 overs and 3 balls).",
    )
    runs_conceded = models.PositiveIntegerField(default=0)
    wickets = models.PositiveIntegerField(default=0)
    maidens = models.PositiveIntegerField(default=0)
    wides = models.PositiveIntegerField(default=0)
    no_balls = models.PositiveIntegerField(default=0)
    innings_number = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "bowling innings"
        unique_together = [("match", "player", "innings_number")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.player} – {self.wickets}/{self.runs_conceded}"

    @property
    def economy_rate(self):
        overs = float(self.overs_bowled)
        if overs == 0:
            return 0.0
        return round(self.runs_conceded / overs, 2)


# ---------------------------------------------------------------------------
# Ball-by-ball log
# ---------------------------------------------------------------------------

class Ball(models.Model):
    """Individual delivery in a match."""

    class ExtraType(models.TextChoices):
        NONE = "NONE", "None"
        WIDE = "WIDE", "Wide"
        NO_BALL = "NO_BALL", "No Ball"
        BYE = "BYE", "Bye"
        LEG_BYE = "LB", "Leg Bye"
        PENALTY = "PEN", "Penalty"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="balls",
    )
    innings = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        help_text="Which innings this delivery belongs to (1-4).",
    )
    over = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(99)],
    )
    ball_number = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        help_text="Ball number within the over (can exceed 6 with extras).",
    )
    batsman = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name="balls_faced",
    )
    bowler = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name="balls_bowled",
    )
    runs = models.PositiveSmallIntegerField(default=0)
    extras = models.PositiveSmallIntegerField(default=0)
    extra_type = models.CharField(
        max_length=7,
        choices=ExtraType.choices,
        default=ExtraType.NONE,
    )
    is_wicket = models.BooleanField(default=False)

    # Wagon-wheel data (nullable – only populated when wagon tracking is on)
    wagon_angle = models.FloatField(
        blank=True,
        null=True,
        help_text="Shot angle in degrees (0-360) for wagon wheel.",
    )
    wagon_distance = models.FloatField(
        blank=True,
        null=True,
        help_text="Shot distance in metres for wagon wheel.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["match", "innings", "over", "ball_number"]

    def __str__(self):
        return f"Over {self.over}.{self.ball_number} – {self.runs} run(s)"
