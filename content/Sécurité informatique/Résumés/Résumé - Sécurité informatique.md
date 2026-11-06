---
date: 2026-11-06
tags: [securite]
---
# Résumé — Sécurité informatique

## Objectifs

**C**onfidentialité · **I**ntégrité · **D**isponibilité — plus l'authentification et la non-répudiation.

## Les trois outils cryptographiques

| | Symétrique | Asymétrique | Hachage |
|---|---|---|---|
| Clés | une clé partagée | publique + privée | aucune (HMAC : une clé) |
| Vitesse | très rapide | lent | très rapide |
| Sert à | chiffrer les données | échanger une clé, signer | intégrité, empreintes |
| Algorithmes | AES-GCM, ChaCha20 | RSA ≥ 2048, ECDSA, Ed25519, ECDH | SHA-256, SHA-3 |
| À éviter | DES, 3DES, mode ECB | RSA < 2048 bits | MD5, SHA-1 |

## Qui utilise quelle clé ?

> [!methode] Le moyen mnémotechnique
> - **Chiffrer** pour Bob → clé **publique de Bob** ; Bob déchiffre avec sa clé **privée**.
> - **Signer** → **ma** clé privée ; tout le monde vérifie avec ma clé publique.

## Mots de passe

Jamais en clair, jamais en simple SHA-256 → **bcrypt**, **scrypt** ou **Argon2** (lents et salés).

## TLS / HTTPS

1. Le serveur présente son **certificat** (clé publique signée par une AC).
2. Le client vérifie la chaîne de confiance, les dates et le nom de domaine.
3. Échange de clé (ECDHE) → clé de session.
4. Données chiffrées en **symétrique** (AES-GCM).

## Failles web à connaître

| Faille | Principe | Parade |
|---|---|---|
| Injection SQL | l'entrée devient du code SQL | requêtes préparées, ORM |
| XSS | script injecté dans la page | échapper l'affichage, CSP, `HttpOnly` |
| CSRF | requête forgée depuis un autre site | jeton anti-CSRF, `SameSite` |
| Contrôle d'accès | accès aux données d'un autre | vérifier les droits côté serveur |
| Secrets exposés | clés d'API dans le code | variables d'environnement, coffre-fort |

> [!warning] JWT
> Signé mais **pas chiffré** : lisible par tous. Vérifier la signature et la date d'expiration côté serveur.

Cours : [[Chapitre 1 - Cryptographie et sécurité des applications]] · TP : [[TP 1 - Chiffrement et hachage avec OpenSSL]] · sécurité des objets connectés : [[Résumé - IoT#Module 13 — Sécurité avancée et conformité|Résumé - IoT, module 13]] et [[TP 6 - Sécuriser MQTT (TLS, mots de passe, ACL)]].
