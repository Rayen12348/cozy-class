---
date: 2026-11-06
tags: [iot, mqtt]
---
# Résumé — IoT

## Architecture

**Perception** (capteurs, actionneurs) → **Réseau** (passerelle) → **Traitement** (broker, cloud, edge) → **Application** (tableau de bord, alertes).

## Matériel

- **Arduino** : microcontrôleur simple, sans réseau intégré.
- **ESP32** : microcontrôleur avec Wi-Fi et BLE — l'objet connecté typique.
- **Raspberry Pi** : mini-ordinateur sous Linux — passerelle, edge computing.

## Réseaux

| | Portée | Débit | Énergie |
|---|---|---|---|
| Wi-Fi | courte | élevé | élevée |
| BLE | très courte | moyen | très faible |
| Zigbee | courte, maillé | faible | très faible |
| LoRaWAN | **plusieurs km** | très faible | très faible |
| NB-IoT | réseau mobile | faible | faible |

## MQTT

> [!definition] Publish / subscribe
> Les objets **publient** sur des **topics**, les applications **s'abonnent**, le **broker** fait le lien. Personne ne s'adresse directement à personne.

- Topics hiérarchiques : `site/salle/capteur` · jokers `+` (un niveau) et `#` (tout ce qui suit).
- QoS **0** au plus une fois · **1** au moins une fois · **2** exactement une fois.
- *Retained* : le dernier message est gardé pour les nouveaux abonnés · *Last Will* : publié si l'objet disparaît.
- Ports : **1883** (en clair), **8883** (TLS).

| Protocole | Transport | Pour |
|---|---|---|
| MQTT | TCP | télémétrie, commandes |
| CoAP | UDP | objets très contraints |
| HTTP / REST | TCP | objets puissants, intégration web |

## Plateformes

Node-RED (flux visuels) · ThingSpeak, ThingsBoard · AWS IoT Core, Azure IoT Hub · InfluxDB + Grafana.

> [!warning] Sécurité
> Changer les identifiants par défaut · TLS · une identité par objet · mises à jour OTA · réseau séparé. (Souvenir : Mirai, 2016.)

Cours : [[Chapitre 1 - Architecture et protocoles IoT]] · TP : [[TP 1 - Capteur connecté avec MQTT]] · analyser les mesures : [[Résumé - R et tidyverse]].
