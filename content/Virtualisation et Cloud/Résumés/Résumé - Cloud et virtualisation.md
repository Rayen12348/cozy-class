---
date: 2026-11-06
tags: [cloud, virtualisation, docker]
---
# Résumé — Cloud et virtualisation

## Hyperviseurs

- **Type 1** (bare metal) : directement sur le matériel → ESXi, Proxmox/KVM, Hyper-V, Xen. Datacenters.
- **Type 2** (hébergé) : sur un OS → VirtualBox, VMware Workstation. Poste de travail.

## VM ou conteneur

| | VM | Conteneur |
|---|---|---|
| Isole | une machine entière | un processus |
| OS | le sien | noyau de l'hôte partagé |
| Taille / démarrage | Go / minutes | Mo / secondes |
| Technologies | hyperviseur | namespaces + cgroups |

## Docker — l'essentiel

| Commande | Effet |
|---|---|
| `docker build -t nom .` | construire une image depuis le `Dockerfile` |
| `docker run -d -p 8080:80 nom` | lancer (port hôte:conteneur) |
| `docker ps` / `docker ps -a` | conteneurs actifs / tous |
| `docker logs`, `docker exec -it … sh` | lire la sortie / entrer dans le conteneur |
| `docker compose up -d` / `down` | lancer / arrêter toute la pile |

Instructions du Dockerfile : `FROM` · `WORKDIR` · `COPY` · `RUN` · `ENV` · `EXPOSE` · `CMD`.

> [!tip] Les données
> Un conteneur est **jetable** : tout ce qui doit survivre va dans un **volume**.

## Kubernetes en 4 mots

**Pod** (conteneurs déployés ensemble) · **Deployment** (N répliques, mises à jour) · **Service** (adresse stable + répartition) · **Nœud** (une machine).

## Cloud

> [!definition] 5 caractéristiques (NIST)
> libre-service · accès réseau · mutualisation · élasticité · service mesuré

| | IaaS | PaaS | SaaS |
|---|---|---|---|
| Tu gères | OS → appli → données | appli → données | tes données |
| Exemple | EC2, Azure VM | Heroku, App Engine | Gmail, Microsoft 365 |

Déploiement : **public** · **privé** · **hybride** · **communautaire**.

Cours : [[Chapitre 1 - Virtualisation et conteneurs]] · TP : [[TP 1 - Conteneuriser une application avec Docker]] · même UE : [[Résumé - Big Data]].
