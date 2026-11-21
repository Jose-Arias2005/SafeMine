"""
SafeMine AI - Hardware Bridge Bidireccional (WebSocket <-> Arduino Serial)
-------------------------------------------------------------------------
1. Escucha eventos en tiempo real desde el backend FastAPI (ws://localhost:8000/ws/kiosco)
   y envía la señal física por Puerto Serial al Arduino UNO:
     - status == "VERDE" -> Envía 'V' (Enciende LED Verde en Pin 8 por 4 s)
     - status == "ROJO"  -> Envía 'R' (Parpadea LED Rojo + Buzzer en Pin 9)
     - status == "IDLE" / "OFF" -> Envía 'O' (Apaga actuadores)

2. Lee continuamente la telemetría emitida por el Arduino (HC-SR04 + DHT11)
   sin bloquear el event loop y reenvía los paquetes "TELEMETRY" al WebSocket
   agregando `"event": "HARDWARE_TELEMETRY"`.
   Si no hay Arduino físico conectado, emite telemetría simulada cada 2 segundos.

Uso:
  python arduino_bridge.py --port COM3 --ws ws://localhost:8000/ws/kiosco
"""

import argparse
import asyncio
import json
import math
import os
import sys
import time

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    serial = None

import websockets


def open_serial_connection(port: str, baudrate: int = 9600):
    if serial is None:
        print("[WARN] pyserial no está instalado. Ejecutando en modo simulación de hardware.")
        return None

    try:
        ser = serial.Serial(port, baudrate, timeout=1)
        time.sleep(2)  # Esperar reinicio del Arduino al abrir puerto serial
        print(f"[OK] Conectado exitosamente al Arduino en {port} ({baudrate} baud)")
        return ser
    except Exception as exc:
        print(f"[MODO SIMULACIÓN] No se pudo abrir el puerto {port} ({exc}).")
        ports = [p.device for p in serial.tools.list_ports.comports()]
        if ports:
            print(f"[INFO] Puertos COM detectados en el sistema: {', '.join(ports)}")
        else:
            print("[INFO] Ningún Arduino físico detectado por USB. Se simularán actuadores y telemetría.")
        return None


def trigger_hardware(ser, status: str, worker_name: str = "", missing: list = None):
    missing = missing or []
    if status == "VERDE":
        cmd = b"V"
        print("\n" + "=" * 65)
        print("🟢 [ARDUINO PIN 8 -> HIGH] FOCO VERDE ENCENDIDO | ACCESO CONCEDIDO")
        print(f"   Trabajador: {worker_name}")
        print("=" * 65)
    elif status == "ROJO":
        cmd = b"R"
        print("\n" + "=" * 65)
        print("🔴 [ARDUINO PIN 9 -> HIGH] FOCO ROJO + BUZZER | ACCESO DENEGADO")
        print(f"   Trabajador: {worker_name}")
        if missing:
            print(f"   EPPs Faltantes: {', '.join(missing)}")
        print("=" * 65)
    else:
        cmd = b"O"

    if ser and ser.is_open:
        try:
            ser.write(cmd)
            ser.flush()
        except Exception as exc:
            print(f"[ERROR SERIAL] Error enviando comando al Arduino: {exc}")


async def listen_ws_commands(websocket, ser):
    async for message in websocket:
        try:
            data = json.loads(message)
        except json.JSONDecodeError:
            continue

        status = data.get("status")
        if status in ("VERDE", "ROJO"):
            worker_name = data.get("worker_name", f"ID #{data.get('worker_id', '?')}")
            missing = data.get("missing_epps") or data.get("faltante", [])
            trigger_hardware(ser, status, worker_name, missing)
        elif status in ("IDLE", "OFF"):
            trigger_hardware(ser, "O")


async def read_serial_and_forward(websocket, ser):
    if ser and ser.is_open:
        while True:
            try:
                raw_line = await asyncio.to_thread(ser.readline)
            except Exception as exc:
                print(f"[ERROR SERIAL] Fallo leyendo del Arduino: {exc}")
                await asyncio.sleep(1)
                continue

            if not raw_line:
                continue

            line = raw_line.decode("utf-8", errors="ignore").strip()
            if not line:
                continue

            if line.startswith("{"):
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    continue

                if isinstance(payload, dict) and payload.get("type") == "TELEMETRY":
                    payload["event"] = "HARDWARE_TELEMETRY"
                    await websocket.send(json.dumps(payload, ensure_ascii=False))
            else:
                print(f"[ARDUINO] {line}")
    else:
        # Modo simulación cuando no hay hardware físico conectado
        tick = 0
        while True:
            distancia = round(42.0 + 35.0 * math.sin(tick * 0.6), 1)
            presencia = 2.0 < distancia <= 80.0
            temperatura = round(22.4 + 0.6 * math.sin(tick * 0.25), 1)
            humedad = round(56.0 + 2.0 * math.cos(tick * 0.2), 1)
            sim_payload = {
                "type": "TELEMETRY",
                "event": "HARDWARE_TELEMETRY",
                "distancia_cm": distancia,
                "presencia": presencia,
                "temperatura_c": temperatura,
                "humedad_pct": humedad,
                "simulated": True,
            }
            await websocket.send(json.dumps(sim_payload, ensure_ascii=False))
            tick += 1
            await asyncio.sleep(2.0)


async def listen_kiosco_ws(ws_url: str, ser):
    while True:
        try:
            print(f"[WS] Conectando al servidor SafeMine AI en {ws_url} ...")
            async with websockets.connect(ws_url) as websocket:
                print("[WS] Conectado. Escuchando comandos de garita y reenviando telemetría...")
                await websocket.send(json.dumps({"client": "arduino_bridge", "status": "ONLINE"}))

                ws_task = asyncio.create_task(listen_ws_commands(websocket, ser))
                serial_task = asyncio.create_task(read_serial_and_forward(websocket, ser))

                done, pending = await asyncio.wait(
                    {ws_task, serial_task},
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for task in pending:
                    task.cancel()
                await asyncio.gather(*pending, return_exceptions=True)

                for task in done:
                    exc = task.exception()
                    if exc:
                        raise exc
        except (websockets.ConnectionClosed, ConnectionRefusedError, OSError) as exc:
            print(f"[WS] Conexión perdida o servidor no disponible ({exc}). Reintentando en 3 segundos...")
            await asyncio.sleep(3)


def main():
    parser = argparse.ArgumentParser(description="SafeMine AI - Puente WebSocket a Arduino Serial")
    parser.add_argument(
        "--port",
        default=os.getenv("ARDUINO_PORT", "/dev/cu.usbmodem11301"),
        help="Puerto Serial del Arduino (ej. COM3 o /dev/ttyUSB0)",
    )
    parser.add_argument("--baud", type=int, default=9600, help="Velocidad en baudios (por defecto 9600)")
    parser.add_argument(
        "--ws",
        default=os.getenv("SAFEMINE_WS_URL", "ws://localhost:8000/ws/kiosco"),
        help="URL del WebSocket del backend",
    )
    args = parser.parse_args()

    ser = open_serial_connection(args.port, args.baud)
    try:
        asyncio.run(listen_kiosco_ws(args.ws, ser))
    except KeyboardInterrupt:
        print("\n[INFO] Cerrando puente de hardware SafeMine AI...")
        if ser and ser.is_open:
            ser.write(b"O")
            ser.close()
        sys.exit(0)


if __name__ == "__main__":
    main()
