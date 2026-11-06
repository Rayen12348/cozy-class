---
date: 2026-11-06
tags: [big-data, spark, hadoop]
---
# Résumé — Big Data

## Les 5 V

**Volume** · **Vélocité** · **Variété** · **Véracité** · **Valeur**

Le principe : répartir sur des machines ordinaires (*scale out*) et **amener le calcul aux données**.

## Hadoop

| Composant | Rôle |
|---|---|
| **HDFS** | stockage : blocs de 128 Mo, répliqués 3 fois |
| NameNode / DataNode | métadonnées / blocs |
| **YARN** | allocation du CPU et de la mémoire du cluster |
| **MapReduce** | calcul en Map → Shuffle → Reduce, sur disque |
| Hive / HBase | SQL sur Hadoop / base NoSQL en colonnes |

## MapReduce en un exemple

> [!exemple] Word count
> `"a b a"` → Map `(a,1) (b,1) (a,1)` → Shuffle `a:[1,1] b:[1]` → Reduce `(a,2) (b,1)`

## Spark

- Calcul **en mémoire**, bien plus rapide que MapReduce pour les traitements itératifs.
- **RDD** (bas niveau) → **DataFrame** (tables, optimisé) → **Spark SQL**.
- Modules : SQL, Structured Streaming, **MLlib**, GraphX.

| Transformations (paresseuses) | Actions (déclenchent le calcul) |
|---|---|
| `map`, `flatMap`, `filter` | `count`, `collect`, `take` |
| `groupBy`, `reduceByKey`, `join` | `show`, `write`, `saveAsTextFile` |

```python
df.groupBy("ville").agg(F.sum("montant").alias("total")).orderBy(F.desc("total")).show()
```

## NoSQL

Clé-valeur (Redis) · Documents (MongoDB) · Colonnes (Cassandra, HBase) · Graphes (Neo4j).

> [!tip] Les formats de fichiers
> CSV et JSON pour échanger ; **Parquet** (stockage en colonnes, compressé) pour analyser vite.

Cours : [[Chapitre 1 - Hadoop, MapReduce et Spark]] · TP : [[TP 1 - Word count avec PySpark]] · même UE : [[Résumé - Cloud et virtualisation]].
