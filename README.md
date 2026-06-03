# QuizBit

QuizBit est une plateforme de quiz mobile avec génération de questions par IA, comptes Firebase, scores Firestore, mode battle royale, stockage avatar Cloudinary, panel admin cloud et panel admin local.

## Liens importants

- Panel admin Vercel : https://quizbit-admin.vercel.app/
- Application mobile : React Native, dossier racine du dépôt
- Panel admin cloud : `vercel/`
- Panel admin local : `local/`
- Workflow APK GitHub Actions : `.github/workflows/android-apk.yml`

## Fonctionnalités principales

### Application mobile

- Inscription et connexion via Firebase Auth.
- Profils utilisateurs stockés dans Firestore.
- Génération de quiz avec Google Gemini.
- Questions QCM et questions ouvertes.
- QCM avec 2 à 5 choix maximum.
- Questions ouvertes : l'utilisateur saisit sa réponse et l'app l'analyse avec Gemini pour validation.
- Scores sauvegardés dans Firestore.
- Leaderboard global depuis Firestore.
- Mode battle royale avec salles Firestore :
  - création de salle ;
  - code de salle ;
  - rejoindre une salle ;
  - nombre maximal de joueurs ;
  - nombre de questions ;
  - seuil d'élimination ;
  - statut `waiting`, `active`, `finished` ;
  - calcul du gagnant.
- Upload d'avatar via Cloudinary si configuré.
- Données réelles uniquement côté app mobile : pas de mode invité, pas de mock data, pas de fallback local de compte/score/battle.

### Panel admin Vercel

Le panel cloud est disponible ici :

```txt
https://quizbit-admin.vercel.app/
```

Il permet de consulter et diagnostiquer les données réelles Firestore :

- dashboard global ;
- utilisateurs ;
- quiz ;
- questions, réponses attendues, types de questions et choix QCM ;
- scores ;
- battle rooms ;
- recherche dans les données chargées ;
- export CSV ;
- export JSON ;
- panneau de détails JSON par document ;
- top scores ;
- activité récente ;
- diagnostics Firebase, Gemini, Mistral et Cloudinary.

Les tests Gemini, Mistral et Cloudinary passent par des routes API Vercel côté serveur afin d'éviter les problèmes CORS et de garder les clés hors du bundle navigateur.

### Panel admin local

Le dossier `local/` contient un panel admin local, sans backend, pour tests/développement hors cloud.

```sh
cd local
npm run start
```

Puis ouvrir :

```txt
http://localhost:4173
```

Ce panel utilise `localStorage`. Il ne modifie pas Firestore.

## Architecture du dépôt

```txt
.
├── App.tsx                         # Point d'entrée UI React Native
├── index.js                        # Enregistrement AppRegistry
├── src/
│   ├── controllers/
│   │   ├── AuthController.ts        # Firebase Auth + profil Firestore
│   │   ├── BattleRoyaleController.ts# Rooms battle royale Firestore
│   │   ├── MultiplayerController.ts # Base réseau local historique
│   │   ├── QuizController.ts        # Etat et validation quiz
│   │   └── ScoreController.ts       # Scores et leaderboard Firestore
│   ├── models/
│   │   ├── AIModel.ts               # Gemini + parsing JSON robuste
│   │   ├── CloudinaryModel.ts       # Upload Cloudinary
│   │   └── NetworkModel.ts          # Zeroconf/UDP historique
│   ├── utils/
│   │   ├── firebase.ts              # Config Firebase depuis env
│   │   ├── sqlite.ts                # Interface locale mémoire historique
│   │   ├── supabase.ts              # Client Supabase optionnel
│   │   └── theme.ts                 # Couleurs/spacing
│   └── views/
│       ├── AuthView.tsx             # Connexion/inscription
│       ├── BattleRoyaleView.tsx     # Création/rejoint rooms
│       ├── HomeView.tsx             # Accueil, profil, avatar, quiz
│       ├── LeaderboardView.tsx      # Scores Firestore
│       └── QuizView.tsx             # Quiz solo/battle
├── android/                         # Projet Android natif
├── ios/                             # Projet iOS natif
├── vercel/                          # Panel admin cloud Vercel
├── local/                           # Panel admin local statique
└── .github/workflows/android-apk.yml# Build APK GitHub Actions
```

## Logo et assets visuels

Le logo officiel doit être placé dans :

```txt
logo/quizbit-logo.png
```

Puis lancer :

```sh
npm run logo
```

Cette commande génère automatiquement :

- les icônes Android `ic_launcher` et `ic_launcher_round` dans tous les dossiers `mipmap-*` ;
- le logo du splash Android `android/app/src/main/res/drawable-nodpi/logo_splash.png` ;
- le logo runtime React Native `src/assets/logo.png`.

Le thème mobile et les panels utilisent une palette sombre bleu/cyan/violet assortie au logo.

## Prérequis

- Node.js `>= 22.11.0`
- npm
- Java 17 pour Android
- Android SDK pour build local Android
- Xcode/CocoaPods pour iOS
- Projet Firebase avec Auth + Firestore
- Clé Google Gemini
- Compte Cloudinary si avatar upload souhaité, avec cloud name et API credentials
- Compte Vercel pour le panel admin cloud

## Installation racine

```sh
npm install
```

## Variables d'environnement

Le dépôt contient un `.env` racine demandé pour l'app mobile. Les valeurs sensibles ne sont pas documentées ici en clair.

Variables utilisées par l'app mobile :

```env
GEMINI_API_KEY=
MISTRAL_API_KEY=
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=
SUPABASE_URL=
SUPABASE_ANON_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_URL=
CLOUDINARY_UPLOAD_PRESET=
```

