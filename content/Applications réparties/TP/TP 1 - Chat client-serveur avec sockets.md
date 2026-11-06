---
date: 2026-11-06
tags: [sockets, java, threads]
---
# TP 1 — Chat client-serveur avec sockets

**Objectif** : écrire un petit serveur de discussion en Java où plusieurs clients s'envoient des messages, en appliquant le [[Chapitre 1 - Introduction aux systèmes répartis|cours sur les sockets]].

**Prérequis** : JDK 17 ou plus, un terminal.

## Partie 1 — Serveur écho

- [ ] Créer `EchoServer.java` qui écoute sur le port `5000` et renvoie chaque ligne reçue préfixée par `echo:`
- [ ] Tester avec `nc localhost 5000` (ou `telnet localhost 5000`)
- [ ] Que se passe-t-il si un **deuxième** client se connecte pendant que le premier est encore là ?

## Partie 2 — Plusieurs clients

- [ ] Traiter chaque client dans un `Thread` séparé
- [ ] Remplacer les threads par un pool : `Executors.newFixedThreadPool(10)`
- [ ] Connecter 11 clients : que se passe-t-il pour le onzième ?

## Partie 3 — Le chat

Le serveur garde la liste des clients connectés et **diffuse** (*broadcast*) chaque message à tous les autres.

```java
import java.io.*;
import java.net.*;
import java.util.Set;
import java.util.concurrent.*;

public class ChatServer {
    private static final Set<PrintWriter> clients = ConcurrentHashMap.newKeySet();

    public static void main(String[] args) throws IOException {
        ExecutorService pool = Executors.newFixedThreadPool(20);
        try (ServerSocket server = new ServerSocket(5000)) {
            System.out.println("Chat sur le port 5000");
            while (true) {
                Socket s = server.accept();
                pool.execute(() -> handle(s));
            }
        }
    }

    private static void handle(Socket s) {
        // TODO 1 : lire le pseudo envoyé en première ligne
        // TODO 2 : ajouter le PrintWriter du client à `clients`
        // TODO 3 : pour chaque ligne reçue, l'envoyer à tous les autres sous la forme "pseudo: message"
        // TODO 4 : retirer le client de `clients` à la déconnexion (bloc finally)
    }
}
```

- [ ] Compléter les quatre `TODO`
- [ ] Écrire `ChatClient.java` : un thread lit le clavier et envoie, un autre affiche ce qui arrive du serveur
- [ ] Ajouter la commande `/quit` pour se déconnecter proprement
- [ ] Bonus : la commande `/list` affiche les pseudos connectés

> [!tip] Pourquoi `ConcurrentHashMap.newKeySet()` ?
> Plusieurs threads ajoutent et retirent des clients en même temps : un `HashSet` ordinaire peut se corrompre. Voir la partie concurrence du [[Résumé - Applications réparties|résumé]].

## Questions

1. Pourquoi TCP plutôt qu'UDP pour un chat ?
2. Que se passe-t-il si le serveur tombe ? Quelle transparence n'est pas assurée ?
3. Comment faire pour que deux serveurs de chat partagent les mêmes messages ? (indice : middleware à messages)

## À rendre

Le code source (`ChatServer.java`, `ChatClient.java`) et une capture d'écran avec **trois** clients connectés.
