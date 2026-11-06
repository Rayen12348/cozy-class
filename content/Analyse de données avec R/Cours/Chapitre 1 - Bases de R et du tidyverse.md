---
date: 2026-11-06
tags: [r, tidyverse, dplyr, ggplot2, statistiques]
---
# Bases de R et du tidyverse

**R** est un langage conçu pour les **statistiques** et l'**analyse de données**. On l'utilise dans **RStudio** (ou Positron), presque toujours avec le **tidyverse**, un ensemble de paquets qui rendent le code plus lisible.

```r
install.packages("tidyverse")   # une seule fois
library(tidyverse)              # à chaque session
```

## Les types de base

```r
x <- 42                          # numérique (on affecte avec <-)
nom <- "Sami"                    # caractère
ok <- TRUE                       # logique
notes <- c(12, 15.5, 9, 17)      # vecteur : c() combine des valeurs
mean(notes)                      # 13.375
notes[2]                         # 15.5 — les indices commencent à 1 !
notes[notes >= 10]               # filtrage : 12 15.5 17
```

> [!remarque] La vectorisation
> Les opérations s'appliquent à tout le vecteur d'un coup : `notes * 2`, `notes + 1`, `sqrt(notes)`. Pas besoin de boucle.

| Structure | Contenu | Création |
|---|---|---|
| vecteur | des valeurs d'un seul type | `c(1, 2, 3)` |
| facteur | des catégories (niveaux) | `factor(c("A", "B", "A"))` |
| liste | des éléments de types différents | `list(nom = "Sami", age = 22)` |
| data frame / tibble | un tableau : des colonnes de même longueur | `tibble(x = 1:3, y = c("a", "b", "c"))` |

## Importer des données

```r
df <- read_csv("ventes.csv")      # readr (tidyverse)
glimpse(df)                        # aperçu des colonnes et de leurs types
summary(df)                        # statistiques de chaque colonne
```

Pour Excel : `readxl::read_excel("fichier.xlsx")`.

## Manipuler avec dplyr

Le **pipe** `|>` (ou `%>%`) passe le résultat d'une étape à la suivante : on lit le code de haut en bas, comme une recette.

| Verbe | Rôle |
|---|---|
| `filter()` | garder des **lignes** selon une condition |
| `select()` | garder des **colonnes** |
| `mutate()` | créer ou modifier une colonne |
| `arrange()` | trier (`desc()` pour l'ordre décroissant) |
| `group_by()` + `summarise()` | calculer par groupe |
| `count()` | compter par modalité |

```r
mtcars |>
  filter(hp > 100) |>
  mutate(conso_l100 = 235.21 / mpg) |>
  group_by(cyl) |>
  summarise(n = n(), conso_moy = mean(conso_l100), puissance_moy = mean(hp)) |>
  arrange(desc(conso_moy))
```

> [!tip] L'équivalent SQL
> `filter` ≈ `WHERE` · `select` ≈ `SELECT` · `group_by` + `summarise` ≈ `GROUP BY` · `arrange` ≈ `ORDER BY` · `left_join` ≈ `LEFT JOIN`.

**Valeurs manquantes** : `NA`. `mean(x)` renvoie `NA` s'il manque une seule valeur → `mean(x, na.rm = TRUE)`. Pour les repérer : `is.na(x)`, `sum(is.na(x))`, `drop_na(df)`.

## Visualiser avec ggplot2

Un graphique = des **données** + des **correspondances** (`aes` : quelle variable va sur x, sur y, en couleur…) + des **géométries** (`geom_…`).

```r
ggplot(mtcars, aes(x = wt, y = mpg, color = factor(cyl))) +
  geom_point(size = 3) +
  geom_smooth(method = "lm", se = FALSE) +
  labs(title = "Consommation selon le poids", x = "Poids (1000 lbs)", y = "Miles par gallon", color = "Cylindres")
```

| Je veux montrer… | Géométrie |
|---|---|
| la distribution d'une variable | `geom_histogram()`, `geom_boxplot()` |
| la relation entre deux variables | `geom_point()` |
| une évolution dans le temps | `geom_line()` |
| des effectifs par catégorie | `geom_bar()` / `geom_col()` |

## Statistiques descriptives

- **Position** : moyenne `mean()`, médiane `median()`, quantiles `quantile()`.
- **Dispersion** : écart-type `sd()`, variance `var()`, étendue `range()`, écart interquartile `IQR()`.
- **Liaison** : corrélation `cor(x, y)`, entre −1 et 1.

> [!warning] Corrélation n'est pas causalité
> Les ventes de glaces et les noyades sont corrélées… parce que les deux augmentent en été.

## Un premier modèle : la régression linéaire

```r
modele <- lm(mpg ~ wt + hp, data = mtcars)
summary(modele)      # coefficients, p-values, R²
predict(modele, newdata = tibble(wt = 3, hp = 120))
```

- Le **coefficient** de `wt` : la variation de `mpg` quand le poids augmente d'une unité, le reste étant fixé.
- **p-value** < 0,05 : l'effet est statistiquement significatif.
- **R²** : la part de la variance expliquée par le modèle (entre 0 et 1).

C'est la même régression que dans le [[Chapitre 1 - Apprentissage supervisé|cours de Machine Learning]], vue ici sous l'angle statistique. Les mesures du [[TP 1 - Capteur connecté avec MQTT|TP d'IoT]] sont un bon terrain d'entraînement.

> [!abstract] À retenir
> Vecteurs et tibbles · importer avec `read_csv` · transformer avec les verbes de dplyr enchaînés par `|>` · visualiser avec `ggplot(aes()) + geom_…()` · résumer avec `mean`, `sd`, `cor` · modéliser avec `lm`. Fiche : [[Résumé - R et tidyverse]].
