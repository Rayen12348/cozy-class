---
tags: [fonctions]
date: 2026-10-06
---
# Limites et continuité

On prolonge les idées du [[Chapitre 1 - Suites numériques|chapitre sur les suites]] aux fonctions.

## Limite en un point

> [!definition] Limite
> $f$ admet $\ell$ pour limite en $a$ si $\forall \varepsilon > 0, \exists \delta > 0, |x - a| < \delta \Rightarrow |f(x) - \ell| < \varepsilon$.

## Continuité

$f$ est continue en $a$ si $\lim_{x \to a} f(x) = f(a)$.

> [!theoreme] Théorème des valeurs intermédiaires
> Si $f$ est continue sur $[a, b]$, alors $f$ prend toutes les valeurs comprises entre $f(a)$ et $f(b)$.

> [!tip] Méthode
> Pour montrer qu'une équation $f(x) = 0$ a une solution, on cherche $a, b$ tels que $f(a)$ et $f(b)$ soient de signes contraires.
