#include <DHT.h>
#include <WiFi.h>
#include <HTTPClient.h>

#define MQ138_PIN  34
#define DHT_PIN     4
#define DHT_TYPE  DHT22

// WiFi Configuration - UPDATE THESE
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "http://10.0.0.33:8001"; // Use your PC's LAN IP, not localhost
const int PATIENT_ID = 1;

DHT dht(DHT_PIN, DHT_TYPE);

const float RL_VALUE = 10.0;
const float VCC      = 3.3;
const int   ADC_MAX  = 4095;

void setup() {
  Serial.begin(115200);
  dht.begin();

  // Connect to WiFi
  Serial.println("📡 Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("📶 IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    Serial.println("⚠️  Check your WiFi credentials and try again.");
    return;
  }

  Serial.println("🔥 Warming up MQ-138...");
  Serial.println("⚠️  Place sensor in CLEAN FRESH AIR!");
  Serial.println("⏳ Waiting 5 minutes for stable reading...");
  delay(300000); // 5 minutes warmup
  Serial.println("📊 Now calculating R0...");
}

const int LISTENER_UNAVAILABLE = -1;
const int LISTENER_INACTIVE = 0;
const int LISTENER_ACTIVE = 1;

int getListenerState() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Cannot check listener: ESP32 is not connected to Wi-Fi.");
    return LISTENER_UNAVAILABLE;
  }

  HTTPClient http;
  String url = String(API_URL) + "/readings/listener/armed-patient";
  Serial.println("🔎 Checking listener at: " + url);
  http.begin(url);
  http.setConnectTimeout(5000);
  http.setTimeout(5000);

  int httpResponseCode = http.GET();
  int state = LISTENER_UNAVAILABLE;
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("📡 Listener check HTTP 200: " + response);

    int armedKey = response.indexOf("\"armed\"");
    int colon = armedKey >= 0 ? response.indexOf(':', armedKey) : -1;
    if (colon >= 0) {
      int valueStart = colon + 1;
      while (
        valueStart < response.length() &&
        (response[valueStart] == ' ' || response[valueStart] == '\n' ||
         response[valueStart] == '\r' || response[valueStart] == '\t')
      ) {
        valueStart++;
      }
      if (response.startsWith("true", valueStart)) {
        state = LISTENER_ACTIVE;
      } else if (response.startsWith("false", valueStart)) {
        state = LISTENER_INACTIVE;
      }
    }
  } else if (httpResponseCode > 0) {
    Serial.printf("❌ Listener check returned HTTP %d: ", httpResponseCode);
    Serial.println(http.getString());
  } else {
    Serial.printf("❌ Listener check failed: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
  if (state == LISTENER_ACTIVE) {
    Serial.println("✅ Backend reports listener armed.");
  } else if (state == LISTENER_INACTIVE) {
    Serial.println("⏸️  Backend reports listener not armed.");
  } else if (httpResponseCode == 200) {
    Serial.println("❌ Backend returned an invalid listener status.");
  }
  return state;
} 

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnected! Reconnecting...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    delay(5000);

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("✅ WiFi reconnected!");
    } else {
      Serial.println("⏳ Next check in 10 seconds...");
      delay(10000);
      return;
    }
  }

  // Check if listener is active before collecting/sending data
  int listenerState = getListenerState();

  if (listenerState == LISTENER_UNAVAILABLE) {
    Serial.println("⚠️  Cannot read listener status. Check API_URL, backend network binding, and firewall.");
    Serial.println("⏳ Next check in 10 seconds...");
    delay(10000);
    return;
  }

  if (listenerState == LISTENER_INACTIVE) {
    Serial.println("⏸️  Listener not active. Waiting for Start Listening command...");
    Serial.println("⏳ Next check in 10 seconds...");
    delay(10000);
    return;
  }

  Serial.println("🎤 Listener active - collecting sensor data...");

  // Read DHT22
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  // Fallback values if DHT22 fails
  if (isnan(temp) || isnan(hum)) {
    Serial.println("❌ DHT22 read failed! Using fallback values.");

    temp = 25.0;
    hum = 50.0;
  }

  // Average 100 MQ138 readings
  long sum = 0;
  for (int i = 0; i < 100; i++) {
    sum += analogRead(MQ138_PIN);
    delay(10);
  }

  int rawADC = sum / 100;

  // Calculate RS
  float voltage = rawADC * (VCC / ADC_MAX);

  if (voltage <= 0.0) {
    voltage = 0.001;
  }

  float RS = ((VCC - voltage) / voltage) * RL_VALUE;

  // Compensation for temp and humidity
  float compensation =
      1.0 +
      ((hum - 50.0) * 0.01) +
      ((temp - 25.0) * 0.005);

  if (compensation <= 0.0) {
    compensation = 1.0;
  }

  float RS_comp = RS / compensation;

  Serial.println("\n─────────────────────────────");
  Serial.printf("🌡️  Temperature: %.1f°C\n", temp);
  Serial.printf("💧 Humidity:    %.1f%%\n", hum);
  Serial.printf("🔢 Raw ADC:     %d\n", rawADC);
  Serial.printf("📐 RS:          %.4f kΩ\n", RS);
  Serial.printf("📐 RS_comp:     %.4f kΩ\n", RS_comp);
  Serial.println("─────────────────────────────");

  // Send data to backend
  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;

    String url = String(API_URL) + "/readings/sensor";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(10000);

    String jsonData =
      "{\"patient_id\":" + String(PATIENT_ID) +
      ",\"raw_sensor_value\":" + String(rawADC) +
      ",\"temperature\":" + String(temp, 2) +
      ",\"humidity\":" + String(hum, 2) +
      "}";

    Serial.println("JSON being sent:");
    Serial.println(jsonData);

    int httpResponseCode = -1;
    int maxRetries = 3;

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      httpResponseCode = http.POST(jsonData);

      if (httpResponseCode > 0) {
        Serial.printf("✅ Data sent to backend: %d\n", httpResponseCode);

        String response = http.getString();

        Serial.println("📡 Response: " + response);
        break;
      } else {
        Serial.printf(
          "❌ Attempt %d failed: %s\n",
          attempt,
          http.errorToString(httpResponseCode).c_str()
        );

        if (attempt < maxRetries) {
          Serial.println("⏳ Retrying in 1 second...");
          delay(1000);
        }
      }
    }

    http.end();

  } else {
    Serial.println("⚠️  WiFi not connected, skipping data send");
  }

  Serial.println("⏳ Next reading in 10 seconds...");
  delay(10000);
}