---
date: 2026-11-06
tags: [rest, spring-boot, java]
---
# TP 1 — API REST avec Spring Boot

**Objectif** : construire une API REST complète (CRUD) pour gérer des étudiants, la documenter avec OpenAPI et la tester. Notions du [[Chapitre 1 - SOA, SOAP et REST]].

**Prérequis** : JDK 17+, un IDE (IntelliJ IDEA, VS Code), Postman ou `curl`.

## Partie 1 — Créer le projet

Sur [start.spring.io](https://start.spring.io) : Maven, Java 17+, dépendances **Spring Web**, **Spring Data JPA**, **H2 Database** et **Validation**.

- [ ] Générer, ouvrir le projet et lancer `./mvnw spring-boot:run`
- [ ] Vérifier que `http://localhost:8080` répond (une page « Whitelabel Error » 404 est normale à ce stade)

## Partie 2 — La ressource `Etudiant`

```java
@Entity
public class Etudiant {
    @Id @GeneratedValue
    private Long id;
    @NotBlank private String nom;
    @Email private String email;
    @Min(0) @Max(20) private double moyenne;
    // constructeurs, getters, setters
}

public interface EtudiantRepository extends JpaRepository<Etudiant, Long> {
    List<Etudiant> findByMoyenneGreaterThanEqual(double min);
}
```

- [ ] Créer l'entité et le repository
- [ ] Insérer 3 étudiants au démarrage avec un `CommandLineRunner`

## Partie 3 — Le contrôleur

| Méthode | URI | Réponse attendue |
|---|---|---|
| `GET` | `/api/etudiants` | `200` + liste |
| `GET` | `/api/etudiants/{id}` | `200` ou `404` |
| `POST` | `/api/etudiants` | `201` + en-tête `Location` |
| `PUT` | `/api/etudiants/{id}` | `200` ou `404` |
| `DELETE` | `/api/etudiants/{id}` | `204` ou `404` |
| `GET` | `/api/etudiants?min=12` | les étudiants dont la moyenne est ≥ 12 |

- [ ] Implémenter les six routes en respectant **exactement** les codes de statut
- [ ] Ajouter `@Valid` sur le corps des `POST` et `PUT` : un email invalide doit renvoyer `400`

## Partie 4 — Tester

```sh
curl -i http://localhost:8080/api/etudiants
curl -i -X POST http://localhost:8080/api/etudiants \
     -H 'Content-Type: application/json' \
     -d '{"nom":"Sami","email":"sami@exemple.com","moyenne":14.5}'
curl -i -X DELETE http://localhost:8080/api/etudiants/1
```

- [ ] Tester chaque route avec `curl` ou une collection Postman
- [ ] Vérifier les cas d'erreur : identifiant inexistant, JSON invalide, moyenne égale à 25

## Partie 5 — Documenter

- [ ] Ajouter la dépendance `org.springdoc:springdoc-openapi-starter-webmvc-ui`
- [ ] Ouvrir `http://localhost:8080/swagger-ui.html` et tester l'API depuis la page
- [ ] Récupérer le contrat brut sur `/v3/api-docs` : à quoi correspond-il dans le monde SOAP ?

> [!tip] Des erreurs propres
> Une classe annotée `@RestControllerAdvice`, avec un `@ExceptionHandler` par type d'erreur, renvoie des messages JSON clairs au lieu de la page d'erreur par défaut.

## Bonus

- [ ] Pagination : `GET /api/etudiants?page=0&size=5` avec `Pageable`
- [ ] Consommer l'API depuis l'application du [[TP 1 - Application de tâches avec Expo|TP de développement mobile]] (sur le téléphone, `localhost` désigne le téléphone : utiliser l'IP du PC)

## À rendre

Le projet (sans le dossier `target/`) et la collection Postman exportée.
