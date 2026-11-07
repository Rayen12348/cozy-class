---
date: 2026-11-07
ordre: 3
tags: [machine-learning, resume, svm, marge, noyau]
---
# Résumé — Chapitre 3 : Support Vector Machine (SVM)

Support : [[Chapitre 3 - Support Vector Machine (SVM).pdf]] (10 diapositives) · Dr. Ing. Ones Sidhom · précédent : [[Résumé - Chapitre 2 - k-NN]]

Là où le k-NN regarde les voisins, le SVM trace **la frontière la plus large possible** entre les classes, et ne retient que les quelques points qui la touchent.

## 1. Introduction

*Diapositive 2*

> [!definition] SVM (*Support Vector Machine*, machine à vecteurs de support)
> Un algorithme d'apprentissage **supervisé**, pour la **classification** et la **régression**. Il est particulièrement efficace dans les **espaces de grande dimension**, y compris quand le **nombre de dimensions dépasse le nombre d'échantillons** (par exemple 20 000 gènes mesurés sur 200 patients).

## 2. Hyperplan, marge et vecteurs de support

*Diapositives 2 et 3*

- L'objectif est de trouver un **hyperplan optimal** qui sépare les classes. En 2 dimensions, un hyperplan est une **droite** ; en 3 dimensions, un **plan** ; au-delà, on garde le mot hyperplan.
- Parmi toutes les droites qui séparent les deux classes, le SVM choisit celle qui **maximise la marge**.
- La **marge** est la distance entre l'hyperplan et **les points les plus proches de chaque classe**.
- Ces points les plus proches s'appellent les **vecteurs de support** : ce sont eux qui « portent » la frontière.

| Élément de la diapositive 3 | Rôle |
|---|---|
| *Decision boundary* (trait plein ou pointillé central) | l'hyperplan de séparation : un côté par classe |
| *Hyperplane for first / second class* | les deux bords de la marge, parallèles à la frontière, passant par les points les plus proches de chaque classe |
| *Margin* | la largeur de la bande vide entre ces deux bords |
| *Support vectors* (points cerclés) | les points posés sur les bords de la marge |

> [!important] Seuls les vecteurs de support comptent
> Déplacer ou supprimer un point loin de la frontière ne change rien au modèle. Déplacer un vecteur de support change la frontière. C'est une grande différence avec le k-NN, qui garde **tous** les points.

> [!tip]- Complément : la marge en équations
> L'hyperplan s'écrit $w \cdot x + b = 0$, où $w$ est un vecteur perpendiculaire à la frontière. On règle $w$ et $b$ pour que les deux bords de la marge soient $w \cdot x + b = +1$ et $w \cdot x + b = -1$. La largeur de la bande vaut alors $\frac{2}{\lVert w \rVert}$ : **maximiser la marge revient à minimiser $\lVert w \rVert$**, sous la contrainte que chaque point soit du bon côté de son bord. Un nouveau point $x$ est classé selon le signe de $w \cdot x + b$.

## 3. Marge dure et marge souple

*Diapositives 4 et 5*

| | **Hard margin** (marge dure) | **Soft margin** (marge souple) |
|---|---|---|
| Hypothèse | données **linéairement séparables sans aucune erreur** | données avec du bruit, des valeurs aberrantes, des classes qui se chevauchent |
| Ce qui est permis | aucun point dans la marge, aucun point mal classé | certains points **du mauvais côté de la marge**, voire **du mauvais côté de l'hyperplan** |
| Réalisme | rarement possible en pratique | le cas normal |

La diapositive 5 montre la même idée en quatre images : 0, puis 1, 2 et 3 observations tolérées dans la marge. **Plus on tolère de points dans la marge, plus la marge peut s'élargir.**

## 4. Le paramètre C

*Diapositive 6*

$C$ est l'**hyperparamètre principal** du SVM à marge souple. Il règle le compromis entre deux objectifs opposés :

- une **marge large** (favorisée quand $C$ est **petit**) ;
- **peu d'erreurs** de classification sur le train (pénalisées fortement quand $C$ est **grand**).

