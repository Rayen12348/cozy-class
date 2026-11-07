---
date: 2026-11-07
ordre: 2
tags: [machine-learning, resume, knn, distance, normalisation]
---
# Résumé — Chapitre 2 : les k plus proches voisins (k-NN)

Support : [[Chapitre 2 - k-Nearest Neighbors (k-NN).pdf]] (23 diapositives) · Dr. Ing. Ones Sidhom · précédent : [[Résumé - Chapitre 1 - Introduction et démarche expérimentale]] · suite : [[Résumé - Chapitre 3 - SVM]]

Le chapitre en quatre mots : **distance → voisins → vote → prédiction**.

## 1. Définition

*Diapositive 2*

> [!definition] k-NN (*k-Nearest Neighbors*)
> Un algorithme d'apprentissage **supervisé** fondé sur la **proximité** entre observations. Son hypothèse : **des observations proches dans l'espace des caractéristiques ont généralement des comportements similaires.** « Dis-moi qui sont tes voisins, je te dirai qui tu es. »

| Caractéristique | Ce que ça veut dire |
|---|---|
| **Non paramétrique** | il ne suppose aucune forme prédéfinie du modèle (pas de droite, pas de courbe imposée) |
| **Instance-based** (basé sur les instances) | les données d'apprentissage servent **directement** de référence |
| **Lazy learning** (apprentissage paresseux) | il ne construit **pas de modèle explicite** pendant l'apprentissage : il garde les exemples et attend la prédiction pour travailler |
| Classification **et** régression | vote des voisins, ou moyenne de leurs valeurs |
| Dépend de la **distance** | et de la façon dont les features sont représentées (échelles, choix des variables) |

## 2. Les données

*Diapositive 3*

| ID | Taille tumeur | Texture | Âge | Classe |
|---|---|---|---|---|
| 1 | 1,2 | 0,31 | 42 | Bénigne |
| 2 | 4,7 | 0,82 | 61 | Maligne |
| 3 | 1,8 | 0,44 | 39 | Bénigne |
| 4 | 5,2 | 0,76 | 58 | Maligne |

