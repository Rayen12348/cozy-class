---
date: 2026-11-06
tags: [machine-learning, scikit-learn, python]
---
# TP 1 — Classification avec scikit-learn

**Objectif** : comparer plusieurs classifieurs sur un vrai jeu de données médical et choisir le meilleur avec une démarche propre. Notions du [[Chapitre 1 - Apprentissage supervisé]].

**Prérequis** : Python 3.10+, puis `pip install scikit-learn pandas matplotlib` — ou Google Colab, déjà prêt.

## Le jeu de données

*Breast Cancer Wisconsin* (inclus dans scikit-learn) : 569 tumeurs décrites par 30 mesures, classées **maligne** (0) ou **bénigne** (1).

```python
from sklearn.datasets import load_breast_cancer
data = load_breast_cancer(as_frame=True)
df = data.frame
print(df.shape)
print(df['target'].value_counts())
```

## Partie 1 — Explorer

- [ ] Afficher les 5 premières lignes et `df.describe()`
- [ ] Les deux classes sont-elles équilibrées ?
- [ ] Tracer l'histogramme de `mean radius` pour chaque classe : cette variable sépare-t-elle bien les deux ?

## Partie 2 — Préparer

- [ ] Séparer `X` (les 30 mesures) et `y` (`target`)
- [ ] Découper 80 % / 20 % avec `train_test_split(..., stratify=y, random_state=42)`
- [ ] À quoi sert `stratify=y` ?

## Partie 3 — Comparer trois modèles

```python
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

modeles = {
    'k-NN': make_pipeline(StandardScaler(), KNeighborsClassifier()),
    'Logistique': make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)),
    'Forêt': RandomForestClassifier(random_state=42),
}
for nom, m in modeles.items():
    scores = cross_val_score(m, X_train, y_train, cv=5, scoring='f1')
    print(f'{nom:<11} F1 = {scores.mean():.3f} ± {scores.std():.3f}')
```

- [ ] Lancer la validation croisée : quel modèle gagne ?
- [ ] Refaire k-NN **sans** `StandardScaler` : que se passe-t-il, et pourquoi ?

## Partie 4 — Régler et évaluer

- [ ] Avec `GridSearchCV`, chercher le meilleur nombre de voisins entre 1 et 30 : `param_grid={'kneighborsclassifier__n_neighbors': range(1, 31)}`
- [ ] Entraîner le modèle final sur tout `X_train`, puis l'évaluer **une seule fois** sur `X_test`
- [ ] Afficher la matrice de confusion (`ConfusionMatrixDisplay.from_estimator`) et le `classification_report`

> [!question] Réflexion
> Ici, « maligne » vaut 0. Rater une tumeur maligne est bien plus grave qu'une fausse alerte. Quelle métrique faut-il surveiller en priorité, et pour quelle classe ?

## Bonus

- [ ] Tracer le F1 de validation en fonction du nombre de voisins : repérer la zone de sur-apprentissage (petit $k$)
- [ ] Afficher les 10 variables les plus importantes de la forêt (`feature_importances_`)

## À rendre

Le notebook avec les résultats et une conclusion de 5 lignes : quel modèle, quelle métrique, quel score sur le test.
