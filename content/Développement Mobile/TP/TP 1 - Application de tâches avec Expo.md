---
date: 2026-11-06
tags: [react-native, expo]
---
# TP 1 — Application de tâches avec Expo

**Objectif** : construire une application « to-do » qui ajoute, coche et supprime des tâches, puis les garde en mémoire. Notions du [[Chapitre 1 - Les bases de React Native]].

**Prérequis** : Node.js 20+, l'application **Expo Go** sur ton téléphone (ou un émulateur Android).

## Partie 1 — Créer le projet

```sh
npx create-expo-app@latest todo --template blank
cd todo
npx expo start          # scanne le QR code avec Expo Go
```

- [ ] Lancer le projet et afficher « Mes tâches » au centre de l'écran
- [ ] Modifier le texte et vérifier que l'application se recharge toute seule (*Fast Refresh*)

## Partie 2 — Ajouter des tâches

- [ ] Un `TextInput` et un bouton « Ajouter »
- [ ] Garder les tâches dans un state : `const [taches, setTaches] = useState([])`
- [ ] Chaque tâche est un objet `{ id, titre, faite }` — `id` peut valoir `Date.now().toString()`
- [ ] Afficher la liste avec une `FlatList`
- [ ] Refuser une tâche vide et vider le champ après l'ajout

```jsx
const ajouter = () => {
  const titre = texte.trim();
  if (!titre) return;
  setTaches([...taches, { id: Date.now().toString(), titre, faite: false }]);
  setTexte('');
};
```

## Partie 3 — Cocher et supprimer

- [ ] Un appui sur une tâche inverse `faite` (texte barré avec `textDecorationLine: 'line-through'`)
- [ ] Un appui long (`onLongPress`) supprime la tâche
- [ ] Afficher le compteur « 2 / 5 faites » en haut de l'écran

> [!tip] Modifier un élément sans muter le state
> ```js
> setTaches(taches.map((t) => (t.id === id ? { ...t, faite: !t.faite } : t)));
> setTaches(taches.filter((t) => t.id !== id));
> ```

## Partie 4 — Persistance

```sh
npx expo install @react-native-async-storage/async-storage
```

- [ ] Charger les tâches au démarrage avec `useEffect(..., [])`
- [ ] Sauvegarder à chaque changement avec `useEffect(..., [taches])`
- [ ] Fermer complètement l'application, la rouvrir : les tâches sont-elles toujours là ?

## Bonus

- [ ] Filtres « toutes / à faire / faites »
- [ ] Un deuxième écran (Expo Router) avec le détail d'une tâche
- [ ] Charger des tâches de départ depuis `https://jsonplaceholder.typicode.com/todos?_limit=5`, ou depuis l'API du [[TP 1 - API REST avec Spring Boot|TP de services web]]

## À rendre

Le dépôt GitHub du projet et une courte vidéo (ou des captures) de l'application sur téléphone.
