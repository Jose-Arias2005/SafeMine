# SafeMine AI — Puente de Hardware IoT (Arduino UNO / ESP32)

Este módulo conecta el backend de **SafeMine AI** (`ws://localhost:8000/ws/kiosco`) con un microcontrolador **Arduino UNO** o **ESP32** conectado por USB Serial en la garita de control minero.

## Conexión de Pines en el Arduino
- **Pin Digital 8**: LED Verde (Acceso Concedido — QR Autorizado + EPPs Completos).
- **Pin Digital 9**: LED Rojo + Buzzer Activo (Acceso Denegado — QR No Autorizado o Falta de EPPs).
- **GND**: Tierra común a través de resistencias de $220\,\Omega$ para los LEDs.

## Ejecución Rápida
1. Carga el sketch `safemine_access_control/safemine_access_control.ino` desde el Arduino IDE.
2. Instala las dependencias del puente en Python:
   ```bash
   pip install -r requirements.txt
   ```
3. Ejecuta el puente indicando tu puerto COM (o sin Arduino conectado para ver la simulación en consola):
   ```bash
   python arduino_bridge.py --port COM3 --ws ws://localhost:8000/ws/kiosco
   ```