Une ligne = une instance, une colonne = une feature, le label = la classe à prédire (voir le [[Résumé - Chapitre 1 - Introduction et démarche expérimentale#2. Anatomie d'un dataset|chapitre 1]]). Particularité du k-NN : **les features servent directement à calculer les distances**. Elles doivent donc être numériques et à des échelles comparables (section 8).

## 3. L'algorithme

*Diapositives 4 à 6*

Pour prédire un nouveau point, on regarde les **exemples étiquetés les plus proches** :

1. choisir le nombre $k$ de voisins ;
2. calculer la **distance** entre le nouveau point et **tous** les points connus ;
3. garder les $k$ points les plus proches ;
4. compter combien de ces $k$ voisins appartiennent à chaque classe ;
5. attribuer au nouveau point la **classe majoritaire**.

```mermaid
flowchart LR
  N["Nouveau point"] --> D["Distance à tous<br/>les points connus"] --> V["Les k plus proches"] --> C["Vote :<br/>on compte les classes"] --> P["Classe majoritaire<br/>= prédiction"]
```

> [!exemple] L'exemple illustré de la diapositive 6 (k = 4)
>
> | Voisin | Distance | Rang |
> |---|---|---|
> | jaune | 2,1 | 1er |
> | jaune | 2,4 | 2e |
> | vert | 3,1 | 3e |
> | orange | 4,5 | 4e |
>
> Votes : jaune 2, vert 1, orange 1 → le point est classé **jaune**.

## 4. L'effet de k sur le vote

*Diapositive 7*

Sur un même point (le losange orange), seule la valeur de $k$ change :

| $k$ | Voisins retenus | Prédiction |
|---|---|---|
| 1 | 1 vert | **verte** |
| 3 | 2 verts, 1 bleu | **verte** |
| 5 | 3 bleus, 2 verts | **bleue** |

Changer $k$ change la **taille du voisinage**, et peut changer la classe prédite.

> [!tip] Un k impair en binaire
> Avec deux classes, un $k$ impair évite les égalités (2 contre 2 est impossible avec $k = 5$).

## 5. Mesurer la distance

*Diapositives 8 à 12*

Le k-NN a besoin d'une **fonction de distance** entre deux observations : plus la distance est faible, plus les points sont **similaires**. Le cours cite cinq distances : euclidienne, Manhattan, Minkowski, Jaccard et Hamming. Les deux premières sont détaillées.

### Distance euclidienne

La distance « à vol d'oiseau » : la racine de la somme des différences au carré.

$$d(X, Y) = \sqrt{\sum_{i=1}^{n} (y_i - x_i)^2}$$

> [!exemple] Exemple et exercice des diapositives 9 à 11
> - $A = (2, 3)$, $B = (5, 7)$ : $d = \sqrt{(5-2)^2 + (7-3)^2} = \sqrt{9 + 16} = 5$.
> - Exercice : $A = (1, 1)$, $B = (5, 4)$. Écarts : $x_1$ : $5 - 1 = 4$ ; $x_2$ : $4 - 1 = 3$. $d = \sqrt{16 + 9} =$ **5**.

**Quand l'utiliser** : variables **numériques continues**, sur des **échelles comparables**, sans trop de **valeurs aberrantes** (le carré amplifie les grands écarts).

### Distance de Manhattan

La distance « en suivant les rues d'un quadrillage » : la somme des écarts absolus, sans racine ni carré.

$$d(p, q) = \sum_{i=1}^{n} |p_i - q_i|$$

Sur l'exercice précédent : $|5 - 1| + |4 - 1| = 4 + 3 =$ **7** (contre 5 en euclidien : on ne peut pas couper en diagonale).

**Quand l'utiliser** (selon le cours) : données **discrètes**, caractéristiques aux relations non linéaires ou indépendantes, données de **plus grande dimension**. Elle est aussi moins sensible aux valeurs aberrantes, puisqu'il n'y a pas de carré.

> [!remarque] Catégories non ordonnées
> Pour des catégories sans ordre (couleur, ville…), aucune distance numérique n'a de sens directement : il faut d'abord les encoder, par exemple en *one-hot* (une colonne 0/1 par catégorie). On compte alors les différences : c'est la distance de **Hamming**, ci-dessous.

> [!tip]- Complément : les trois autres distances citées
> | Distance | Formule | Pour |
> |---|---|---|
> | **Minkowski** | $\left(\sum_i \lvert x_i - y_i\rvert^p\right)^{1/p}$ | la forme générale : $p = 1$ donne Manhattan, $p = 2$ donne l'euclidienne (c'est la distance par défaut de scikit-learn, avec $p = 2$) |
> | **Hamming** | nombre de positions où les deux vecteurs diffèrent | données binaires ou catégorielles : `(rouge, M, oui)` et `(rouge, L, non)` sont à distance 2 |
> | **Jaccard** | $1 - \frac{\lvert A \cap B\rvert}{\lvert A \cup B\rvert}$ | des ensembles : deux paniers `{pain, lait, œufs}` et `{pain, lait, café}` ont 2 éléments communs sur 4 différents, distance $1 - 2/4 = 0{,}5$ |

## 6. Bien choisir k

*Diapositive 13*

$k$ indique **combien de voisins participent à la décision**. C'est un **hyperparamètre** : il se choisit sur l'ensemble de **validation** (voir le chapitre 1).

| | $k$ petit (ex. 1) | $k$ intermédiaire | $k$ grand |
|---|---|---|---|
| Décision | très **locale** | souvent le **bon compromis** | plus **lissée** |
| Bruit | **sensible** : un seul point bruité change la décision | | **moins sensible** |
| Frontière | souvent **irrégulière** | | plus **régulière** |
| Risque | **overfitting** : mémorise des détails locaux non généralisables | | **underfitting** : peut ignorer une structure locale réelle |

![[ml-ch2-effet-de-k.png]]

Sur ces deux classes en forme de lunes (210 points d'entraînement) : avec $k = 1$, la frontière fait des îlots autour de chaque point isolé et le score train est parfait (1,00) mais tombe à 0,91 en validation. Avec $k = 15$, train et validation sont égaux (0,93). Avec $k = 150$, la frontière devient presque une droite et les deux scores chutent (0,80) : c'est le tableau underfitting / overfitting du chapitre 1.

## 7. Le vote pondéré par la distance

*Diapositive 14*

Les voisins les plus proches peuvent **peser davantage** que les plus éloignés : on donne à chaque voisin un **poids proportionnel à 1 / distance**.

| Voisin | Distance | Classe | Poids $1/d$ |
|---|---|---|---|
| A | 0,10 | Maligne | 10 |
| B | 0,45 | Bénigne | 2,22 |
| C | 0,50 | Bénigne | 2 |
| D | 0,80 | Bénigne | 1,25 |

Avec ces 4 voisins ($k = 4$), les deux votes ne donnent pas le même résultat (la diapositive ne fait pas le calcul) :

- **vote simple** : Bénigne 3, Maligne 1 → **Bénigne** ;
- **vote pondéré** : Maligne $10$ contre Bénigne $2{,}22 + 2 + 1{,}25 = 5{,}47$ → **Maligne**.

Le voisin A est presque collé au nouveau point : avec la pondération, son avis compte plus que celui des trois autres réunis. Dans scikit-learn : `KNeighborsClassifier(n_neighbors=4, weights="distance")`.

## 8. Normalisation et standardisation

*Diapositives 15 à 18*

> [!warning] Le piège n° 1 du k-NN
> Le k-NN repose **directement** sur les distances : il est **très sensible à l'échelle** des variables (*scaling*).

| Feature | Ordre de grandeur |
|---|---|
| âge | 18 à 70 |
| revenu | 5 000 à 100 000 |

| Sans mise à l'échelle | Avec mise à l'échelle |
|---|---|
| le revenu **domine** la distance | variables **comparables** |
| l'âge ne pèse presque rien | distance plus **équilibrée** |
| voisins biaisés par l'échelle | voisinage plus **cohérent** |
| prédictions trompeuses | le choix des features reste nécessaire |

### Les deux méthodes

| | **Normalisation Min-Max** | **Standardisation (Z-score)** |
|---|---|---|
| Formule | $x' = \dfrac{x - x_{\min}}{x_{\max} - x_{\min}}$ | $x' = \dfrac{x - \mu}{\sigma}$ ($\mu$ : moyenne, $\sigma$ : écart-type) |
| Résultat | valeurs **bornées dans [0, 1]** | moyenne ≈ 0, écart-type ≈ 1, valeurs **non bornées** |
| À utiliser quand | on veut des valeurs bornées ; échelles très différentes | on veut une échelle comparable, sans bornes obligatoires |
| Attention | **sensible aux valeurs aberrantes** : un seul revenu énorme écrase tous les autres près de 0 | |
| scikit-learn | `MinMaxScaler` | `StandardScaler` |

L'**écart-type** $\sigma$ mesure à quel point les valeurs sont dispersées autour de la moyenne.

### L'exemple de la diapositive 18

| Variable | Client A | Client B | Écart brut | Écart après mise à l'échelle |
|---|---|---|---|---|
| âge | 25 | 35 | 10 | 0,18 |
| revenu | 20 000 | 26 000 | 6 000 | 0,07 |

En brut, l'écart de revenu (6 000) écrase l'écart d'âge (10) : dans la distance euclidienne, l'âge compte pour 0,0003 % de la somme des carrés. Une fois mis à l'échelle, l'écart d'âge (dix ans sur une vie adulte) pèse plus que l'écart de revenu (6 000 sur une plage de 95 000), ce qui est plus raisonnable.

> [!remarque] D'où viennent les valeurs mises à l'échelle ?
> Avec les plages de la diapositive 15 (18–70 et 5 000–100 000), le Min-Max donne pour l'âge 0,13 → 0,33 (écart 0,19) et pour le revenu 0,16 → 0,22 (écart 0,06). Les valeurs d'âge de la diapositive (0,20 → 0,38) correspondent donc à une autre plage, mais les écarts et la conclusion sont les mêmes.

**Le scaling ne rend pas les features bonnes** : il rend leur comparaison numérique plus raisonnable. Une variable inutile reste inutile, et ajoute du bruit au voisinage.

> [!important] Calculer le scaler sur le train seulement
> Le minimum, le maximum, la moyenne et l'écart-type se calculent **sur le train**, puis s'appliquent tels quels à la validation et au test (`fit` sur le train, `transform` partout). Sinon, des informations du test fuient dans l'apprentissage. Un `Pipeline` scikit-learn le fait automatiquement (section 12).

## 9. Le k-NN en régression

*Diapositive 19*

Même démarche, mais au lieu de voter on fait la **moyenne** des valeurs des $k$ voisins.

| Voisin | Distance | Prix (milliers) |
|---|---|---|
| 1 | 0,15 | 180 |
| 2 | 0,28 | 190 |
| 3 | 0,34 | 200 |

$$\text{prédiction} = \frac{180 + 190 + 200}{3} = 190$$

**En classification on vote, en régression on moyenne.** (La pondération par $1/d$ de la section 7 marche aussi : c'est alors une moyenne pondérée. Dans scikit-learn : `KNeighborsRegressor`.)

## 10. Avantages et limites

*Diapositives 20 et 21*

| Avantage | Pourquoi c'est utile |
|---|---|
| Simple à comprendre | la décision se lit à partir des voisins |
| Intuitif | fondé sur la similarité locale |
| Non paramétrique | aucune forme globale imposée |
| Bonne *baseline* (modèle de référence) | rapide à expliquer et à tester |

| Limite | Conséquence |
|---|---|
| distance mal choisie | voisins peu pertinents |
| scaling oublié | une variable domine |
| variables inutiles | bruit dans le voisinage |
| grande dimension | la proximité devient moins informative (en très grande dimension, tous les points finissent à peu près à la même distance les uns des autres) |
| grand dataset | prédiction coûteuse |
| $k$ trop petit | sensibilité au bruit |
| $k$ trop grand | décision trop lissée |

## 11. Coût et passage à l'échelle

*Diapositives 22 et 23*

| Étape | Coût | Pourquoi |
|---|---|---|
| Entraînement | **faible** | on stocke simplement les données |
| Prédiction | **plus coûteux** | il faut calculer la distance vers beaucoup d'exemples ($n$ points × $d$ features pour chaque prédiction, en version naïve) |
| Mémoire | **potentiellement importante** | tout le dataset est conservé |

C'est l'inverse de la plupart des modèles, qui apprennent longtemps puis prédisent vite.

Pour **accélérer la recherche des voisins**, on construit un **index spatial** qui évite de comparer à tous les points :

```mermaid
flowchart LR
  D["Dataset complet"] --> I["Index spatial"] --> R["Recherche<br/>plus rapide"] --> V["Voisins candidats"]
```

- **KD-tree** et **Ball-tree** : découpent l'espace en régions emboîtées. Utiles pour accélérer, mais leur efficacité **baisse quand la dimension augmente**. Dans scikit-learn : `algorithm="kd_tree"` ou `"ball_tree"` (par défaut, `"auto"` choisit).
- **Approximate NN** (voisins approchés) : on accepte de ne pas trouver exactement les $k$ plus proches, pour les très grands datasets.

Ces techniques **aident le calcul**, mais **ne corrigent pas une mauvaise représentation** des données.

## 12. En pratique avec scikit-learn

*Complément, hors diapositives : exécuté avec Python 3.14 et scikit-learn 1.9.*

### Les 5 étapes, écrites à la main

```python
# knn_a_la_main.py
from collections import Counter

import numpy as np


def knn_predict(X_train, y_train, x_new, k=3):
    distances = np.sqrt(((X_train - x_new) ** 2).sum(axis=1))   # 2. distance euclidienne à chaque point
    voisins = np.argsort(distances)[:k]                          # 3. les k plus proches
    votes = Counter(y_train[voisins])                            # 4. on compte les classes
    return votes.most_common(1)[0][0]                            # 5. la classe majoritaire


# Les 4 tumeurs du chapitre : taille, texture (même échelle à peu près)
X_train = np.array([[1.2, 0.31], [4.7, 0.82], [1.8, 0.44], [5.2, 0.76]])
y_train = np.array(["Bénigne", "Maligne", "Bénigne", "Maligne"])

print(knn_predict(X_train, y_train, np.array([4.0, 0.70]), k=3))   # proche des malignes
print(knn_predict(X_train, y_train, np.array([1.5, 0.40]), k=3))   # proche des bénignes
```

```text
Maligne
Bénigne
```

Il n'y a pas d'étape « entraînement » : la fonction reçoit directement les données, c'est le *lazy learning*. Appliquée aux 171 tumeurs de test du jeu de données de la section suivante, cette fonction donne exactement les mêmes prédictions que `KNeighborsClassifier` (171 sur 171).

### Scaling et choix de k sur 569 vraies tumeurs

```python
# knn_sklearn.py
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_breast_cancer(return_X_y=True)
print("échelles très différentes :", X[:, 3].min(), "à", X[:, 3].max(), "(aire) contre",
      X[:, 9].min(), "à", X[:, 9].max(), "(dimension fractale)")

X_train, X_tmp, y_train, y_tmp = train_test_split(X, y, test_size=0.30, stratify=y, random_state=42)
X_val, X_test, y_val, y_test = train_test_split(X_tmp, y_tmp, test_size=0.50, stratify=y_tmp, random_state=42)

# 1. Sans puis avec standardisation (k = 5)
brut = KNeighborsClassifier(n_neighbors=5).fit(X_train, y_train)
standardise = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=5)).fit(X_train, y_train)
print(f"k=5 sans scaling : validation {brut.score(X_val, y_val):.3f}")
print(f"k=5 avec scaling : validation {standardise.score(X_val, y_val):.3f}")

# 2. Choisir k sur la validation
best_k, best_val = None, 0
for k in [1, 3, 5, 9, 15, 31, 101]:
    model = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=k)).fit(X_train, y_train)
    val_acc = model.score(X_val, y_val)
    print(f"k={k:>3} : train {model.score(X_train, y_train):.3f} | validation {val_acc:.3f}")
    if val_acc > best_val:
        best_k, best_val = k, val_acc

# 3. Le modèle retenu, évalué une seule fois sur le test
final = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=best_k)).fit(X_train, y_train)
print(f"k retenu = {best_k} : test {final.score(X_test, y_test):.3f}")
```

```text
échelles très différentes : 143.5 à 2501.0 (aire) contre 0.04996 à 0.09744 (dimension fractale)
k=5 sans scaling : validation 0.953
k=5 avec scaling : validation 0.988
k=  1 : train 1.000 | validation 0.965
k=  3 : train 0.972 | validation 0.976
k=  5 : train 0.972 | validation 0.988
k=  9 : train 0.970 | validation 0.976
k= 15 : train 0.970 | validation 0.976
k= 31 : train 0.960 | validation 0.953
k=101 : train 0.925 | validation 0.965
k retenu = 5 : test 0.930
```

Ce qu'on lit :

- **Le scaling** fait passer la validation de 0,953 à 0,988 : sans lui, l'aire de la tumeur (jusqu'à 2 501) écrase les features qui valent moins de 0,1.
- `make_pipeline(StandardScaler(), …)` calcule moyenne et écart-type **sur le train seulement** (au `fit`), puis les réutilise pour la validation et le test.
- **$k = 1$** obtient 1,000 sur le train : chaque point d'entraînement est son propre plus proche voisin. C'est de la mémorisation, pas une performance.
- Le score de **test** (0,930) est plus bas que le meilleur score de validation (0,988) : en choisissant le meilleur $k$ sur la validation, on profite un peu de sa chance. Avec 85 tumeurs de validation, une tumeur de plus ou de moins change le score de 1,2 point. C'est pour ça qu'on garde un test séparé.

## À retenir

- k-NN : supervisé, non paramétrique, *lazy* ; il prédit d'après les $k$ exemples les plus **proches**.
- Algorithme : distances → $k$ plus proches → vote (classification) ou moyenne (régression).
- Euclidienne $\sqrt{\sum (x_i - y_i)^2}$ ; Manhattan $\sum \lvert x_i - y_i\rvert$ ; Minkowski les généralise.
- $k$ petit → local, bruité, overfitting ; $k$ grand → lissé, underfitting. Se choisit sur la validation.
- Pondération $1/d$ : les voisins très proches comptent plus, et cela peut changer la décision.
- **Toujours mettre les features à l'échelle** (Min-Max ou Z-score), avec un scaler calculé sur le train.
- Entraînement gratuit, prédiction coûteuse ; KD-tree, Ball-tree et voisins approchés accélèrent la recherche.

## Questions de révision

1. Pourquoi dit-on que le k-NN est *lazy* et *non paramétrique* ?
2. Donner les 5 étapes de l'algorithme.
3. Calculer les distances euclidienne et Manhattan entre $P = (0, 2)$ et $Q = (3, 6)$.
4. Pourquoi faut-il normaliser avant un k-NN ? Donner les formules Min-Max et Z-score.
5. Que se passe-t-il avec $k = 1$ ? Avec $k$ égal au nombre total d'exemples ?
6. Trois voisins : (0,2 ; A), (0,5 ; B), (0,6 ; B). Classe prédite par vote simple ? Par vote pondéré $1/d$ ?
7. En régression, les 4 plus proches voisins valent 12, 15, 14 et 19. Quelle est la prédiction ?
8. Pourquoi la prédiction du k-NN est-elle coûteuse sur un grand dataset, et comment l'accélérer ?
9. Pourquoi le score train d'un k-NN avec $k = 1$ n'a-t-il aucune valeur ?

> [!question]- Réponses
> 1. *Lazy* : il ne construit aucun modèle pendant l'entraînement, il stocke les données et fait tout le travail au moment de prédire. *Non paramétrique* : il n'impose aucune forme à la frontière (pas d'équation de droite à apprendre), la forme vient des données.
> 2. Choisir $k$ ; calculer la distance du nouveau point à tous les points connus ; garder les $k$ plus proches ; compter les classes parmi eux ; prédire la classe majoritaire.
> 3. Écarts : 3 et 4. Euclidienne : $\sqrt{9 + 16} = 5$. Manhattan : $3 + 4 = 7$.
> 4. Parce que la distance additionne des écarts : une variable à grande échelle (revenu) écrase les autres (âge). Min-Max : $x' = (x - x_{\min}) / (x_{\max} - x_{\min})$, valeurs dans [0, 1]. Z-score : $x' = (x - \mu) / \sigma$, moyenne 0 et écart-type 1.
> 5. $k = 1$ : décision ultra-locale, sensible au bruit, overfitting (score train parfait). $k = n$ : tous les points votent, le modèle prédit **toujours la classe majoritaire** du dataset, quel que soit le point : underfitting total.
> 6. Vote simple : B (2 contre 1). Pondéré : A $= 1/0{,}2 = 5$ ; B $= 1/0{,}5 + 1/0{,}6 = 2 + 1{,}67 = 3{,}67$ → **A**.
> 7. $(12 + 15 + 14 + 19) / 4 = 60 / 4 =$ **15**.
> 8. Chaque prédiction demande une distance vers chacun des $n$ exemples stockés. On accélère avec un index spatial (KD-tree, Ball-tree) ou une recherche approchée (Approximate NN) ; ces méthodes perdent de leur efficacité en grande dimension.
> 9. Chaque point d'entraînement est à distance 0 de lui-même : il est son propre voisin, donc toujours bien classé. Le 100 % mesure de la mémorisation, pas la capacité à généraliser ; seul le score sur des données jamais vues compte.
