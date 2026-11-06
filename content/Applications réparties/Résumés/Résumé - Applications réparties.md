---
date: 2026-11-06
tags: [systemes-repartis]
---
# Résumé — Applications réparties

> [!definition] Système réparti
> Des machines indépendantes, sans mémoire partagée, qui coopèrent en échangeant des messages et apparaissent comme un seul système.

## Les moyens de communication

| Mécanisme | Style | Couplage | Exemples |
|---|---|---|---|
| Sockets | flux d'octets, bas niveau | fort | `ServerSocket`, `DatagramSocket` |
| RPC / RMI | appel de méthode synchrone | fort | Java RMI, gRPC |
| Services web | requêtes HTTP | moyen | REST, SOAP → [[Résumé - Services Web]] |
| MOM | messages asynchrones | faible | RabbitMQ, Kafka, JMS, MQTT |

## TCP ou UDP

- **TCP** : connecté, fiable, ordonné → web, chat, fichiers.
- **UDP** : sans connexion, rapide, pertes possibles → vidéo, jeux, DNS.

## RPC en 4 étapes

1. Client → **stub** (sérialise les paramètres)
2. Réseau
3. **Skeleton** (désérialise) → méthode réelle
4. Résultat renvoyé par le même chemin

## Concurrence côté serveur

- Un thread par client : simple, mais limité.
- Pool de threads (`ExecutorService`) : nombre de threads borné.
- Données partagées → collections concurrentes (`ConcurrentHashMap`) ou `synchronized`.

## CAP

> [!theoreme] CAP
> Pendant une partition réseau, on garde la **cohérence** ou la **disponibilité**, pas les deux.

## Le piège classique

> [!warning] Les illusions du réparti
> Le réseau n'est **ni fiable, ni instantané, ni sûr**. Toujours prévoir des délais d'attente (*timeouts*), des nouvelles tentatives et la gestion des pannes.

Cours complet : [[Chapitre 1 - Introduction aux systèmes répartis]] · pratique : [[TP 1 - Chat client-serveur avec sockets]].