| Valeur de $C$ | Comportement |
|---|---|
| **grande** (ex. 10, 100) | **moins de tolérance** aux erreurs → marge étroite, modèle plus **rigide**, qui colle au train |
| **petite** (ex. 0,01, 0,1) | **plus de tolérance** aux erreurs → marge large, modèle plus **souple** |

- Valeur par défaut courante : **$C = 1$** (c'est celle de scikit-learn).
- Données **fortement bruitées** : un **petit** $C$, pour éviter le **surapprentissage** (overfitting).
- Données **bien séparables** : un $C$ **plus grand**, pour réduire les erreurs de classification.

![[ml-ch3-marge-et-C.png]]

Mêmes 60 points, deux valeurs de $C$ (trait plein : l'hyperplan ; pointillés : les bords de la marge ; cercles : les vecteurs de support).

- **C = 100** : marge étroite (largeur 1,45), seulement 5 vecteurs de support. Un point orange reste quand même du côté bleu : les données ne sont pas parfaitement séparables, la marge reste donc souple, même avec un $C$ élevé.
- **C = 0,05** : marge plus de deux fois plus large (3,13), et 16 vecteurs de support : tous les points dans la marge en deviennent.

## 5. Données non linéairement séparables : l'astuce du noyau

*Diapositives 7 et 8*

Quand aucune droite ne sépare les classes, le SVM utilise un **noyau** (*kernel*) : il représente les données dans un **espace de dimension supérieure** où elles **deviennent séparables** par un hyperplan.

> [!exemple] L'exemple de la diapositive 7
> Sur une seule droite, on a des points bleus, puis rouges au milieu, puis bleus : **aucun seuil unique** ne peut isoler les rouges. Si on ajoute une deuxième coordonnée, $x^2$ (ou $(x - \text{centre})^2$), chaque point monte d'autant plus qu'il est loin du centre : les bleus des deux bouts se retrouvent en haut, les rouges du milieu en bas, et **une droite les sépare**.

La diapositive 8 fait la même chose en 3D : un nuage rouge entouré de noir, impossible à séparer en 2D, devient séparable par un plan une fois projeté en 3 dimensions.

> [!remarque] Pourquoi « astuce » du noyau
> Le SVM n'a besoin que de mesurer à quel point deux points se **ressemblent**. Le noyau calcule directement cette ressemblance **comme si** les points étaient dans le grand espace, sans jamais calculer leurs nouvelles coordonnées. Le noyau RBF correspond même à un espace de dimension infinie, qu'on ne pourrait pas construire explicitement.

## 6. Les noyaux courants

*Diapositive 9*

| Noyau | Paramètre | Utilisation | Exemple |
|---|---|---|---|
| **Linéaire** | aucun (en plus de $C$) | données **déjà linéairement séparables** | une droite suffit dans l'espace d'origine |
| **Polynomial** | $d$ : le **degré** du polynôme | relations **polynomiales** entre les données | séparer des points en forme de **cercle** ou de **parabole** |
| **RBF** (*Radial Basis Function*) ou gaussien | $\gamma$ (gamma) : l'**influence** de chaque point | séparations **complexes et non linéaires** | **spirales**, clusters complexes |

> [!tip]- Complément : les formules (forme utilisée par scikit-learn)
> - Linéaire : $K(x, z) = x \cdot z$
> - Polynomial : $K(x, z) = (\gamma \, x \cdot z + r)^d$
> - RBF : $K(x, z) = \exp\left(-\gamma \lVert x - z \rVert^2\right)$ : vaut 1 quand les points sont confondus, et tend vers 0 quand ils s'éloignent. Plus $\gamma$ est grand, plus elle tombe vite.
>
> Dans `SVC` : `kernel="linear"`, `"poly"` (avec `degree=3` par défaut) ou `"rbf"` (le noyau par défaut).

## 7. Le paramètre gamma

*Diapositive 10*

$\gamma$ est un hyperparamètre **fondamental** des SVM à noyau non linéaire (RBF, polynomial). Il contrôle la **portée de l'influence** d'un seul exemple d'entraînement sur la fonction de décision.

| Valeur de $\gamma$ | Comportement |
|---|---|
| **petite** (ex. 0,01) | chaque point influence une **large région** → modèle plus **lisse** (risque d'underfitting si trop petite) |
| **grande** (ex. 10) | chaque point influence une **petite région** → modèle plus **flexible**, risque d'**overfitting** |

`gamma="scale"` (la valeur par défaut de scikit-learn) calcule $\gamma$ automatiquement à partir des données d'entraînement :

$$\gamma = \frac{1}{n_{\text{features}} \times \operatorname{Var}(X)}$$

Plus les données sont dispersées, plus $\gamma$ est petit : la portée s'adapte à l'échelle des données. (Vérifié : sur un jeu de 2 features, cette formule donne 0,9053, exactement la valeur utilisée par `SVC`.)

![[ml-ch3-noyau-et-gamma.png]]

Mêmes deux lunes imbriquées, $C = 1$ :

- **noyau linéaire** : une droite, incapable de suivre les lunes (validation 0,856) ;
- **RBF, $\gamma = 1$** : la frontière suit la forme des lunes (train 0,957, validation 0,956) ;
- **RBF, $\gamma = 100$** : chaque point n'influence que son voisinage immédiat ; la frontière fait des bulles autour des points bleus isolés (train 0,990 mais validation 0,944) : c'est de l'**overfitting**.

> [!important] C et gamma se règlent ensemble
> Les deux hyperparamètres jouent sur la complexité du modèle. On les choisit ensemble sur l'ensemble de **validation** (voir le [[Résumé - Chapitre 1 - Introduction et démarche expérimentale#Train / validation / test|chapitre 1]]), en essayant des valeurs espacées d'un facteur 10 : 0,01, 0,1, 1, 10, 100.

## 8. En pratique avec scikit-learn

*Complément, hors diapositives : exécuté avec Python 3.14 et scikit-learn 1.9.*

### L'exemple de la diapositive 7, en code

```python
# svm_noyau.py
import numpy as np
from sklearn.svm import SVC

# Diapositive 7 : bleu - rouge - bleu sur une seule droite
x = np.array([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7], dtype=float)
y = np.array([0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0])          # 1 = rouge, au milieu

# 1. Linéaire sur x seul : aucun seuil ne peut isoler le milieu
lin = SVC(kernel="linear", C=100).fit(x.reshape(-1, 1), y)
print("linéaire sur x       :", lin.score(x.reshape(-1, 1), y))

# 2. On ajoute une dimension : (x, (x - 2.5)²)  -> un hyperplan suffit
X2 = np.column_stack([x, (x - 2.5) ** 2])
lin2 = SVC(kernel="linear", C=100).fit(X2, y)
print("linéaire sur (x, x²) :", lin2.score(X2, y))

# 3. Le noyau fait cette projection pour nous, sans la calculer
rbf = SVC(kernel="rbf", C=100, gamma="scale").fit(x.reshape(-1, 1), y)
print("noyau RBF sur x      :", rbf.score(x.reshape(-1, 1), y))
```

```text
linéaire sur x       : 0.6666666666666666
linéaire sur (x, x²) : 1.0
noyau RBF sur x      : 1.0
```

Sur $x$ seul, un hyperplan n'est qu'un seuil : le SVM linéaire ne classe bien que 8 points sur 12, et même le meilleur seuil possible (entre −1 et 1) n'en classerait que 9, car un seul seuil ne peut pas isoler le milieu. En ajoutant $(x - 2{,}5)^2$, ou en laissant le noyau RBF le faire implicitement, tout est bien classé.

### C, gamma et scaling

```python
# svm_sklearn.py
from sklearn.datasets import load_breast_cancer, make_moons
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

# Données en forme de deux lunes imbriquées : non linéairement séparables
X, y = make_moons(n_samples=300, noise=0.25, random_state=0)
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.3, random_state=0)

print("Effet de C (noyau RBF, gamma='scale')")
for C in [0.01, 0.1, 1, 100]:
    m = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=C)).fit(X_train, y_train)
    n_sv = m[-1].n_support_.sum()
    print(f"  C={C:<5} : {n_sv:>3} vecteurs de support | train {m.score(X_train, y_train):.3f} | validation {m.score(X_val, y_val):.3f}")

print("Effet de gamma (noyau RBF, C=1)")
for gamma in [0.01, 1, 100]:
    m = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=1, gamma=gamma)).fit(X_train, y_train)
    print(f"  gamma={gamma:<5} : train {m.score(X_train, y_train):.3f} | validation {m.score(X_val, y_val):.3f}")

print("Noyau linéaire contre RBF")
for kernel in ["linear", "rbf"]:
    m = make_pipeline(StandardScaler(), SVC(kernel=kernel)).fit(X_train, y_train)
    print(f"  {kernel:<6} : validation {m.score(X_val, y_val):.3f}")

# Sur les tumeurs : la standardisation compte aussi pour le SVM
Xc, yc = load_breast_cancer(return_X_y=True)
Xc_train, Xc_val, yc_train, yc_val = train_test_split(Xc, yc, test_size=0.3, stratify=yc, random_state=42)
brut = SVC(kernel="rbf").fit(Xc_train, yc_train)
std = make_pipeline(StandardScaler(), SVC(kernel="rbf")).fit(Xc_train, yc_train)
print(f"Tumeurs, RBF : sans scaling {brut.score(Xc_val, yc_val):.3f} | avec scaling {std.score(Xc_val, yc_val):.3f}")
```

```text
Effet de C (noyau RBF, gamma='scale')
  C=0.01  : 194 vecteurs de support | train 0.538 | validation 0.411
  C=0.1   : 119 vecteurs de support | train 0.890 | validation 0.867
  C=1     :  66 vecteurs de support | train 0.952 | validation 0.956
  C=100   :  34 vecteurs de support | train 0.962 | validation 0.978
Effet de gamma (noyau RBF, C=1)
  gamma=0.01  : train 0.829 | validation 0.833
  gamma=1     : train 0.957 | validation 0.956
  gamma=100   : train 0.990 | validation 0.944
Noyau linéaire contre RBF
  linear : validation 0.856
  rbf    : validation 0.956
Tumeurs, RBF : sans scaling 0.906 | avec scaling 0.977
```

Ce qu'on lit :

- **C** : plus $C$ est petit, plus il y a de vecteurs de support (la marge s'élargit et englobe des points). À $C = 0{,}01$, le modèle tolère tant d'erreurs que 194 des 210 points deviennent vecteurs de support et qu'il ne sépare presque plus rien : c'est de l'**underfitting**. Ces lunes sont assez propres : au-delà de $C = 1$, la validation ne se dégrade pas.
- **gamma** : $\gamma = 0{,}01$ est trop lisse (0,833), $\gamma = 1$ est équilibré, $\gamma = 100$ surapprend (train 0,990, validation 0,944). Ici, c'est $\gamma$ qui provoque l'overfitting.
- **Noyau** : sur des données non linéaires, le RBF bat nettement le linéaire (0,956 contre 0,856).
- **Scaling** : comme pour le k-NN, le noyau RBF mesure des distances entre points ; sans standardisation, les grandes features écrasent les autres (0,906 contre 0,977).

## Synthèse : k-NN et SVM

*Complément, pour réviser les deux chapitres ensemble*

| | k-NN (chapitre 2) | SVM (chapitre 3) |
|---|---|---|
| Idée | la classe des voisins les plus proches | l'hyperplan de marge maximale |
| Entraînement | aucun : on stocke les données (*lazy*) | une optimisation pour trouver l'hyperplan |
| Ce que garde le modèle | **tous** les exemples | seulement les **vecteurs de support** |
| Prédiction | distance à tous les exemples : lente sur un grand dataset | plus rapide : on ne compare qu'aux vecteurs de support (en linéaire, un seul calcul $w \cdot x + b$) |
| Non linéaire | naturellement (frontière libre) | grâce aux **noyaux** (polynomial, RBF) |
| Hyperparamètres | $k$, la distance, la pondération | $C$, le noyau, $\gamma$ (et $d$ pour le polynomial) |
| Scaling | **indispensable** | **indispensable** (surtout avec RBF) |
| Overfitting quand… | $k$ trop petit | $C$ ou $\gamma$ trop grands |

## À retenir

- Le SVM cherche l'**hyperplan** qui sépare les classes avec la **marge maximale**.
- La marge est définie par les points les plus proches : les **vecteurs de support**. Eux seuls déterminent la frontière.
- **Hard margin** : aucune erreur, exige des données linéairement séparables. **Soft margin** : tolère des points dans la marge ou mal classés.
- **$C$** : grand → peu d'erreurs tolérées, marge étroite, risque d'overfitting ; petit → marge large, plus de tolérance. Défaut : 1.
- **Noyau** : projette les données dans un espace plus grand où elles deviennent séparables, sans calculer cette projection. Linéaire, polynomial (degré $d$), RBF (paramètre $\gamma$).
- **$\gamma$** : petit → influence large, modèle lisse ; grand → influence locale, overfitting. `gamma="scale"` = $1 / (n_{\text{features}} \cdot \operatorname{Var}(X))$.
- Standardiser les features avant un SVM.

## Questions de révision

1. Qu'est-ce que la marge d'un SVM, et pourquoi la maximiser ?
2. Qu'est-ce qu'un vecteur de support ? Que se passe-t-il si on supprime un point qui n'en est pas un ?
3. Quelle est la différence entre hard margin et soft margin ? Pourquoi la marge dure est-elle rarement utilisable ?
4. Des données très bruitées : faut-il un $C$ petit ou grand ? Pourquoi ?
5. Comment un SVM peut-il séparer des données qui ne sont pas linéairement séparables ? Expliquer avec l'exemple bleu, rouge, bleu sur une droite.
6. Quel noyau choisir pour des données séparables par une droite ? Pour des points disposés en spirale ?
7. Un SVM RBF a 99 % sur le train et 80 % sur la validation. Quels hyperparamètres modifier, et dans quel sens ?
8. Pourquoi faut-il standardiser les features avant un SVM à noyau RBF ?
9. Le SVM est réputé efficace quand il y a plus de dimensions que d'échantillons. Donner un exemple de cette situation.

> [!question]- Réponses
> 1. La distance entre l'hyperplan et les points les plus proches de chaque classe. Une marge large laisse une « zone de sécurité » : un nouveau point un peu différent des exemples a moins de chances de tomber du mauvais côté, donc le modèle **généralise mieux**.
> 2. Un point d'entraînement situé sur le bord de la marge (ou dedans, ou du mauvais côté, en marge souple). Supprimer un point qui n'est **pas** vecteur de support **ne change rien** à l'hyperplan.
> 3. Hard margin : aucun point toléré dans la marge ni mal classé ; soft margin : certains points peuvent être dans la marge, voire du mauvais côté. La marge dure suppose des données parfaitement séparables, ce que le bruit, les valeurs aberrantes et le chevauchement des classes empêchent presque toujours (et un seul point aberrant peut la rendre impossible ou la déformer).
> 4. Un **petit** $C$ : il tolère plus d'erreurs et garde une marge large, au lieu de tordre la frontière pour classer chaque point bruité, ce qui serait de l'overfitting.
> 5. Avec un **noyau**, qui représente les données dans un espace de dimension plus grande où un hyperplan suffit. Sur une droite, bleu, rouge, bleu : aucun seuil n'isole les rouges ; en ajoutant $x^2$ comme deuxième coordonnée, les bleus des extrémités montent et les rouges du milieu restent bas, et une droite les sépare.
> 6. Séparables par une droite : noyau **linéaire**. Spirale : noyau **RBF** (gaussien).
> 7. C'est de l'overfitting : **diminuer $\gamma$** (chaque point influence une région plus large, frontière plus lisse) et/ou **diminuer $C$** (plus de tolérance aux erreurs), puis recomparer sur la validation.
> 8. Le noyau RBF dépend de la distance $\lVert x - z \rVert$ entre points : une feature à grande échelle domine cette distance et les autres sont ignorées, exactement comme pour le k-NN. Testé sur les tumeurs : 0,906 sans standardisation, 0,977 avec.
> 9. En génomique : des milliers de gènes mesurés (dimensions) pour quelques centaines de patients (échantillons). Ou en classification de texte : un mot du vocabulaire = une dimension, souvent plus de mots que de documents.
