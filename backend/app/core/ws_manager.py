import json
from typing import Any, Dict, List, Optional
from fastapi import WebSocket


class ConnectionManager:
    """
    Gestor central de conexiones WebSocket (/ws/kiosco).
    Sincroniza en tiempo real el Kiosco de Garita, el Portal de la Minera y el puente Arduino.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.last_scanned_worker: Optional[Dict[str, Any]] = None
        self.last_gate_event: Optional[Dict[str, Any]] = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, payload: Dict[str, Any]):
        self.last_gate_event = payload
        message = json.dumps(payload, ensure_ascii=False)
        stale_connections: List[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                stale_connections.append(connection)

        for stale in stale_connections:
            self.disconnect(stale)


ws_manager = ConnectionManager()
