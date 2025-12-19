
# Prompt Détaillé pour l'Application de Gestion de Centre de Jeu "Warriors Gaming"

## 1. Concept Général de l'Application

Vous allez construire une application web complète pour gérer un centre de jeux vidéo ("Gaming Center") nommé "Warriors Gaming". L'application doit avoir deux interfaces distinctes : une interface publique pour les clients (joueurs) et un panneau d'administration complet pour le personnel.

L'application sera construite avec Next.js (App Router), TypeScript, Tailwind CSS, et les composants ShadCN UI. La base de données et l'authentification seront gérées par Firebase (Firestore et Firebase Authentication).

## 2. Structure des Données (Firestore et backend.json)

La structure des données est cruciale. Vous devez définir les entités suivantes :

- **Client**: Représente un joueur. Doit inclure `nom`, `email`, `téléphone`, `date d'inscription`, `type d'abonnement` (enum: Basic, Premium, VIP), `heures d'abonnement restantes`, `heures bonus`, `données d'utilisation` (notes sur les habitudes), et `stationActuelleId`. L'ID du document est l'UID de l'utilisateur Firebase.
- **Admin**: Représente un administrateur. Doit inclure `email` et `rôle` (enum: manager, superadmin). L'ID du document est l'UID de l'utilisateur Firebase.
- **Station**: Représente un poste de jeu. Doit inclure `id` (ex: "PC-01"), `type` (enum: PC, PS5, PS5 VIP, VR Simulator), `statut` (enum: available, in use, maintenance), une liste de `jeux` disponibles, l'ID du `clientActuel` et l'`heure de début de session`.
- **Reservation**: Représente une réservation future. Doit inclure `clientId`, `stationId`, `heure de début`, et `heure de fin`.
- **UsageLog**: Enregistre une session de jeu terminée.
- **ClientHistoryLog**: Un journal d'événements pour un client (check-in, check-out, bonus ajouté, etc.), stocké dans une sous-collection de chaque client.

## 3. Règles de Sécurité Firestore

Les règles doivent être sécurisées par défaut :
- Un utilisateur ne peut lire que son propre profil client et ses propres réservations.
- Les administrateurs (`admins`) peuvent lire et écrire toutes les données (`clients`, `stations`, `reservations`, `usageLogs`).
- Les données des stations sont lisibles par tous (même les non-connectés) pour voir leur statut, mais ne peuvent être modifiées que par les administrateurs.

## 4. Fonctionnalités de l'Interface Publique (Client)

