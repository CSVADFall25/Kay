/*
  ADXL335_to_p5_DodgeGame.ino
  Reads analog ADXL335 and streams ax,ay,az (RAW ADC 0..1023) at 115200 baud.
  Wiring: X->A0, Y->A1, Z->A2, VCC->3.3V, GND->GND
*/
const int PIN_X = A0;
const int PIN_Y = A1;
const int PIN_Z = A2;

void setup() {
  Serial.begin(115200);
  analogReference(DEFAULT); // 5V ref on UNO
  Serial.println("# ax_raw,ay_raw,az_raw");
}

void loop() {
  int ax = analogRead(PIN_X);
  int ay = analogRead(PIN_Y);
  int az = analogRead(PIN_Z);
  Serial.print(ax); Serial.print(",");
  Serial.print(ay); Serial.print(",");
  Serial.println(az);
  delay(10); // ~100 Hz
}
