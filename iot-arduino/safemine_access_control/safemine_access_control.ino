/*
 * SafeMine AI - Control Fisico de Acceso y Telemetria IoT en Garita (Arduino UNO)
 * -------------------------------------------------------------------------------
 * Pines Fisicos:
 *   Pin 8  -> LED Verde (Acceso Concedido)
 *   Pin 9  -> LED Rojo + Buzzer Activo (Acceso Denegado / Alerta EPP)
 *   Pin 10 -> TRIG del Sensor Ultrasonico HC-SR04
 *   Pin 11 -> ECHO del Sensor Ultrasonico HC-SR04
 *   Pin 12 -> DATA del Sensor de Temperatura y Humedad DHT11
 *
 * Comandos recibidos por Puerto Serial (9600 baudios) desde arduino_bridge.py:
 *   'V' -> Enciende Pin 8 por 4000 ms (no bloqueante)
 *   'R' -> Parpadea Pin 9 por 3000 ms (6 ciclos) + 2000 ms fijo (no bloqueante)
 *   'O' -> Apaga ambos actuadores (estado Idle)
 *
 * Telemetria emitida por Serial cada 1000 ms (1 Hz):
 *   {"type":"TELEMETRY","distancia_cm":45.2,"presencia":true,"temperatura_c":22.5,"humedad_pct":58.0}
 */

#include <DHT.h>

const int PIN_LED_VERDE = 8;
const int PIN_LED_ROJO_BUZZER = 9;
const int PIN_TRIG = 10;
const int PIN_ECHO = 11;
const int PIN_DHT = 12;

#define DHTTYPE DHT11
DHT dht(PIN_DHT, DHTTYPE);

// Maquina de estados no bloqueante para LEDs y Buzzer
enum SignalState {
  STATE_IDLE,
  STATE_GREEN,
  STATE_RED_BLINK,
  STATE_RED_SOLID
};

SignalState currentState = STATE_IDLE;
unsigned long stateStartMs = 0;
unsigned long blinkPhaseMs = 0;
int blinkCycleCount = 0;
bool redPinOn = false;

// Temporizacion de telemetria a 1 Hz (1000 ms)
const unsigned long TELEMETRY_INTERVAL_MS = 1000UL;
unsigned long lastTelemetryMs = 0;

// Ultimos valores validos de DHT11 para evitar NaN en JSON
float lastValidTempC = 0.0f;
float lastValidHumPct = 0.0f;

float measureDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // Timeout de 30 ms (~5 metros max) para mantener el loop responsivo
  unsigned long duration = pulseIn(PIN_ECHO, HIGH, 30000UL);
  if (duration == 0UL) {
    return 0.0f;
  }
  float dist = (duration * 0.0343f) / 2.0f;
  if (isnan(dist) || isinf(dist)) {
    return 0.0f;
  }
  return dist;
}

void setIdleState(bool sendAck) {
  currentState = STATE_IDLE;
  redPinOn = false;
  digitalWrite(PIN_LED_VERDE, LOW);
  digitalWrite(PIN_LED_ROJO_BUZZER, LOW);
  if (sendAck) {
    Serial.println("ACK:IDLE");
  }
}

void handleSerialCommands(unsigned long now) {
  while (Serial.available() > 0) {
    char cmd = (char)Serial.read();

    if (cmd == 'V' || cmd == 'v') {
      currentState = STATE_GREEN;
      stateStartMs = now;
      redPinOn = false;
      digitalWrite(PIN_LED_ROJO_BUZZER, LOW);
      digitalWrite(PIN_LED_VERDE, HIGH);
      Serial.println("ACK:VERDE_ACCESO_CONCEDIDO");
    } else if (cmd == 'R' || cmd == 'r') {
      currentState = STATE_RED_BLINK;
      stateStartMs = now;
      blinkPhaseMs = now;
      blinkCycleCount = 0;
      redPinOn = true;
      digitalWrite(PIN_LED_VERDE, LOW);
      digitalWrite(PIN_LED_ROJO_BUZZER, HIGH);
      Serial.println("ACK:ROJO_ACCESO_DENEGADO");
    } else if (cmd == 'O' || cmd == 'o') {
      setIdleState(true);
    }
  }
}

void updateActuatorStateMachine(unsigned long now) {
  switch (currentState) {
    case STATE_IDLE:
      break;

    case STATE_GREEN:
      if (now - stateStartMs >= 4000UL) {
        setIdleState(false);
      }
      break;

    case STATE_RED_BLINK: {
      // 6 ciclos intermitentes: 350 ms HIGH + 150 ms LOW (3000 ms en total)
      unsigned long phaseDuration = redPinOn ? 350UL : 150UL;
      if (now - blinkPhaseMs >= phaseDuration) {
        blinkPhaseMs = now;
        if (redPinOn) {
          redPinOn = false;
          digitalWrite(PIN_LED_ROJO_BUZZER, LOW);
        } else {
          blinkCycleCount++;
          if (blinkCycleCount >= 6) {
            currentState = STATE_RED_SOLID;
            stateStartMs = now;
            redPinOn = true;
            digitalWrite(PIN_LED_ROJO_BUZZER, HIGH);
          } else {
            redPinOn = true;
            digitalWrite(PIN_LED_ROJO_BUZZER, HIGH);
          }
        }
      }
      break;
    }

    case STATE_RED_SOLID:
      if (now - stateStartMs >= 2000UL) {
        setIdleState(false);
      }
      break;
  }
}

void publishTelemetry(unsigned long now) {
  if (now - lastTelemetryMs < TELEMETRY_INTERVAL_MS) {
    return;
  }
  lastTelemetryMs = now;

  float distanciaCm = measureDistanceCm();
  bool presencia = (distanciaCm > 2.0f && distanciaCm <= 80.0f);

  float tempC = dht.readTemperature();
  float humPct = dht.readHumidity();

  if (!isnan(tempC) && !isinf(tempC)) {
    lastValidTempC = tempC;
  }
  if (!isnan(humPct) && !isinf(humPct)) {
    lastValidHumPct = humPct;
  }

  Serial.print("{\"type\":\"TELEMETRY\",\"distancia_cm\":");
  Serial.print(distanciaCm, 1);
  Serial.print(",\"presencia\":");
  Serial.print(presencia ? "true" : "false");
  Serial.print(",\"temperatura_c\":");
  Serial.print(lastValidTempC, 1);
  Serial.print(",\"humedad_pct\":");
  Serial.print(lastValidHumPct, 1);
  Serial.println("}");
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_LED_VERDE, OUTPUT);
  pinMode(PIN_LED_ROJO_BUZZER, OUTPUT);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  dht.begin();

  // Secuencia breve de autodiagnostico al iniciar
  digitalWrite(PIN_LED_VERDE, HIGH);
  delay(250);
  digitalWrite(PIN_LED_VERDE, LOW);
  digitalWrite(PIN_LED_ROJO_BUZZER, HIGH);
  delay(250);
  digitalWrite(PIN_LED_ROJO_BUZZER, LOW);

  lastTelemetryMs = millis();
  Serial.println("SAFEMINE_ARDUINO_READY");
}

void loop() {
  unsigned long now = millis();
  handleSerialCommands(now);
  updateActuatorStateMachine(now);
  publishTelemetry(now);
}
