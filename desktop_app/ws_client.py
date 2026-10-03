import json
import threading
import websocket
import time

class WebSocketManager(threading.Thread):
    def __init__(self, url="ws://127.0.0.1:8000/ws/match-state/"):
        super().__init__()
        self.url = url
        self.ws = None
        self.running = True
        self.queue = []
        self.lock = threading.Lock()
        self.daemon = True

    def run(self):
        while self.running:
            try:
                if not self.ws:
                    self.ws = websocket.create_connection(self.url, timeout=2)
                
                payload = None
                with self.lock:
                    if self.queue:
                        payload = self.queue.pop(0)

                if payload:
                    self.ws.send(json.dumps(payload))
                else:
                    time.sleep(0.1) # sleep 100ms
            except Exception as e:
                # Connection failed or dropped
                print(f"WS Error: {e}")
                if self.ws:
                    try:
                        self.ws.close()
                    except:
                        pass
                    self.ws = None
                time.sleep(1.0) # Wait before retry

    def send_state(self, state):
        with self.lock:
            self.queue.append(state)

    def stop(self):
        self.running = False
        if self.ws:
            self.ws.close()

# Singleton instance to be used across the app
ws_manager = WebSocketManager()