Variables utilisées par le panel Vercel :

```env
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_MEASUREMENT_ID=
GEMINI_API_KEY=
MISTRAL_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_URL=
CLOUDINARY_UPLOAD_PRESET=
```

Un exemple est fourni dans :

```txt
vercel/.env.example
```

## Lancer l'application mobile

### Metro

```sh
npm start
```

### Android

```sh
npm run android
```

### iOS

```sh
bundle install
bundle exec pod install
npm run ios
```

## Build APK local

Sur une machine avec Android SDK configuré :

```sh
cd android
./gradlew assembleDebug
```

APK généré :

```txt
android/app/build/outputs/apk/debug/app-debug.apk
```

## Build APK avec GitHub Actions

Le workflow suivant construit automatiquement un APK debug :

```txt
.github/workflows/android-apk.yml
```

Déclenchements :

- push vers `main` ;
- push vers `cursor/**` ;
- pull request vers `main` ;
- lancement manuel `workflow_dispatch`.

Le workflow :

1. installe Node 22.11 ;
2. installe Java 17 ;
3. installe Android SDK 36, build-tools 36 et NDK 27.1 ;
4. écrit `android/local.properties` ;
5. génère `.env` depuis les GitHub Secrets ;
6. lance lint, typecheck, tests ;
7. valide le bundle Android React Native ;
8. lance `./gradlew assembleDebug` ;
9. upload l'APK en artifact.

Artifact :

```txt
quizbit-debug-apk-<run_number>
```

## Panel admin Vercel

### Installation

```sh
cd vercel
npm install
```

### Développement local

```sh
npm start
```

### Build production

```sh
npm run build
```

### Routes API de diagnostic

```txt
/api/test-gemini
/api/test-mistral
/api/test-cloudinary
```

Ces routes sont utilisées par la page Settings du panel admin.

## Panel admin local

```sh
cd local
npm run start
```

Vérification syntaxe :

```sh
npm run check
```

Le panel local sert à manipuler des données locales dans le navigateur. Il ne remplace pas Firestore pour l'application mobile.

## Tests et qualité

Depuis la racine :

```sh
npm run lint
npx tsc --noEmit
npm test -- --runInBand
```

Valider le bundle Android JavaScript :

```sh
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/quizbit-index.android.bundle \
  --assets-dest /tmp/quizbit-assets
```

Valider le panel Vercel :

```sh
cd vercel
node --check api/test-gemini.js
node --check api/test-mistral.js
node --check api/test-cloudinary.js
npm run build
```

Valider le panel local :

```sh
cd local
npm run check
```

## Types de questions

QuizBit supporte deux types de questions dans les quiz Firestore et dans le panel admin.

### QCM (`mcq`)

```ts
{
  id: string;
  text: string;
  type: 'mcq';
  options: string[]; // 2 à 5 choix maximum
  answer: string;   // doit correspondre exactement à un des choix
}
```

### Réponse ouverte (`open`)

```ts
{
  id: string;
  text: string;
  type: 'open';
  answer: string; // réponse attendue
}
```

Pour une question ouverte, l'utilisateur saisit lui-même sa réponse. L'app compare d'abord la réponse normalisée, puis utilise Gemini pour analyser les synonymes et formulations équivalentes.

## Collections Firestore attendues

### `users`

```ts
{
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
  createdAt?: string;
  updatedAt?: string;
}
```

### `scores`

```ts
{
  userId: string;
  displayName: string;
  theme: string;
  score: number;
  mode: 'solo' | 'battle_royale';
  createdAt: Timestamp;
}
```

### `battleRooms`

```ts
{
  id: string;
  code: string;
  hostId: string;
  status: 'waiting' | 'active' | 'finished';
  config: {
    theme: string;
    maxPlayers: number;
    questionCount: number;
    eliminationScore: number;
  };
  players: Array<{
    userId: string;
    displayName: string;
    score: number;
    eliminated: boolean;
    finished: boolean;
  }>;
  questions?: Question[];
  winnerId?: string;
  createdAt: string;
}
```

### `quizzes`

Le panel admin lit aussi une collection `quizzes` si elle existe pour afficher les quiz générés.

## Politique données réelles

L'application mobile ne crée pas de comptes, scores ou battle rooms mock/locales. Les données runtime de production doivent venir de Firebase Auth et Firestore.

Si Firebase ou Gemini n'est pas configuré, l'app affiche une erreur explicite au lieu de fabriquer des données.

## Sécurité

- Les clés API ne doivent pas être affichées dans la documentation.
- Les diagnostics Gemini/Mistral/Cloudinary du panel Vercel passent côté serveur via API routes.
- Les secrets de production doivent aussi être configurés dans Vercel et GitHub Actions Secrets.
- Les fichiers `.env` ont été restaurés à la demande du propriétaire du projet.

## Déploiement Vercel

Le panel `vercel/` est prévu pour Vercel et répond actuellement à :

```txt
https://quizbit-admin.vercel.app/
```

Le dépôt contient deux configurations pour sécuriser le lien avec Vercel :

- `vercel/vercel.json` si le projet Vercel utilise `vercel/` comme root directory ;
- `vercel.json` + wrappers `api/` à la racine si le projet Vercel est lié à la racine du dépôt.

Dans les deux cas, le build cible le panel admin et garde les routes API de diagnostics disponibles.

Configurer les variables d'environnement Vercel avant déploiement pour que diagnostics et données Firestore fonctionnent correctement.

## Pull request

Les changements sont préparés sur une branche `cursor/*` et destinés à être fusionnés dans `main` via pull request.
