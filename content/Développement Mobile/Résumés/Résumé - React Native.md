---
date: 2026-11-06
tags: [react-native]
---
# Résumé — React Native

## Commandes Expo

| Commande | Effet |
|---|---|
| `npx create-expo-app@latest nom` | nouveau projet |
| `npx expo start` | serveur de développement + QR code pour Expo Go |
| `npx expo install paquet` | installe une version compatible avec ton SDK |

## Composants essentiels

`View` (conteneur) · `Text` (tout texte) · `Image` · `TextInput` · `Pressable` / `Button` · `ScrollView` · `FlatList` (longues listes).

## Hooks

| Hook | Sert à | Exemple |
|---|---|---|
| `useState` | mémoire du composant | `const [n, setN] = useState(0)` |
| `useEffect` | code après le rendu (API, stockage) | `useEffect(() => { … }, [deps])` |

Dépendances de `useEffect` : `[]` → une seule fois au montage · `[x]` → à chaque changement de `x` · pas de tableau → après chaque rendu.

## Règles d'or

> [!warning] À ne pas oublier
> - Tout texte est dans un `<Text>`.
> - On ne **mute** jamais le state : `[...liste, x]`, `liste.map(...)`, `liste.filter(...)`.
> - Une `FlatList` a besoin d'un `keyExtractor` unique.
> - `flexDirection` vaut `column` par défaut.

## Mettre à jour une liste dans le state

```js
setListe([...liste, nouvel]);                                        // ajouter
setListe(liste.filter((x) => x.id !== id));                           // supprimer
setListe(liste.map((x) => (x.id === id ? { ...x, ...modifs } : x)));  // modifier
```

## Les données

- Depuis une API : `fetch(url).then((r) => r.json())` dans un `useEffect` → voir les API REST dans [[Résumé - Services Web]].
- Sur le téléphone : `AsyncStorage.setItem(cle, JSON.stringify(v))` / `JSON.parse(await AsyncStorage.getItem(cle))`.

> [!tip] Tester une API locale depuis le téléphone
> `localhost` désigne le téléphone lui-même : utiliser l'adresse IP du PC sur le même Wi-Fi (`http://192.168.1.20:8080`).

Cours : [[Chapitre 1 - Les bases de React Native]] · TP : [[TP 1 - Application de tâches avec Expo]].
