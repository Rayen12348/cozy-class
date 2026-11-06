---
date: 2026-11-06
tags: [spark, pyspark, big-data]
---
# TP 1 — Word count avec PySpark

**Objectif** : écrire le « Hello world » du Big Data — compter les mots d'un livre — d'abord à la manière de MapReduce avec les RDD, puis avec les DataFrames. Notions du [[Chapitre 1 - Hadoop, MapReduce et Spark]].

**Prérequis** : Python 3.10+ et Java 17, puis `pip install pyspark` — ou un notebook Google Colab (`!pip install pyspark`).

## Les données

Télécharger *Les Misérables, tome I* de Victor Hugo depuis le projet Gutenberg (domaine public) :

```sh
curl -L -o livre.txt https://www.gutenberg.org/cache/epub/17489/pg17489.txt
```

## Partie 1 — Démarrer Spark

```python
from pyspark.sql import SparkSession
spark = SparkSession.builder.master("local[*]").appName("wordcount").getOrCreate()
sc = spark.sparkContext
print(spark.version, sc.defaultParallelism)
```

- [ ] Que signifie `local[*]` ?
- [ ] Ouvrir l'interface web de Spark sur `http://localhost:4040` et la garder ouverte pendant le TP

## Partie 2 — À la manière de MapReduce (RDD)

```python
lignes = sc.textFile("livre.txt")
compte = (lignes
          .flatMap(lambda l: l.lower().split())    # Map : une ligne → des mots
          .map(lambda mot: (mot, 1))               # chaque mot → (mot, 1)
          .reduceByKey(lambda a, b: a + b))        # Reduce : on additionne par mot
print(compte.takeOrdered(20, key=lambda kv: -kv[1]))
```

- [ ] Exécuter : quels sont les 20 mots les plus fréquents ?
- [ ] Repérer dans le code la phase **Map**, le **shuffle** et la phase **Reduce**
- [ ] Mesurer le temps de chaque ligne avec `time.time()` : à quel moment le calcul est-il **vraiment** lancé ? Pourquoi ?

## Partie 3 — Nettoyer

- [ ] Retirer la ponctuation avec une expression régulière : `re.findall(r"[a-zàâçéèêëîïôûùüÿœæ]+", l.lower())`
- [ ] Retirer les mots vides (*le, la, de, et, à, il, …*) avec une liste `stop` et un `filter`
- [ ] Quels sont maintenant les 20 mots les plus fréquents ? Reconnais-tu les personnages ?

## Partie 4 — Avec les DataFrames

```python
from pyspark.sql import functions as F

df = spark.read.text("livre.txt")
mots = (df.select(F.explode(F.split(F.lower(F.col("value")), r"[^a-zàâçéèêëîïôûùüÿœæ]+")).alias("mot"))
          .filter(F.length("mot") > 3))
mots.groupBy("mot").count().orderBy(F.desc("count")).show(20)
```

- [ ] Obtenir le même résultat qu'en partie 3
- [ ] Refaire la même requête en **SQL** avec `createOrReplaceTempView`
- [ ] Comparer les plans d'exécution des deux versions avec `.explain()`

## Partie 5 — Plus de données

- [ ] Télécharger 3 ou 4 autres livres dans un dossier `livres/` et lire tout le dossier d'un coup avec `spark.read.text("livres/")`
- [ ] Ajouter le nom du fichier avec `F.input_file_name()` et trouver le mot le plus fréquent **de chaque livre**
- [ ] Sauvegarder le résultat en Parquet : `resultat.write.mode("overwrite").parquet("sortie/")`

> [!question] Réflexion
> Sur ton PC, Spark n'est pas forcément plus rapide qu'un simple script Python. Pourquoi ? À partir de quand devient-il intéressant ?

## À rendre

Le notebook et le top 10 des mots (sans les mots vides) de chaque livre.
