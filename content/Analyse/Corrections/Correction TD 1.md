# Correction du TD 1

## Exercice 1

$$u_n = \frac{2n+1}{n+3} = \frac{2 + \frac{1}{n}}{1 + \frac{3}{n}} \xrightarrow[n \to +\infty]{} 2$$

## Exercice 2

1. Par récurrence : si $1 \leq u_n \leq 2$ alors $3 \leq 2 + u_n \leq 4$ donc $\sqrt{3} \leq u_{n+1} \leq 2$. ✅
2. $u_{n+1} - u_n = \sqrt{2 + u_n} - u_n$ est positif car $u_n^2 - u_n - 2 = (u_n - 2)(u_n + 1) \leq 0$.
3. Suite croissante et majorée ⇒ convergente. La limite vérifie $\ell = \sqrt{2 + \ell}$, d'où ==$\ell = 2$==.

> [!success] À retenir
> Croissante + majorée ⇒ convergente (théorème de la limite monotone).

## Exercice 3

Somme géométrique de raison $2$ : $\displaystyle \sum_{k=0}^{n} 3 \cdot 2^k = 3(2^{n+1} - 1)$.
