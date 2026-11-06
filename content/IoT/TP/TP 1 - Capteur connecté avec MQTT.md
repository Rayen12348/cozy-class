---
date: 2026-11-06
tags: [iot, mqtt, esp32, node-red]
---
# TP 1 — Capteur connecté avec MQTT

**Objectif** : un ESP32 mesure la température et l'humidité et les publie en MQTT ; un tableau de bord Node-RED les affiche et pilote une LED à distance. Notions du [[Chapitre 1 - Architecture et protocoles IoT]].

**Matériel** : un ESP32, un capteur DHT22, une LED et une résistance de 220 Ω, des câbles. **Sans matériel** : tout se fait dans le simulateur [Wokwi](https://wokwi.com) (nouveau projet « ESP32 »).

**Logiciels** : Arduino IDE (carte « ESP32 Dev Module », bibliothèques **PubSubClient** et **DHT sensor library**), Node-RED (`npm install -g node-red`), le client Mosquitto (`mosquitto_sub`, `mosquitto_pub`).

## Partie 1 — Lire le capteur

Câblage : DHT22 sur la broche **15**, LED sur la broche **2**.

- [ ] Afficher la température et l'humidité toutes les 2 secondes dans le moniteur série (115200 bauds)
- [ ] Que renvoie `dht.readTemperature()` quand le capteur est débranché ? Gérer ce cas avec `isnan()`

## Partie 2 — Publier en MQTT

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

const char* SSID   = "Wokwi-GUEST";          // réseau du simulateur ; sinon ton Wi-Fi
const char* PASS   = "";
const char* BROKER = "test.mosquitto.org";
const char* ID     = "esp32-ton-prenom";     // doit être unique sur le broker public

WiFiClient wifi;
PubSubClient mqtt(wifi);
DHT dht(15, DHT22);

void setup() {
  Serial.begin(115200);
  pinMode(2, OUTPUT);
  dht.begin();
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) delay(300);
  mqtt.setServer(BROKER, 1883);
  // TODO partie 3 : mqtt.setCallback(callback);
}

void loop() {
  if (!mqtt.connected()) {
    if (mqtt.connect(ID)) Serial.println("MQTT connecté");
    else { delay(2000); return; }
  }
  mqtt.loop();

  static unsigned long dernier = 0;
  if (millis() - dernier > 5000) {
    dernier = millis();
    float t = dht.readTemperature(), h = dht.readHumidity();
    if (isnan(t) || isnan(h)) return;
    char json[64];
    snprintf(json, sizeof json, "{\"temp\":%.1f,\"hum\":%.1f}", t, h);
    mqtt.publish("cozyclass/ton-prenom/salle", json);
  }
}
```

- [ ] Remplacer `ton-prenom`, puis téléverser (ou lancer la simulation)
- [ ] Vérifier la réception depuis un terminal : `mosquitto_sub -h test.mosquitto.org -t "cozyclass/ton-prenom/#" -v`
- [ ] S'abonner à `cozyclass/+/salle` : reçois-tu les mesures des autres binômes ?

## Partie 3 — Recevoir une commande

- [ ] S'abonner au topic `cozyclass/ton-prenom/led` juste après la connexion (`mqtt.subscribe(...)`)
- [ ] Écrire la fonction de rappel : `on` allume la LED, `off` l'éteint
- [ ] Tester avec `mosquitto_pub -h test.mosquitto.org -t "cozyclass/ton-prenom/led" -m on`

```cpp
void callback(char* topic, byte* payload, unsigned int len) {
  String msg;
  for (unsigned int i = 0; i < len; i++) msg += (char)payload[i];
  digitalWrite(2, msg == "on" ? HIGH : LOW);
}
```

## Partie 4 — Tableau de bord Node-RED

Lancer `node-red`, ouvrir `http://localhost:1880` et installer la palette **@flowfuse/node-red-dashboard** (menu → *Manage palette*).

- [ ] Un nœud **mqtt in** (broker `test.mosquitto.org`, topic de la salle, sortie « a parsed JSON object »)
- [ ] Deux nœuds **change** qui extraient `msg.payload.temp` et `msg.payload.hum`, reliés à deux jauges (**gauge**) et à un graphique (**chart**)
- [ ] Un interrupteur (**switch**) du dashboard relié à un nœud **mqtt out** sur le topic `led`
- [ ] Une alerte : au-dessus de 30 °C, afficher une notification

## Questions

1. Pourquoi l'identifiant du client MQTT doit-il être unique ?
2. Quelle QoS choisir pour les mesures ? Et pour la commande de la LED ?
3. Sur un broker public, n'importe qui peut lire tes mesures et piloter ta LED. Comment sécuriser ce montage en vrai ? (voir le [[Chapitre 1 - Cryptographie et sécurité des applications|cours de sécurité]])

## Bonus

- [ ] Publier l'état de la LED en message **retenu**, et un **testament** `offline` sur `cozyclass/ton-prenom/statut`
- [ ] Stocker les mesures dans InfluxDB et les afficher dans Grafana
- [ ] Exporter une journée de mesures en CSV et l'analyser en R (voir [[Chapitre 1 - Bases de R et du tidyverse]])

## À rendre

Le code de l'ESP32, l'export du flux Node-RED (JSON) et une capture du tableau de bord.