### Page d'Accueil (`/`)
- **En-tête**: Logo, liens de navigation, bouton pour changer le thème (clair/sombre), bouton de connexion/profil.
- **Section Héro**: Une image de fond attrayante avec le titre "Bienvenue chez Warriors Gaming".
- **Section Statut des Postes**:
    - Affiche une grille de cartes, chacune représentant une station de jeu.
    - Chaque carte montre l'ID, le type (avec une icône), la liste des jeux et le statut actuel (`disponible`, `en cours d'utilisation`).
    - Un filtre par type de station doit être présent.
    - Un bouton "Réserver" sur chaque carte de station disponible. Si l'utilisateur n'est pas connecté, le bouton est désactivé.
- **Formulaire de Réservation (Dialog/Modal)**:
    - S'ouvre en cliquant sur "Réserver".
    - Permet à un utilisateur connecté de choisir une date et une heure de début/fin.
    - La soumission crée un document dans la collection `reservations`.
- **Section Localisation**: Une carte Google Maps intégrée montrant l'emplacement de "Warriors Gaming".
- **Pied de page**: Liens vers les réseaux sociaux (Instagram) et informations de contact.

### Connexion / Inscription Client (`/login-client`)
- Une page avec des onglets pour "Se connecter" et "S'inscrire".
- Permet aux clients de créer un compte avec nom, email, et mot de passe, ou de se connecter.
- Après connexion/inscription, l'utilisateur est redirigé vers la page d'accueil.

### Page de Profil Client (`/profile`)
- **Route sécurisée**: Accessible uniquement par les utilisateurs connectés.
- **Informations du profil**: Affiche le nom, l'email, le type d'abonnement, les heures restantes (abonnement et bonus). Utilise un avatar généré.
- **QR Code Personnel**: Affiche un QR code unique généré à partir de l'ID du client. Ce code sera utilisé par les admins pour le check-in.
- **Mes Réservations**: Un tableau listant les réservations de l'utilisateur avec les détails (poste, date, heure).

## 5. Fonctionnalités du Panneau d'Administration (`/admin/...`)

### Accès et Navigation
- Toutes les pages sous `/admin` sont protégées et accessibles uniquement par les utilisateurs authentifiés présents dans la collection `admins`.
- Une barre de navigation latérale verticale avec des icônes pour chaque section (Dashboard, Clients, Postes, Scanner, etc.) et un bouton de déconnexion.
- La déconnexion depuis le panneau admin redirige vers la page de connexion admin (`/login`).

### Connexion Admin (`/login`)
- Page de connexion dédiée aux administrateurs.
- Une option pour s'inscrire en tant qu'admin avec un code d'invitation secret.

### Tableau de bord (`/admin`)
- **Cartes de KPI**: Revenu total, nombre de clients, postes en cours d'utilisation.
- **Graphiques**: Un graphique en aires pour les revenus hebdomadaires et un graphique à barres pour les postes les plus populaires.

### Gestion des Clients (`/admin/clients`)
- **Tableau des clients**: Affiche tous les clients avec une fonction de recherche par nom.
- **Actions sur les clients**:
    - **Ajouter un client**: Un formulaire dans un modal pour ajouter un nouveau client. IMPORTANT : La création de l'utilisateur doit se faire via une API côté serveur (`/api/create-user`) utilisant le SDK Admin de Firebase pour ne pas déconnecter l'administrateur. Un email de réinitialisation de mot de passe doit être envoyé au nouveau client.
    - **Modifier**: Modifier les informations d'un client.
    - **Supprimer**: Supprimer un client.
    - **Voir QR Code**: Afficher le QR code du client.
    - **Voir Historique**: Afficher un journal de toutes les activités du client (bonus, check-in/out...).

### Gestion des Postes (`/admin/stations`)
- **Tableau des postes**: Liste tous les postes avec leur type, statut, et jeux.
- **Sélecteur de Statut**: Permet de changer le statut d'un poste (`disponible`, `en cours d'utilisation`, `maintenance`) directement depuis le tableau.
- **Actions sur les postes**: Ajouter, modifier (y compris la sélection de jeux depuis une liste), supprimer un poste.
- **Gestion des Jeux**: Un panneau séparé sur la même page pour ajouter/supprimer des jeux à une liste globale qui sera utilisée pour peupler les listes de jeux des stations.

### Scanner et Suivi en Temps Réel (`/admin/scan`)
- **Vue d'ensemble des postes**: Affiche une grille de cartes, chacune représentant un poste, avec son statut en temps réel.
- **Si une station est 'en cours d'utilisation'**: Affiche le nom du client et un chronomètre de la durée de la session. Un bouton "Libérer" est disponible.
- **Libérer une station**: Ouvre un modal qui calcule le coût de la session. Permet d'utiliser les heures bonus du client pour réduire le coût. Confirme le paiement et libère la station (met à jour le statut de la station, le profil du client, et crée une entrée dans `ClientHistoryLog`).
- **Si une station est 'disponible'**: Affiche un bouton "Assigner un client".
- **Assigner un client**: Ouvre un modal avec la caméra pour scanner le QR code d'un client. Une fois scanné, la session démarre, et les statuts sont mis à jour.
- **Attribuer un Bonus**: Un bouton global sur la page pour ouvrir un modal qui permet de scanner un QR code client et de lui ajouter des heures/minutes bonus.

### Section IA de Fidélité (`/admin/loyalty`)
- Une page utilisant Genkit pour fournir des recommandations.
- L'admin sélectionne un client dans une liste déroulante.
- L'IA analyse les données d'utilisation du client (stockées dans `usageData`) et son type d'abonnement.
- L'IA recommande un bonus personnalisé (ex: "1h gratuite de PS5", "Boisson offerte") à partir d'une liste de bonus disponibles, en expliquant son raisonnement.

### Paramètres (`/admin/settings`)
- **Gestion des utilisateurs**: Un bouton pour ajouter un nouvel administrateur (via un modal qui demande nom et email, et déclenche l'envoi d'un email de réinitialisation de mot de passe).
- **Sécurité**: Un formulaire pour que l'administrateur connecté puisse changer son propre mot de passe.
- **Notifications & Apparence**: Options factices pour la gestion des notifications et des thèmes.

## 6. Internationalisation (i18n)

- L'application doit prendre en charge le français (par défaut), l'anglais et l'arabe.
- Mettre en place un système de traduction simple avec un hook `useTranslation` et un `LanguageProvider`.
- Un sélecteur de langue doit être présent dans l'en-tête principal et l'en-tête de l'administration.
