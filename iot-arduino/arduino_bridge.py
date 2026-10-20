"""
SafeMine AI - Hardware Bridge (Python WebSocket Client -> Arduino Serial)
-------------------------------------------------------------------------
Escucha eventos en tiempo real desde el backend FastAPI (ws://localhost:8000/ws/kiosco)
y envía la señal física por Puerto Serial al Arduino UNO / ESP32:
  - status == "VERDE" -> Envía 'V' (Enciende LED Verde en Pin 8)
  - status == "ROJO"  -> Envía 'R' (Enciende LED Rojo + Buzzer en Pin 9)

Uso:
  python arduino_bridge.py --port COM3 --ws ws://localhost:8000/ws/kiosco
  (Si no se detecta el puerto COM físico, opera en modo emulación en consola).
"""

import argparse
import asyncio
import json
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
            print("[INFO] Ningún Arduino físico detectado por USB. Se mostrará el estado de los pines en consola.")
        return None


def trigger_hardware(ser, status: str, worker_name: str = "", missing: list = None):
    missing = missing or []
    if status == "VERDE":
        cmd = b"V"
        print("\n" + "=" * 65)
        print(f"🟢 [ARDUINO PIN 8 -> HIGH] FOCO VERDE ENCENDIDO | ACCESO CONCEDIDO")
        print(f"   Trabajador: {worker_name}")
        print("=" * 65)
    elif status == "ROJO":
        cmd = b"R"
        print("\n" + "=" * 65)
        print(f"🔴 [ARDUINO PIN 9 -> HIGH] FOCO ROJO + BUZZER | ACCESO DENEGADO")
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


async def listen_kiosco_ws(ws_url: str, ser):
    while True:
        try:
            print(f"[WS] Conectando al servidor SafeMine AI en {ws_url} ...")
            async with websockets.connect(ws_url) as websocket:
                print("[WS] Conectado. Esperando lecturas de QR y validación de EPPs en garita...")
                await websocket.send(json.dumps({"client": "arduino_bridge", "status": "ONLINE"}))

                async for message in websocket:
                    try:
                        data = json.loads(message)
                    except json.JSONDecodeError:
                        continue

                    status = data.get("status")
                    if status in ("VERDE", "ROJO"):
                        worker_name = data.get("worker_name", f"ID #{data.get('worker_id', '?')}")
                        missing = data.get("faltante", [])
                        trigger_hardware(ser, status, worker_name, missing)
        except (websockets.ConnectionClosed, ConnectionRefusedError, OSError) as exc:
            print(f"[WS] Conexión perdida o servidor no disponible ({exc}). Reintentando en 3 segundos...")
            await asyncio.sleep(3)


def main():
    parser = argparse.ArgumentParser(description="SafeMine AI - Puente WebSocket a Arduino Serial")
    parser.add_argument("--port", default=os.getenv("ARDUINO_PORT", "COM3"), help="Puerto Serial del Arduino (ej. COM3 o /dev/ttyUSB0)")
    parser.add_argument("--baud", type=int, default=9600, help="Velocidad en baudios (por defecto 9600)")
    parser.add_argument("--ws", default=os.getenv("SAFEMINE_WS_URL", "ws://localhost:8000/ws/kiosco"), help="URL del WebSocket del backend")
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
