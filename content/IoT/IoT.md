---
icone: IOT
couleur: sapphire
prof: Dr. Ahmed Bannour
description: "IoT Appli et Plates formes — du capteur à l'Edge AI : réseaux, MQTT, cloud AWS, Machine Learning, TinyML, sécurité et blockchain."
ordre: 11
---
**IoT : applications et plateformes** · code `169920811` · Semestre 5 · unité optionnelle · LCS3-GLSI

| UE | Coef | Crédits | Régime | Cours | TD | TP | Total |
|---|---|---|---|---|---|---|---|
| Unité optionnelle (`9999875001`) | 1,5 | 3 | Mixte | 10,5 h | — | 21 h | 31,5 h |

Le cours complet est dans **Cours** ([[Cours - IoT, architecture, cloud et IA.pdf]]), sa fiche détaillée dans **Résumés** ([[Résumé - IoT]]). Les énoncés originaux des 12 TP sont dans [[Fascicule de TP - 12 laboratoires.pdf]], et chaque TP a sa version simplifiée, avec le code testé et les résultats attendus.

## Plan du cours

1. **Fondamentaux de l'IoT** : capteurs, actionneurs, dispositifs, de M2M à l'AIoT
2. **Réseaux IoT** : modes de communication, couches OSI, technologies sans fil
3. **MQTT** : publish/subscribe, topics, QoS, sécurité
4. **Cloud & Edge Computing** : architecture multicouche, quand utiliser quoi
5. **Dispositif AIoT virtuel** : simulateur Python, MQTT, MongoDB
6. **Cloud AWS pour l'IoT** : IoT Core, DynamoDB, Kinesis, stream et batch
7. **IA & Machine Learning** : supervisé, non supervisé, évaluation
8. **Edge AI & TinyML** : matériel, optimisation des modèles
9. **Études de cas & synthèse** : cas réels, architecture complète
10. **Architecture d'entreprise & jumeaux numériques**
11. **Sécurité, vie privée & éthique de l'IA**
12. **Blockchain pour l'IoT d'entreprise**
13. **Sécurité avancée & conformité** : Zero Trust, PKI, OTA, normes
14. **Bibliographie & références**

## Travaux pratiques

| TP | Sujet | Durée | Outils |
|---|---|---|---|
| [[TP 1 - MQTT en ligne de commande\|TP 1]] | MQTT en ligne de commande | 1 h 30 | Mosquitto |
| [[TP 2 - Simulateur de dispositif en Python\|TP 2]] | Simulateur de dispositif en Python | 1 h 30 | Python |
| [[TP 3 - Dispositif réaliste (dérive, bruit, états)\|TP 3]] | Dispositif réaliste : dérive, bruit, états | 1 h | Python |
| [[TP 4 - Connecter le dispositif à MQTT\|TP 4]] | Connecter le dispositif à MQTT | 1 h | paho-mqtt |
| [[TP 5 - Commandes et accusés de réception\|TP 5]] | Commandes et accusés de réception | 1 h | paho-mqtt |
| [[TP 6 - Sécuriser MQTT (TLS, mots de passe, ACL)\|TP 6]] | Sécuriser MQTT : TLS, mots de passe, ACL | 1 h 30 | OpenSSL, Mosquitto |
| [[TP 7 - Stocker et analyser avec MongoDB\|TP 7]] | Stocker et analyser la télémétrie | 2 h | MongoDB, PyMongo |
| [[TP 8 - API REST avec FastAPI\|TP 8]] | API REST du dispositif | 1 h 30 | FastAPI |
| [[TP 9 - AWS IoT Core et DynamoDB\|TP 9]] | Du dispositif au cloud AWS | 2 h | AWS IoT Core, DynamoDB |
| [[TP 10 - Flux temps réel avec Kinesis\|TP 10]] | Flux temps réel et anomalies | 2 h | Kinesis, boto3 |
| [[TP 11 - TinyML, reconnaissance de gestes\|TP 11]] | TinyML : reconnaissance de gestes | 1 h 30 | scikit-learn |
| [[TP 12 - Projet Smart Home\|TP 12]] | Projet de synthèse : maison intelligente | 3 h | paho-mqtt |

Environnement : Python 3.8 ou plus dans un environnement virtuel, Mosquitto, Docker (MongoDB), un compte AWS pour les TP 9 et 10 (ou l'émulateur local décrit dans ces TP). Les TP s'enchaînent : chacun repart du précédent.

Même UE que [[Analyse de données avec R]].
