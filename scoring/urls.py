"""
URL configuration for the scoring app.

Registered under ``/api/`` by the project-level urls.py.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"teams", views.TeamViewSet, basename="team")
router.register(r"players", views.PlayerViewSet, basename="player")
router.register(r"matches", views.MatchViewSet, basename="match")
router.register(r"batting-innings", views.BattingInningsViewSet, basename="battinginnings")
router.register(r"bowling-innings", views.BowlingInningsViewSet, basename="bowlinginnings")
router.register(r"balls", views.BallViewSet, basename="ball")

urlpatterns = [
    path("", include(router.urls)),
]
