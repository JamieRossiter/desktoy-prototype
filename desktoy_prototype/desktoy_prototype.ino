#include <LiquidCrystal.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi
char WIFI_SSID[] = "RossiterNBN";
char WIFI_PASS[] = "pars&birds";

// Liquid Crystal
int e = D1;
int rs = D2;
int d7 = D3;
int d6 = D4;
int d5 = D5;
int d4 = D6;
LiquidCrystal lcd(rs, e, d4, d5, d6, d7);

// MQTT
WiFiClient wifi;
PubSubClient mqtt(wifi);
char MQTT_BROKER[] = "broker.emqx.io";
int MQTT_PORT = 1883;
char MQTT_CLIENT_ID[] = "desktoy_prototype";
char MQTT_USERNAME[] = "emqx";
char MQTT_PASSWORD[] = "public";
char MQTT_TOPIC[] = "/desktoy/message";

//JSON
DynamicJsonDocument doc(2048);

void setup() {
  Serial.begin(115200);
  setup_lcd();
  setup_wifi();
  setup_mqtt();
}

void setup_lcd(){
  lcd.begin(16, 2);
  lcd.setCursor(0, 0);
}

void setup_wifi(){
  // Begin connection
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.println("Connecting to ");
  Serial.print(WIFI_SSID);
  Serial.println();
  // Establishing connection to WiFi
  while(WiFi.status() != WL_CONNECTED){
    Serial.print(".");  
    lcd.setCursor(0, 0);
    lcd.print("WiFi:");
    lcd.print(WIFI_SSID);
    lcd.setCursor(0, 1);
    for(int i = 0; i < 15; i++){
        lcd.print(".");
        delay(100);
    }
    lcd.clear();
  }
  // Successfully connected to WiFi
  Serial.println();
  Serial.print("Successfully connected to ");
  Serial.print(WIFI_SSID);
  Serial.println();
  Serial.print("IP Address: ");
  Serial.print(WiFi.localIP());
  lcd.setCursor(0, 0);
  lcd.print("WiFi:");
  lcd.print(WIFI_SSID);
  lcd.setCursor(0, 1);
  lcd.print("Connected!");
  delay(5000);
}

void setup_mqtt(){
  // Establish MQTT connection
  Serial.println();
  Serial.println("Connecting to MQTT broker");
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(mqtt_message_received);
  // Attempt MQTT connection
  while(!mqtt.connected()){
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Connecting MQTT");
    lcd.setCursor(0, 1);
    for(int i = 0; i < 15; i++){
      lcd.print(".");
      delay(100);
    }
    if(mqtt.connect("arduino", "emqx", "public")){
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("MQTT Connected!");
      Serial.println("MQTT connection successful.");  
    } else {
      Serial.println("MQTT connection failed with state: ");
      Serial.print(mqtt.state());
    }
  }
  // Subscribe to topic
  mqtt.subscribe(MQTT_TOPIC);
  Serial.println("Subscribed to topic: ");
  Serial.print(MQTT_TOPIC);
  lcd.setCursor(0, 1);
  lcd.print(MQTT_TOPIC);
  delay(5000);
  lcd.clear();
}

void loop() {
  mqtt.loop();
}

// Callback for when a message is received over MQTT
void mqtt_message_received(char *topic, byte *payload, unsigned int len){
  Serial.println("Message arrived in topic: ");
  Serial.println(topic);
  Serial.println("Message: ");
  Serial.println();
  String message;
  for(int i = 0; i < len; i++) {
    message += (char)payload[i];
  }
  handle_json_message(message);
}

void handle_json_message(String message){
  lcd.clear();
  JsonObject message_obj = create_message_object(message);
  String line1 = message_obj["line1"];
  String line2 = message_obj["line2"];
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

JsonObject create_message_object(String message){
  deserializeJson(doc, message);
  JsonObject obj = doc.as<JsonObject>();
  return obj;
}
