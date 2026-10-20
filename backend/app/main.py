import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.controllers import (
    auth_controller,
    kiosco_controller,
    minera_controller,
    proveedor_controller,
    trabajador_controller,
)
from app.core.config import settings
from app.core.ws_manager import ws_manager
from app.db.base import Base
from app.db.seed import seed_database
from app.db.session import SessionLocal, engine
import app.models  # noqa: F401 - Registra los modelos ORM en Base.metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="SafeMine AI — API Backend (Layered Architecture)",
    description=(
        "Plataforma Integral de Acreditación Minera, Validación Documental con IA (Google Gemini) "
        "y Control de Acceso Físico mediante Detección de EPPs en Tiempo Real (AWS Rekognition + Arduino)."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(auth_controller.router)
app.include_router(minera_controller.router)
app.include_router(proveedor_controller.router)
app.include_router(trabajador_controller.router)
app.include_router(kiosco_controller.router)


@app.get("/api/status")
def system_status():
    return {
        "service": "SafeMine AI Backend",
        "status": "ONLINE",
        "architecture": "Controller-Service-Repository-DB",
        "gemini_model": settings.GEMINI_MODEL,
        "gemini_mode": "REAL_CLOUD" if settings.has_real_gemini_key else "SIMULATION_READY",
        "aws_mode": "REAL_CLOUD" if settings.has_real_aws_keys else "SIMULATION_READY",
        "active_ws_clients": len(ws_manager.active_connections),
    }


@app.websocket("/ws/kiosco")
async def websocket_kiosco_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        if ws_manager.last_gate_event:
            await websocket.send_json(ws_manager.last_gate_event)
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
