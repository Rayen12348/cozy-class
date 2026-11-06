---
date: 2026-10-16
tags: [dar, sockets, udp, threads, java]
---
# Résumé — Séance 4 : Les sockets (3)

Support : [[Séance 4 - Chapitre 1 - Sockets (3).pdf]] · séance du 16/10/2026 · précédente : [[Résumé - Séance 3 - Sockets (2)]]

## 1. Serveur multithread : numéroter les clients

Pour savoir avec quel client dialogue chaque thread, le serveur tient un **compteur** `numCli` et le passe au thread de conversation.

```java
// Server.java
public class Server extends Thread {
    @Override
    public void run() {
        int numCli = 0;
        try (ServerSocket ss = new ServerSocket(2026)) {
            while (true) {
                Socket s = ss.accept();
                ++numCli;                                  // un client de plus
                new Conversation(s, numCli).start();
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
        new Server().start();
    }
}
```

```java
// Conversation.java
public class Conversation extends Thread {
    private final Socket s;
    private final int numCli;

    public Conversation(Socket socket, int n) {
        super();
        this.s = socket;
        this.numCli = n;
    }

    @Override
    public void run() {
        System.out.println("ceci est un client numéro " + numCli);
        // … échange des données avec ce client …
        try {
            s.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

> [!tip] Pourquoi passer le numéro au constructeur ?
> Chaque `Conversation` garde **sa propre copie** du numéro : même si `numCli` continue d'augmenter dans le serveur, le thread du client 1 affichera toujours 1.

## 2. Sockets en mode non connecté (UDP) : principe

En **mode datagramme**, on envoie des **paquets de données indépendants** (les datagrammes) sur le réseau.

- **Pas de connexion** entre la partie client et la partie serveur.
- **Pas de fiabilité** ni de gestion de la communication :
  - un paquet peut **ne pas arriver** (perdu par le réseau) ;
  - un paquet P2 envoyé après un paquet P1 peut **arriver avant** lui (selon les routes du réseau).
- La communication se fait souvent **dans les deux sens** : le serveur doit donc connaître la localisation du client. Elle est indiquée **dans le paquet reçu** (un paquet = **informations d'en-tête** + **données à transmettre**), et le serveur peut répondre à cette adresse **sans établir de connexion**.

| Client | Serveur |
|---|---|
| 1. Crée une socket pour accéder à la couche UDP et la lie à un **port quelconque** | 1. Crée une socket et la lie à un **port UDP particulier** |
| 2. Envoie un paquet via sa socket en précisant l'adresse du **destinataire** : l'adresse IP de la machine du serveur et le numéro de port de sa socket | 2. Se met en attente de réception d'un paquet sur sa socket |
| | 3. Reçoit le paquet (sauf problème réseau) |
| | 4. Lit les données et prépare la réponse |
| | 5. Envoie la réponse |

## 3. Les classes Java pour UDP

| Classe | Rôle |
|---|---|
| `InetAddress` | le codage des adresses IP |
| `InetSocketAddress` | le codage du couple **adresse IP / port** |
| `DatagramSocket` | la socket en mode non connecté |
| `DatagramPacket` | un paquet de données envoyé via une socket en mode non connecté |

### `InetSocketAddress`

Une adresse de socket : **adresse IP + port**, ou **nom d'hôte + port**. Elle sert surtout à identifier le **destinataire** ou la **source** d'un échange.

| Élément | Rôle |
|---|---|
| `InetSocketAddress(InetAddress addr, int port)` | crée l'adresse à partir d'une adresse IP et d'un port |
| `InetSocketAddress(String hostname, int port)` | crée l'adresse à partir d'un nom d'hôte et d'un port |
| `InetAddress getAddress()` | l'objet `InetAddress` |
| `String getHostName()` | le nom d'hôte |
| `int getPort()` | le numéro de port |

### `DatagramSocket`

| Élément | Rôle |
|---|---|
| `DatagramSocket()` | crée une socket liée à un **port libre quelconque** (côté client) ; lève `SocketException` en cas de problème |
| `DatagramSocket(int port)` | crée une socket liée au **port local** donné (côté serveur) |
| `void send(DatagramPacket p)` | envoie le paquet ; le destinataire est le couple adresse IP / port **précisé dans le paquet** ; lève `IOException` |
| `void receive(DatagramPacket p)` | **attend** et reçoit un paquet : les données sont copiées dans le tableau fourni à la création de `p`, et l'adresse / le port de `p` deviennent ceux de la socket qui l'a **émis** |

### `DatagramPacket`

| Pour… | Constructeur | Paramètres |
|---|---|---|
| **recevoir** | `DatagramPacket(byte[] buf, int length)` | `buf` reçoit les données et doit être **assez grand** ; `length` = taille max à lire, jamais plus grande que le tableau (en général `buf.length`) |
| **envoyer** | `DatagramPacket(byte[] buf, int length, InetAddress address, int port)` | `buf` contient les données ; `length` = leur longueur (jamais plus que `buf`) ; `address` et `port` = la machine et le port **destinataires** |

Pour envoyer, on peut aussi donner directement une `InetSocketAddress` : `new DatagramPacket(buf, length, ia)`, comme dans l'exemple ci-dessous.

| Méthode | Paquet à envoyer | Paquet reçu |
|---|---|---|
| `InetAddress getAddress()` | l'adresse du **destinataire** | l'adresse de l'**expéditeur** |
| `int getPort()` | le port destinataire | le port utilisé par l'**expéditeur** |
| `byte[] getData()` | les données | les données |
| `int getLength()` | la longueur à envoyer | la longueur **reçue** |

## 4. Application client/serveur UDP

Le client envoie « LCS3-GLSI », le serveur répond « Bonjour LCS3-GLSI ! ».

```java
// ServeurUDP.java
import java.net.*;

