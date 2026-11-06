# Correction — TP 1

```python
import time, random

def tri_insertion(t):
    for i in range(1, len(t)):
        x, j = t[i], i - 1
        while j >= 0 and t[j] > x:
            t[j + 1] = t[j]
            j -= 1
        t[j + 1] = x

for n in (1000, 2000, 4000):
    t = [random.random() for _ in range(n)]
    debut = time.perf_counter()
    tri_insertion(t)
    print(n, f"{time.perf_counter() - debut:.3f} s")
```

> [!success] Observation
> Quand $n$ double, le temps est ×4 : c'est bien du $O(n^2)$ (voir [[Chapitre 1 - Complexité]]).
