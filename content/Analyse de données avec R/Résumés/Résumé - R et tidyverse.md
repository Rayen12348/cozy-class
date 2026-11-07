---
date: 2026-11-06
tags: [r, tidyverse]
---
# Résumé — R et tidyverse

## Syntaxe de base

| Action | Syntaxe |
|---|---|
| Affecter | `x <- 5` |
| Créer un vecteur | `c(1, 2, 3)` · `1:10` · `seq(0, 1, by = 0.1)` |
| Indexer | `v[1]` (commence à **1**) · `v[v > 2]` |
| Créer un tableau | `tibble(a = 1:3, b = c("x", "y", "z"))` · colonne : `df$a` |
| Obtenir de l'aide | `?mean` |
| Valeurs manquantes | `NA` · `is.na()` · `na.rm = TRUE` |

## dplyr

```r
df |>
  filter(condition) |>            # lignes
  select(col1, col2) |>           # colonnes
  mutate(nouvelle = col1 * 2) |>  # nouvelle colonne
  group_by(groupe) |>
  summarise(moy = mean(col1, na.rm = TRUE), n = n()) |>
  arrange(desc(moy))              # tri
```

Jointures : `left_join(a, b, by = "id")` · `inner_join` · `full_join`.

## ggplot2

> [!methode] La grammaire des graphiques
> `ggplot(données, aes(x = …, y = …, color = …)) + geom_…() + labs(…)`

| Objectif | `geom_` |
|---|---|
| distribution | `histogram`, `boxplot`, `density` |
| relation | `point` (+ `smooth`) |
| évolution | `line` |
| effectifs | `bar` / `col` |

Un graphique par groupe : `facet_wrap(~ variable)`.

## Statistiques

| Mesure | Fonction |
|---|---|
| moyenne / médiane | `mean()` / `median()` |
| écart-type / variance | `sd()` / `var()` |
| quantiles / écart interquartile | `quantile()` / `IQR()` |
| corrélation | `cor(x, y)` |
| résumé rapide | `summary()` |

## Régression linéaire

```r
m <- lm(y ~ x1 + x2, data = df)
summary(m)                    # coefficients, p-values, R²
predict(m, newdata = nouveau)
```

p-value < 0,05 → effet significatif · R² proche de 1 → bon ajustement.

> [!warning] Les pièges
> Les indices commencent à 1 · un `NA` contamine les calculs · corrélation ≠ causalité · paradoxe de Simpson (une tendance globale peut s'inverser dans chaque groupe).

Cours : [[Chapitre 1 - Bases de R et du tidyverse]] · TP : [[TP 1 - Explorer un jeu de données avec dplyr et ggplot2]] · modèles prédictifs : [[Résumé - Chapitre 1 - Introduction et démarche expérimentale|Machine Learning]].
