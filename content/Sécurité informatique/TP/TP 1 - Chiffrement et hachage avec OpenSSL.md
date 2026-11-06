---
date: 2026-11-06
tags: [securite, openssl, cryptographie]
---
# TP 1 — Chiffrement et hachage avec OpenSSL

**Objectif** : manipuler en ligne de commande les outils vus dans le [[Chapitre 1 - Cryptographie et sécurité des applications|cours de cryptographie]] : hachage, chiffrement symétrique, paires de clés, signatures et certificats.

**Prérequis** : un terminal Linux (ou WSL, ou Git Bash) avec `openssl` — `openssl version` doit afficher 3.x.

## Partie 1 — Hachage

```sh
echo -n "bonjour" | openssl dgst -sha256
echo -n "Bonjour" | openssl dgst -sha256
```

- [ ] Comparer les deux empreintes : combien de caractères ont changé ? Comment s'appelle cette propriété ?
- [ ] Créer un fichier `rapport.txt`, calculer son SHA-256, modifier un seul caractère, recalculer
- [ ] Calculer un HMAC : `openssl dgst -sha256 -hmac "cle-secrete" rapport.txt`. Quelle différence avec un simple hachage ?

## Partie 2 — Chiffrement symétrique (AES)

```sh
openssl enc -aes-256-cbc -pbkdf2 -salt -in rapport.txt -out rapport.enc
openssl enc -d -aes-256-cbc -pbkdf2 -in rapport.enc -out rapport.dec.txt
```

- [ ] Chiffrer puis déchiffrer `rapport.txt` ; vérifier avec `diff` que le résultat est identique
- [ ] Afficher le début de `rapport.enc` avec `xxd rapport.enc | head` : que contiennent les 16 premiers octets ?
- [ ] Chiffrer deux fois le même fichier avec le même mot de passe : les résultats sont-ils identiques ? Pourquoi ?

## Partie 3 — Paire de clés RSA

```sh
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out prive.pem
openssl pkey -in prive.pem -pubout -out public.pem
```

- [ ] Générer la paire et afficher la clé publique
- [ ] Chiffrer un court message avec la clé **publique** : `openssl pkeyutl -encrypt -pubin -inkey public.pem -in secret.txt -out secret.enc`
- [ ] Le déchiffrer avec la clé **privée** : `openssl pkeyutl -decrypt -inkey prive.pem -in secret.enc`
- [ ] Essayer de chiffrer un fichier de 1 Mo en RSA : que se passe-t-il ? Qu'en conclure sur l'usage de RSA ?

## Partie 4 — Signature

```sh
openssl dgst -sha256 -sign prive.pem -out rapport.sig rapport.txt
openssl dgst -sha256 -verify public.pem -signature rapport.sig rapport.txt
```

- [ ] Signer et vérifier `rapport.txt` (« Verified OK »)
- [ ] Modifier le fichier puis vérifier à nouveau : que se passe-t-il ?
- [ ] Échanger ta clé publique avec un binôme et vérifier **sa** signature

## Partie 5 — Certificat auto-signé

```sh
openssl req -x509 -newkey rsa:2048 -nodes -keyout serveur.key -out serveur.crt -days 30 -subj "/CN=localhost"
openssl x509 -in serveur.crt -noout -text | head -20
```

- [ ] Repérer dans le certificat : l'émetteur, le sujet, les dates de validité, l'algorithme de signature
- [ ] Lancer un serveur TLS de test : `openssl s_server -key serveur.key -cert serveur.crt -accept 4433 -www`
- [ ] Ouvrir `https://localhost:4433` : pourquoi le navigateur affiche-t-il un avertissement ?

> [!tip] Inspecter le certificat d'un vrai site
> `openssl s_client -connect github.com:443 -servername github.com </dev/null | openssl x509 -noout -issuer -subject -dates`

## Questions

1. Pourquoi HTTPS utilise-t-il à la fois un échange asymétrique (ECDHE, signatures) **et** AES ?
2. Pourquoi ne faut-il pas stocker les mots de passe avec `openssl dgst -sha256` ?
3. Quelle différence entre chiffrer avec une clé publique et signer avec une clé privée ?

## À rendre

Un compte rendu avec les commandes, les sorties importantes et les réponses aux questions.
