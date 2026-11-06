---
tags: [suites, semestre1]
date: 2026-09-22
---
# Suites numériques

Une suite est une fonction de $\mathbb{N}$ dans $\mathbb{R}$. On la note $(u_n)_{n \in \mathbb{N}}$.

## Définition

> [!definition] Suite convergente
> On dit que $(u_n)$ **converge** vers $\ell \in \mathbb{R}$ si
> $$\forall \varepsilon > 0,\ \exists N \in \mathbb{N},\ \forall n \geq N,\ |u_n - \ell| < \varepsilon$$

## Suites usuelles

| Suite | Terme général | Somme des $n+1$ premiers termes |
|---|---|---|
| Arithmétique | $u_n = u_0 + nr$ | $\frac{(n+1)(u_0 + u_n)}{2}$ |
| Géométrique | $u_n = u_0 q^n$ | $u_0 \frac{1 - q^{n+1}}{1 - q}$ |

## Théorèmes importants

> [!theoreme] Théorème des gendarmes
> Si $v_n \leq u_n \leq w_n$ à partir d'un certain rang et si $(v_n)$ et $(w_n)$ convergent vers la même limite $\ell$, alors $(u_n)$ converge vers $\ell$.

> [!warning] Attention
> Une suite bornée n'est pas forcément convergente : pense à $u_n = (-1)^n$.

> [!exemple]- Exemple (clique pour déplier)
> $u_n = \frac{\sin n}{n}$ : on a $-\frac{1}{n} \leq u_n \leq \frac{1}{n}$, donc $u_n \to 0$.

À pratiquer dans le [[TD 1 - Suites]]. La suite logique : [[Chapitre 2 - Limites et continuité]]. #important
