---
date: 2026-11-06
tags: [soa, rest, soap]
---
# Résumé — Services Web

## La SOA en une phrase

Un système = des **services** autonomes, décrits par un **contrat** standard, faiblement **couplés**, réutilisables et composables.

Rôles : **fournisseur** (publie) · **annuaire** (référence) · **consommateur** (cherche, puis appelle). Intermédiaire d'entreprise : l'**ESB**.

## SOAP

- Messages **XML** : `Envelope` → `Header` (optionnel) + `Body` (+ `Fault` en cas d'erreur).
- Contrat **WSDL** : types XSD, opérations, liaison, adresse.
- En Java : **JAX-WS** (`@WebService`, `@WebMethod`).
- Sécurité au niveau du message : **WS-Security**.

## REST

> [!propriete] 6 contraintes
> client-serveur · sans état · cache · interface uniforme · en couches · code à la demande (optionnel)

| Verbe | CRUD | Idempotent | Succès |
|---|---|---|---|
| `GET` | lire | oui | `200` |
| `POST` | créer | non | `201` + `Location` |
| `PUT` | remplacer | oui | `200` / `204` |
| `PATCH` | modifier en partie | non | `200` |
| `DELETE` | supprimer | oui | `204` |

Erreurs : `400` requête invalide · `401` non authentifié · `403` interdit · `404` introuvable · `409` conflit · `500` erreur serveur.

## Spring Boot en 5 annotations

`@RestController` · `@RequestMapping("/x")` · `@GetMapping("/{id}")` + `@PathVariable` · `@PostMapping` + `@RequestBody` · `@Valid`.

## Comparatif express

| | SOAP | REST |
|---|---|---|
| Format | XML | JSON (surtout) |
| Contrat | WSDL | OpenAPI |
| Poids | lourd, très outillé | léger |
| Terrain | banque, systèmes historiques | web, mobile, microservices |

> [!tip] Microservices
> Un service = une responsabilité, **sa propre** base de données, un déploiement indépendant (conteneur), derrière une **API Gateway**.

Cours : [[Chapitre 1 - SOA, SOAP et REST]] · TP : [[TP 1 - API REST avec Spring Boot]] · sockets et client/serveur : [[Résumé - Séance 2 - Sockets (1)]].
