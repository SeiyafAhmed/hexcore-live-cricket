import json
from channels.generic.websocket import AsyncWebsocketConsumer

class MatchStateConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = 'broadcast_graphics'
        
        # Join room group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Receive message from WebSocket (useful if clients can also send updates)
    async def receive(self, text_data):
        try:
            state_data = json.loads(text_data)
            
            # Broadcast the exact JSON payload to the group
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'match_state_update',
                    'payload': state_data
                }
            )
        except json.JSONDecodeError:
            pass

    # Receive message from room group
    async def match_state_update(self, event):
        payload = event['payload']

        # Send message to WebSocket
        await self.send(text_data=json.dumps(payload))
