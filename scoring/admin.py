"""Admin registrations for the scoring app."""

from django.contrib import admin

from .models import Ball, BattingInnings, BowlingInnings, Match, Player, Team


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "theme_color", "created_at")
    search_fields = ("name",)


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "jersey_number", "role", "team")
    list_filter = ("role", "team")
    search_fields = ("first_name", "last_name")


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ("batting_team", "bowling_team", "status", "started_at")
    list_filter = ("status",)


@admin.register(BattingInnings)
class BattingInningsAdmin(admin.ModelAdmin):
    list_display = ("player", "match", "runs_scored", "balls_faced", "dismissal")
    list_filter = ("dismissal", "innings_number")


@admin.register(BowlingInnings)
class BowlingInningsAdmin(admin.ModelAdmin):
    list_display = ("player", "match", "overs_bowled", "wickets", "runs_conceded")
    list_filter = ("innings_number",)


@admin.register(Ball)
class BallAdmin(admin.ModelAdmin):
    list_display = ("match", "innings", "over", "ball_number", "batsman", "bowler", "runs")
    list_filter = ("innings", "extra_type", "is_wicket")
