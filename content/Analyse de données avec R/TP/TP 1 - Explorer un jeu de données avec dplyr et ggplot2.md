---
date: 2026-11-06
tags: [r, dplyr, ggplot2]
---
# TP 1 — Explorer un jeu de données avec dplyr et ggplot2

**Objectif** : mener une analyse exploratoire complète — importer, nettoyer, résumer, visualiser, modéliser — et en tirer des conclusions. Notions du [[Chapitre 1 - Bases de R et du tidyverse]].

**Prérequis** : R 4.x et RStudio, ou [Posit Cloud](https://posit.cloud) dans le navigateur.

```r
install.packages(c("tidyverse", "palmerpenguins"))
library(tidyverse)
library(palmerpenguins)
```

## Le jeu de données

`penguins` : 344 manchots de l'archipel Palmer (Antarctique), de 3 espèces et 3 îles, avec la longueur et la hauteur du bec, la longueur des nageoires, la masse et le sexe.

## Partie 1 — Découvrir

- [ ] `glimpse(penguins)` : combien de lignes, de colonnes ? De quels types ?
- [ ] Combien de valeurs manquantes par colonne ? (`colSums(is.na(penguins))`)
- [ ] Créer `pg <- drop_na(penguins)` : combien de lignes perd-on ?
- [ ] `count(pg, species, island)` : toutes les espèces vivent-elles sur toutes les îles ?

## Partie 2 — Résumer avec dplyr

- [ ] La masse moyenne et l'écart-type **par espèce et par sexe**
- [ ] L'espèce qui a le bec le plus long en moyenne
- [ ] Ajouter une colonne `masse_kg` et une colonne `gabarit` (`"petit"` ou `"grand"` selon que la masse est sous ou au-dessus de la médiane) avec `mutate()` et `if_else()`
- [ ] Les 5 manchots les plus lourds de l'île Biscoe

```r
pg |>
  group_by(species, sex) |>
  summarise(n = n(), masse_moy = mean(body_mass_g), masse_sd = sd(body_mass_g), .groups = "drop") |>
  arrange(desc(masse_moy))
```

## Partie 3 — Visualiser avec ggplot2

- [ ] Histogramme de `flipper_length_mm` coloré par espèce (`fill = species`, `alpha = 0.6`)
- [ ] Boîtes à moustaches de la masse par espèce et par sexe
- [ ] Nuage de points `bill_length_mm` × `bill_depth_mm` coloré par espèce
- [ ] Ajouter `geom_smooth(method = "lm")` à ce nuage, d'abord sans puis avec `color = species` : que remarques-tu ?

> [!question] Le paradoxe de Simpson
> Sur l'ensemble des manchots, la relation entre la longueur et la hauteur du bec semble **négative**. À l'intérieur de chaque espèce, elle est **positive**. Comment l'expliquer ?

## Partie 4 — Corrélations et modèle

- [ ] La matrice de corrélation des 4 mesures : `pg |> select(where(is.numeric), -year) |> cor()`
- [ ] Quelle mesure est la plus corrélée à la masse ?
- [ ] Le modèle `lm(body_mass_g ~ flipper_length_mm, data = pg)` : interpréter le coefficient et le R²
- [ ] Ajouter `species` au modèle : le R² s'améliore-t-il ?
- [ ] Prédire la masse d'un manchot Gentoo dont la nageoire mesure 220 mm

## Partie 5 — Rapport

- [ ] Rassembler le code et les graphiques dans un document **Quarto** (`.qmd`) ou **R Markdown** (`.Rmd`), rendu en HTML
- [ ] Conclure en 5 phrases : ce qui distingue les trois espèces

## Bonus

Prédire l'espèce avec un arbre de décision (paquet `rpart`) et comparer avec la démarche du [[TP 1 - Classification avec scikit-learn|TP de Machine Learning]].

## À rendre

Le fichier `.qmd` ou `.Rmd` et le rapport HTML généré.
