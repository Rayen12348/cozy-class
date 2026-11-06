---
tags: [complexite]
date: 2026-09-20
---
# Complexité des algorithmes

La complexité mesure le **nombre d'opérations** en fonction de la taille $n$ de l'entrée.

## Notation grand O

> [!definition] Grand O
> $f(n) = O(g(n))$ s'il existe $c > 0$ et $n_0$ tels que $f(n) \leq c \cdot g(n)$ pour tout $n \geq n_0$.

| Complexité | Nom | Exemple |
|---|---|---|
| $O(1)$ | constante | accès `t[i]` |
| $O(\log n)$ | logarithmique | recherche dichotomique |
| $O(n)$ | linéaire | parcours d'une liste |
| $O(n \log n)$ | quasi-linéaire | tri fusion |
| $O(n^2)$ | quadratique | [[Chapitre 2 - Algorithmes de tri\|tri par insertion]] |

## Exemple : recherche dichotomique

```python
def dichotomie(t, x):
    """Renvoie l'indice de x dans t (trié), ou -1."""
    g, d = 0, len(t) - 1
    while g <= d:
        m = (g + d) // 2
        if t[m] == x:
            return m
        if t[m] < x:
            g = m + 1
        else:
            d = m - 1
    return -1
```

> [!question] Pourquoi $O(\log n)$ ?
> À chaque tour, l'intervalle de recherche est divisé par 2.
