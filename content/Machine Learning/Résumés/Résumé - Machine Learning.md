---
date: 2026-11-06
tags: [machine-learning]
---
# Résumé — Machine Learning

## Vocabulaire

| Terme | Sens |
|---|---|
| Variable (*feature*) | une colonne de $X$ |
| Étiquette (*label*) | la valeur $y$ à prédire |
| Entraînement | ajuster les paramètres du modèle sur les données |
| Hyperparamètre | réglage choisi avant l'entraînement ($k$ de k-NN, profondeur d'un arbre) |
| Validation croisée | découper le train en $k$ parts, entraîner sur $k-1$, valider sur la dernière, puis recommencer |

## Quel modèle ?

| Modèle | Type | Points forts | Attention |
|---|---|---|---|
| Régression linéaire | régression | simple, interprétable | relations linéaires seulement |
| Régression logistique | classification | probabilités, rapide | frontière linéaire |
| k-NN | les deux | aucune hypothèse | normaliser ; lent en prédiction |
| Arbre de décision | les deux | lisible | sur-apprend vite |
| Forêt aléatoire | les deux | robuste, bon choix par défaut | moins interprétable |

## Formules

- $\text{MSE} = \frac{1}{n}\sum (y_i - \hat y_i)^2$
- Précision $= \frac{VP}{VP+FP}$ · Rappel $= \frac{VP}{VP+FN}$ · $F_1 = \frac{2PR}{P+R}$
- Sigmoïde : $\sigma(z) = \frac{1}{1+e^{-z}}$
- Descente de gradient : $w \leftarrow w - \eta \nabla L(w)$

## Diagnostiquer

> [!tip] Comparer train et test
> - Train mauvais, test mauvais → **sous-apprentissage** : modèle plus riche.
> - Train excellent, test mauvais → **sur-apprentissage** : plus de données, régularisation, modèle plus simple.

## Squelette scikit-learn

```python
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
model = make_pipeline(StandardScaler(), LogisticRegression())
model.fit(X_train, y_train)
model.score(X_test, y_test)
```

> [!warning] Erreurs fréquentes
> Normaliser **avant** de découper (fuite d'information) · évaluer sur le train · ne regarder que l'exactitude quand les classes sont déséquilibrées.

Cours : [[Chapitre 1 - Apprentissage supervisé]] · TP : [[TP 1 - Classification avec scikit-learn]] · la même chose en R : [[Résumé - R et tidyverse]].
