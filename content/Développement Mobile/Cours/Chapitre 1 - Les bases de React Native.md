---
date: 2026-11-06
tags: [react-native, expo, javascript]
---
# Les bases de React Native

**React Native** permet d'écrire des applications mobiles **Android et iOS** en JavaScript (ou TypeScript) avec React. Le code produit de **vrais composants natifs**, pas une page web dans une application.

> [!definition] Expo
> Une boîte à outils au-dessus de React Native : on crée un projet avec `npx create-expo-app`, on le lance avec `npx expo start`, et on le teste tout de suite sur son téléphone avec l'application **Expo Go** (en scannant un QR code).

## Composants de base

| React Native | Équivalent web | Rôle |
|---|---|---|
| `<View>` | `<div>` | conteneur |
| `<Text>` | `<p>`, `<span>` | tout texte doit être dans un `<Text>` |
| `<Image>` | `<img>` | image |
| `<TextInput>` | `<input>` | saisie |
| `<Pressable>` / `<Button>` | `<button>` | bouton |
| `<ScrollView>` | page qui défile | petit contenu défilant |
| `<FlatList>` | liste | longue liste, rendue à la demande |

```jsx
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bonjour 👋</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
});
```

## Props et state

- Les **props** sont les paramètres qu'un composant reçoit de son parent (en lecture seule).
- Le **state** est la mémoire interne d'un composant ; quand il change, le composant est **rendu à nouveau**.

```jsx
import { useState } from 'react';
import { View, Text, Button } from 'react-native';

function Compteur({ pas = 1 }) {
  const [valeur, setValeur] = useState(0);
  return (
    <View>
      <Text>Valeur : {valeur}</Text>
      <Button title={`+${pas}`} onPress={() => setValeur(valeur + pas)} />
    </View>
  );
}
```

> [!warning] Ne jamais modifier le state directement
> `valeur = 3` ou `taches.push(t)` ne déclenche aucun rendu. Toujours passer par le setter, avec une **nouvelle** valeur : `setTaches([...taches, t])`.

## Mise en page : Flexbox

Tout est en Flexbox, mais avec `flexDirection: 'column'` **par défaut** (au lieu de `row` sur le web).

- `flex: 1` → prend toute la place disponible
- `justifyContent` → alignement sur l'axe principal
- `alignItems` → alignement sur l'axe secondaire
- Les tailles sont des nombres **sans unité** (points indépendants de la densité de l'écran) : `padding: 16`.

## Effets et appels réseau

`useEffect` lance du code **après** le rendu, par exemple pour charger des données depuis une API REST (voir le [[Chapitre 1 - SOA, SOAP et REST|cours SOA]]).

```jsx
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('https://jsonplaceholder.typicode.com/users')
    .then((r) => r.json())
    .then(setUsers)
    .catch(console.error)
    .finally(() => setLoading(false));
}, []); // [] = une seule fois, au montage du composant
```

## Listes avec FlatList

```jsx
<FlatList
  data={users}
  keyExtractor={(u) => String(u.id)}
  renderItem={({ item }) => <Text>{item.name}</Text>}
  ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#ddd' }} />}
/>
```

`FlatList` ne rend que les éléments visibles : à préférer à `ScrollView` + `map()` dès que la liste est longue.

## Navigation entre écrans

Avec **Expo Router**, chaque fichier du dossier `app/` devient un écran :

```
app/
├── _layout.jsx        ← pile de navigation (Stack)
├── index.jsx          ← écran d'accueil  → "/"
└── details/[id].jsx   ← écran de détail  → "/details/42"
```

```jsx
import { Link, useLocalSearchParams } from 'expo-router';

<Link href="/details/42">Voir le détail</Link>   // dans index.jsx
const { id } = useLocalSearchParams();            // dans details/[id].jsx
```

## Garder des données sur le téléphone

`AsyncStorage` (paquet `@react-native-async-storage/async-storage`) stocke des chaînes clé → valeur, même après la fermeture de l'application :

```js
await AsyncStorage.setItem('taches', JSON.stringify(taches));
const brut = await AsyncStorage.getItem('taches');
const sauvegarde = brut ? JSON.parse(brut) : [];
```

> [!abstract] À retenir
> Composants (`View`, `Text`, `FlatList`…) + **props** (entrées) + **state** (`useState`) + **effets** (`useEffect`). Fiche : [[Résumé - React Native]].
