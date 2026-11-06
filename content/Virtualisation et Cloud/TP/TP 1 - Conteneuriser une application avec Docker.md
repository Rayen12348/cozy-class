---
date: 2026-11-06
tags: [docker, conteneurs, cloud]
---
# TP 1 — Conteneuriser une application avec Docker

**Objectif** : empaqueter une petite API et sa base de données dans des conteneurs, puis les faire tourner ensemble avec Docker Compose. Notions du [[Chapitre 1 - Virtualisation et conteneurs]].

**Prérequis** : Docker installé (`docker --version`), ou [Play with Docker](https://labs.play-with-docker.com) dans le navigateur.

## Partie 1 — Premiers pas

- [ ] `docker run hello-world` : expliquer ce qui s'est passé (registre, image, conteneur)
- [ ] `docker run -d -p 8080:80 --name web nginx`, puis ouvrir `http://localhost:8080`
- [ ] `docker ps`, `docker logs web`, `docker exec -it web sh` : où se trouve la page d'accueil de nginx ?
- [ ] `docker stop web && docker rm web`

## Partie 2 — Une image à soi

Dans un dossier `api/`, créer `server.js` :

```js
const http = require('http');
const os = require('os');
let visites = 0;

http.createServer((req, res) => {
  visites++;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message: 'Bonjour depuis un conteneur', visites, hote: os.hostname() }));
}).listen(3000, () => console.log('API sur le port 3000'));
```

et un `package.json` minimal (`npm init -y`).

- [ ] Écrire le `Dockerfile` (image de base `node:22-alpine`, port `3000`)
- [ ] Construire avec `docker build -t mon-api:1.0 .`, puis lancer sur le port `8080`
- [ ] Lancer **trois** conteneurs de la même image sur les ports 8081, 8082 et 8083 : la valeur `hote` change-t-elle ? Et `visites` ?
- [ ] `docker images` : quelle est la taille de l'image ? Comparer avec une base `node:22` (sans `-alpine`)

## Partie 3 — Données persistantes

- [ ] Lancer PostgreSQL : `docker run -d --name db -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:17`
- [ ] Créer une table avec `docker exec -it db psql -U postgres`
- [ ] Supprimer le conteneur (`docker rm -f db`) et le recréer avec **le même volume** : la table est-elle toujours là ? Et sans `-v` ?

## Partie 4 — Docker Compose

```yaml
# compose.yaml
services:
  api:
    build: ./api
    ports: ["8080:3000"]
    depends_on: [db]
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/postgres
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret
    volumes: [pgdata:/var/lib/postgresql/data]
volumes:
  pgdata:
```

- [ ] `docker compose up -d --build`, puis `docker compose ps` et `docker compose logs api`
- [ ] Dans `DATABASE_URL`, pourquoi l'hôte s'appelle-t-il `db` et non `localhost` ?
- [ ] Comparer `docker compose down` et `docker compose down -v`

> [!warning] Les mots de passe
> `POSTGRES_PASSWORD: secret` passe en TP. En vrai, les secrets vont dans un fichier `.env` non versionné ou dans un gestionnaire de secrets.

## Questions

1. Donner deux différences concrètes entre ce conteneur et une VM VirtualBox.
2. Louer une VM pour y installer Docker : quel modèle de service cloud ? Et confier directement son image à un service comme Google Cloud Run ?
3. Pourquoi `visites` repart-il à 0 quand on redémarre le conteneur ?

## Bonus

- [ ] Publier l'image sur Docker Hub (`docker tag`, `docker push`)
- [ ] Écrire un *multi-stage build* pour réduire encore la taille de l'image

## À rendre

Le dossier du projet (`api/`, `Dockerfile`, `compose.yaml`) et les réponses aux questions.
