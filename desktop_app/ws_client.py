"""
Deprecated: WebSocketManager has been replaced by StateSyncManager (SSE & database persistence).
This module re-exports state_manager as ws_manager for backwards compatibility.
"""
from state_client import state_manager, ws_manager, StateSyncManager

# Keep WebSocketManager as an alias class for backward compatibility
WebSocketManager = StateSyncManager