public class ServeurUDP {
    public static void main(String[] args) throws Exception {
        DatagramSocket socket = new DatagramSocket(2026);      // socket liée au port 2026
        byte[] buffer = new byte[1024];                        // contiendra les données reçues
        System.out.println("Lancement du serveur");

        while (true) {
            DatagramPacket paquet = new DatagramPacket(buffer, buffer.length);
            socket.receive(paquet);                             // attend un paquet
            System.out.println("\n" + paquet.getAddress());

            int taille = paquet.getLength();
            String donnees = new String(paquet.getData(), 0, taille);
            System.out.println("Donnees reçues = " + donnees);

            String message = "Bonjour " + donnees + " !";
            byte[] reponse = message.getBytes();
            System.out.println("Donnees envoyees = " + message);
            DatagramPacket envoi = new DatagramPacket(reponse, reponse.length,
                    paquet.getAddress(), paquet.getPort());     // réponse à l'expéditeur
            socket.send(envoi);
        }
    }
}
```

```java
// ClientUDP.java
import java.net.*;

public class ClientUDP {
    public static void main(String[] args) throws Exception {
        byte[] buffer = "LCS3-GLSI".getBytes();                // données à envoyer
        DatagramSocket socket = new DatagramSocket();          // pas de port particulier
        InetSocketAddress ia = new InetSocketAddress("localhost", 2026);  // adresse du serveur
        DatagramPacket donneesEmises = new DatagramPacket(buffer, buffer.length, ia);
        socket.send(donneesEmises);

        DatagramPacket donneesRecues = new DatagramPacket(new byte[1024], 1024);
        socket.receive(donneesRecues);
        System.out.println("Message : " + new String(donneesRecues.getData(), 0, donneesRecues.getLength()));
        System.out.println("de : " + donneesRecues.getAddress() + ":" + donneesRecues.getPort());
        socket.close();
    }
}
```

> [!remarque] Longueur en octets
> Ici on utilise `getBytes().length` (le nombre d'**octets**) plutôt que `length()` (le nombre de **caractères**) comme sur la diapositive : avec des lettres accentuées, les deux diffèrent et le message serait tronqué.

> [!tip] Pas d'`accept()` en UDP
> Côté serveur, il n'y a **qu'une seule socket** : elle reçoit les paquets de tous les clients et répond à chacun grâce à l'adresse contenue dans son paquet.

## 5. Choisir entre TCP et UDP

- **TCP** est fiable.
- **UDP** n'est pas fiable, et il faut faire attention à la **taille réservée** : si le récepteur réserve un tableau trop petit par rapport aux données envoyées, une partie des données est **perdue**.
- UDP reste intéressant quand **la fiabilité n'est pas essentielle** et quand **une connexion entre les deux applications n'est pas utile**.

> [!exemple] Le thermomètre
> Un thermomètre envoie toutes les 5 secondes la température de l'air à un afficheur distant. Ce n'est pas grave de perdre une mesure de temps en temps, ni d'envoyer des mesures quand l'afficheur est absent : **UDP** convient.

Voir aussi : des objets qui envoient des mesures en continu, c'est le quotidien de l'[[IoT]].

## Récapitulatif du chapitre 1

| | TCP | UDP |
|---|---|---|
| Classes | `ServerSocket`, `Socket` | `DatagramSocket`, `DatagramPacket` |
| Côté serveur | `new ServerSocket(port)`, puis `accept()` | `new DatagramSocket(port)`, puis `receive(paquet)` |
| Côté client | `new Socket(hôte, port)` | `new DatagramSocket()`, puis `send(paquet)` |
| Échange | des **flux** : `getInputStream()` / `getOutputStream()` | des **paquets** : `send()` / `receive()` |
| Texte | `PrintWriter.println()` / `BufferedReader.readLine()` | `getBytes()` / `new String(getData(), 0, getLength())` |
| Plusieurs clients | un thread par client | une seule socket pour tous |

## Questions de révision

1. Pourquoi passe-t-on le numéro du client au constructeur de `Conversation` ?
2. Citer deux problèmes possibles avec des datagrammes UDP.
3. Comment le serveur UDP sait-il à qui répondre ?
4. Quelle est la différence entre les deux constructeurs de `DatagramPacket` ?
5. Que renvoie `getAddress()` sur un paquet reçu ?
6. Donner un exemple où UDP est un bon choix, et expliquer pourquoi.

> [!question]- Réponses
> 1. Pour que chaque thread garde son propre numéro, même quand le compteur du serveur augmente.
> 2. Un paquet peut être perdu ; les paquets peuvent arriver dans le désordre (et des données sont perdues si le tableau de réception est trop petit).
> 3. L'adresse IP et le port de l'expéditeur sont dans le paquet reçu (`getAddress()`, `getPort()`).
> 4. `(buf, length)` sert à **recevoir** ; `(buf, length, address, port)` sert à **envoyer** vers un destinataire.
> 5. L'adresse IP de la machine qui a **envoyé** le paquet.
> 6. Un thermomètre qui envoie une mesure toutes les 5 s : perdre une mesure n'est pas grave et aucune connexion n'est nécessaire.
