/*
 * SafeMine AI - Control Fisico de Acceso en Garita (Arduino UNO / ESP32)
 * ----------------------------------------------------------------------
 * Recibe comandos por Puerto Serial (9600 baudios) desde arduino_bridge.py:
 *   'V' -> Acceso Concedido (Trabajador Autorizado + Todos sus EPPs):
 *          Enciende LED Verde (Pin 8) por 5 segundos.
 *   'R' -> Acceso Denegado (No Autorizado o Falta algun EPP):
 *          Enciende LED Rojo + Buzzer de Alerta (Pin 9) con patron intermitente.
 *   'O' -> Apagar / Estado en espera (Idle).
 */

const int PIN_LED_VERDE = 8;
const int PIN_LED_ROJO_BUZZER = 9;

void setup() {
  Serial.begin(9600);
  pinMode(PIN_LED_VERDE, OUTPUT);
  pinMode(PIN_LED_ROJO_BUZZER, OUTPUT);

  // Secuencia de autodiagnostico al iniciar
  digitalWrite(PIN_LED_VERDE, HIGH);
  delay(300);
  digitalWrite(PIN_LED_VERDE, LOW);
  digitalWrite(PIN_LED_ROJO_BUZZER, HIGH);
  delay(300);
  digitalWrite(PIN_LED_ROJO_BUZZER, LOW);

  Serial.println("SAFEMINE_ARDUINO_READY");
}

void loop() {
  if (Serial.available() > 0) {
    char cmd = Serial.read();

    if (cmd == 'V' || cmd == 'v') {
      // ACCESO CONCEDIDO: LED Verde encendido, Rojo/Buzzer apagado
      digitalWrite(PIN_LED_ROJO_BUZZER, LOW);
      digitalWrite(PIN_LED_VERDE, HIGH);
      Serial.println("ACK:VERDE_ACCESO_CONCEDIDO");
      delay(4000);
      digitalWrite(PIN_LED_VERDE, LOW);
    } 
    else if (cmd == 'R' || cmd == 'r') {
      // ACCESO DENEGADO / FALTA EPP: LED Rojo + Buzzer alerta sonora
      digitalWrite(PIN_LED_VERDE, LOW);
      Serial.println("ACK:ROJO_ACCESO_DENEGADO");
      for (int i = 0; i < 6; i++) {
        digitalWrite(PIN_LED_ROJO_BUZZER, HIGH);
        delay(350);
        digitalWrite(PIN_LED_ROJO_BUZZER, LOW);
        delay(150);
      }
      // Mantener rojo encendido 2 segundos adicionales antes de volver a espera
      digitalWrite(PIN_LED_ROJO_BUZZER, HIGH);
      delay(2000);
      digitalWrite(PIN_LED_ROJO_BUZZER, LOW);
    } 
    else if (cmd == 'O' || cmd == 'o') {
      // Reset / Espera
      digitalWrite(PIN_LED_VERDE, LOW);
      digitalWrite(PIN_LED_ROJO_BUZZER, LOW);
      Serial.println("ACK:IDLE");
    }
  }
}
