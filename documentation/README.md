# Documentation complète QuizBit

Cette documentation explique QuizBit de A à Z pour qu'une personne qui découvre
le dépôt puisse comprendre le produit, les pages, les données, les API et les
mécanismes techniques sans contexte externe.

## 1. Résumé du projet

QuizBit est une application mobile React Native de quiz générés par IA, avec :

- comptes utilisateurs Firebase Auth ;
- profils, scores et salles Battle Royale dans Firestore ;
- génération de questions via API Vercel avec **Mistral en priorité**, puis fallback Gemini (inversé pour les prompts avec média) ;
- correction de réponses ouvertes par IA (Mistral → Gemini) ;
- avatar utilisateur envoyé vers Cloudinary ;
- panel admin cloud hébergé sur Vercel avec **CRUD complet** Firestore ;
- serveur local `local/` : panel admin + API offline + génération Ollama (~98 Mo) ;
- mode offline mobile pointant vers le serveur local (`store.json`).

**Référence données** : voir [documentation/FIRESTORE.md](./FIRESTORE.md) pour le schéma détaillé de chaque collection, la normalisation et les flux lecture/écriture.

Règle produit importante : l'application mobile de production ne doit pas créer
ou afficher de fausses données pour les comptes, scores ou battles. Les données
runtime doivent venir de Firebase/Vercel/Cloudinary.

## 2. Vue d'ensemble de l'architecture

```txt
Application mobile React Native
  -> appelle les routes /api/* sur Vercel
  -> utilise quelques modules natifs téléphone
  -> restaure la session avec AsyncStorage

Vercel Admin + API
  -> affiche les données Firestore
  -> expose une seule Serverless Function /api/index
  -> route vers les handlers dans vercel/lib/api
  -> appelle Firebase Auth, Firestore REST, Gemini, Mistral, Cloudinary

Firebase
  -> Authentication Email/Mot de passe
  -> Firestore collections users, scores, battleRooms, quizzes optionnel

Cloudinary
  -> upload avatar utilisateur

Panel local + API offline (local/)
  -> persiste dans local/data/store.json
  -> panel navigateur synchronisé avec l'API
  -> importe les quiz JSON exportés depuis le panel Vercel
  -> génération Ollama optionnelle (smollm2:135m-instruct-q4_1)
```

## 3. Structure du dépôt

```txt
.
├── App.tsx                         # Navigation principale mobile
├── src/
│   ├── components/                  # Composants UI partagés
│   ├── controllers/                 # Logique métier mobile
│   ├── models/                      # Services IA, Cloudinary, réseau
│   ├── utils/                       # API, Firebase, session, permissions, thème
│   └── views/                       # Écrans React Native
├── android/                         # Projet Android natif + permissions
├── ios/                             # Projet iOS natif + descriptions permissions
├── vercel/
│   ├── api/index.js                 # Dispatcher API unique Vercel
│   ├── lib/api/                     # Handlers serveur réels
│   ├── lib/firebase-rest.js         # Accès REST Firebase Auth/Firestore
│   └── src/                         # Panel admin Vercel
├── api/index.js                     # Wrapper si Vercel déploie la racine
├── local/                           # Panel admin local/offline
└── documentation/                   # Cette documentation
```

## 4. Application mobile : navigation globale

`App.tsx` décide quel écran afficher :

- pas de session restaurée : `AuthView` ;
- session active : `HomeView` ;
- écran battle : `BattleRoyaleView` ;
- leaderboard : `LeaderboardView` ;
- quiz en cours : `QuizView`.

Au démarrage, `App.tsx` appelle `AuthController.restoreSession()`. Si un compte
valide existe dans AsyncStorage, l'utilisateur revient directement sur l'accueil.

## 5. Écran AuthView

Fichier : `src/views/AuthView.tsx`

Rôle : connexion et inscription.

Flux :

1. L'utilisateur choisit Connexion ou Créer compte.
2. L'écran appelle `AuthController.login()` ou `AuthController.register()`.
3. Le contrôleur appelle Vercel :
   - `/api/auth-login`
   - `/api/auth-register`
4. Vercel parle à Firebase Auth.
5. Le profil utilisateur est créé/lu dans Firestore collection `users`.
6. Le compte retourné est sauvegardé localement avec AsyncStorage.

Messages importants :

- si Firebase Auth n'est pas activé, l'erreur `CONFIGURATION_NOT_FOUND` est
  transformée en message lisible ;
- Email/Mot de passe doit être activé dans Firebase Console.

## 6. Session persistante

Fichiers :

```txt
src/controllers/AuthController.ts
src/utils/sessionStore.ts
```

Mécanisme :

- après login/register/update avatar/update stats, le compte est stocké avec
  `saveSession()` ;
- au lancement, `loadSession()` recharge le compte ;
- à la déconnexion, `clearSession()` supprime la session.

La session contient notamment `idToken`, utilisé pour les routes serveur qui
écrivent dans Firestore.

## 7. Écran HomeView

Fichier : `src/views/HomeView.tsx`

Rôle : accueil connecté.

Contenu :

- avatar et identité utilisateur ;
- statistiques : parties, score total, meilleur score ;
- bouton de choix de photo de profil ;
- création de quiz solo ;
- accès Battle Royale ;
- accès leaderboard ;
- déconnexion.

### Avatar

Fichiers :

```txt
src/utils/avatarPicker.ts
src/models/CloudinaryModel.ts
```

Flux :

1. L'utilisateur touche "Choisir une photo de profil".
2. Android demande la permission image si nécessaire.
3. `react-native-image-picker` ouvre la galerie.
4. `CloudinaryModel.uploadImage()` envoie le fichier à Cloudinary si configuré.
5. L'URL finale est envoyée à `/api/user-update-avatar`.
6. Firestore `users/{userId}` est mis à jour côté serveur.
7. La session locale est mise à jour.

Variables nécessaires :

```txt
CLOUDINARY_CLOUD_NAME
CLOUDINARY_UPLOAD_PRESET
```

Si Cloudinary n'est pas configuré, le modèle garde l'URI locale comme fallback
fonctionnel pour éviter de bloquer le profil pendant le développement.

## 8. Création de quiz solo

Le joueur peut configurer :

- thème texte ;
- support de thème natif : image, audio, vidéo, PDF, document, présentation ;
- type de quiz : Mixte, QCM, QRO ;
- nombre de questions, obligatoire avant lancement pour chaque mode ;
- nombre de choix QCM, limité entre 2 et 5 ;
- correction QRO : Souple ou Nom exact.

Fichiers :

```txt
src/views/HomeView.tsx
src/utils/themeMediaPicker.ts
src/models/AIModel.ts
src/controllers/QuizController.ts
vercel/lib/api/generate-questions.js
```

### Support média de thème

`themeMediaPicker.ts` utilise `@react-native-documents/picker`.

Permissions déclarées :

Android `android/app/src/main/AndroidManifest.xml` :

```txt
READ_EXTERNAL_STORAGE avec maxSdkVersion 32
READ_MEDIA_AUDIO
READ_MEDIA_IMAGES
READ_MEDIA_VIDEO
```

iOS `ios/QuizBit/Info.plist` :

```txt
NSPhotoLibraryUsageDescription
NSDocumentsFolderUsageDescription
```

Le fichier n'est pas envoyé brut à l'IA. Son nom, type MIME et métadonnées
servent de contexte de thème. Exemple : un fichier `cours-react-native.pdf`
renforce le prompt de génération autour de React Native.

### Génération IA

Route : `/api/generate-questions`

Mécanisme serveur :

1. Mode `auto` (défaut) : essaie **Mistral**, puis Gemini si échec ou quota.
2. Prompt avec média (image/audio/vidéo/document) : **Gemini** en priorité, puis Mistral.
3. `provider: mistral` ou `provider: gemini` force un ordre avec fallback inverse.
4. Génération par lots si > 16 questions (seuils dans `generate-questions.js`).
5. Normalise les questions et retourne un tableau compatible mobile/panels.

Mode offline (`local/`) : `provider: auto` tente **Ollama** puis la banque de questions locale.

Types de questions :

```ts
type Question = {
  id: string;
  text: string;
  answer: string;
  type: 'mcq' | 'open';
  options?: string[];      // QCM uniquement, maximum 5
  exactAnswer?: boolean;   // QRO uniquement
};
```

## 9. QCM et QRO

### QCM

- L'utilisateur choisit le nombre de choix.
- Le serveur impose entre 2 et 5 choix.
- `answer` doit correspondre exactement à une option.
- Dans l'interface, chaque option est un bouton.

### QRO - question à réponse ouverte

Deux modes existent :

1. **Souple**
   - accepte synonymes ;
   - accepte petites fautes d'orthographe ;
   - refuse les contresens ;
   - correction via `/api/validate-answer` avec Gemini puis Mistral.

2. **Nom exact**
   - utilisé pour noms propres, lieux, termes précis ;
   - comparaison stricte normalisée ;
   - pas de tolérance IA.

## 10. Écran QuizView

Fichier : `src/views/QuizView.tsx`

Rôle : jouer le quiz.

Fonctions :

- affiche score et vies ;
- affiche QCM ou QRO selon `question.type` ;
- en QRO, affiche si la correction est souple ou exacte ;
- anime l'entrée de chaque question ;
- affiche un feedback animé en cas de réussite, d'échec ou de timeout ;
- appelle `QuizController.submitAnswer()` ;
- à la fin, affiche un récapitulatif complet avec une animation d'entrée :
  - toutes les questions ;
  - toutes les réponses attendues ;
  - les choix QCM.

Pour les battles QCM chronométrées, `QuizState.timeLimitSeconds` déclenche un
timer. Si le temps expire, l'app passe à la question suivante.

## 11. Scores et leaderboard

Fichiers :

```txt
src/controllers/ScoreController.ts
vercel/lib/api/scores-record.js
vercel/lib/api/scores-list.js
```

Flux score :

1. À la fin d'un quiz, `App.tsx` appelle `ScoreController.recordScore()`.
2. `/api/scores-record` écrit le score dans Firestore `scores`.
3. `AuthController.updateScoreStats()` appelle `/api/user-update-stats`.
4. Le profil utilisateur Firestore est mis à jour.
5. La session locale reçoit les nouvelles statistiques.

Leaderboard :

- `LeaderboardView` appelle `ScoreController.getLeaderboard()` ;
- la route `/api/scores-list` lit Firestore côté serveur.

## 12. Battle Royale

Fichiers :

```txt
src/views/BattleRoyaleView.tsx
src/controllers/BattleRoyaleController.ts
vercel/lib/api/battle-room-create.js
vercel/lib/api/battle-room-join.js
vercel/lib/api/battle-room-list.js
vercel/lib/api/battle-room-start.js
vercel/lib/api/battle-room-finish.js
```

Le mobile ne fait plus d'écriture directe Firestore pour les battles. Toutes les
opérations passent par Vercel, ce qui évite les erreurs de configuration
Firestore dans l'APK.

Routes :

```txt
/api/battle-room-create
/api/battle-room-join
/api/battle-room-list
/api/battle-room-start
/api/battle-room-finish
/api/battle-room-get
/api/battle-room-chat
/api/battle-room-delete
```

Collection Firestore : `battleRooms` (ID document = code de salle). Détail schéma : [FIRESTORE.md](./FIRESTORE.md#5-collection-battlerooms).

### Interface mobile : deux onglets

Avant d'entrer dans un lobby, `BattleRoyaleView` propose :

1. **Créer un lobby** — formulaire classique (thème texte/audio/vocal, mode classique ou QCM chrono, max joueurs, questions, seuil d'élimination).
2. **Rejoindre** — saisie du code **ou** liste des lobbies actifs (`waiting` / `active`) avec thème, code, joueurs, hôte et statut. Actualisation auto toutes les 5 s. Seuls les lobbies **en attente** sont rejoignables.

### Scores battle et classement

À la fin d'une battle, l'app appelle d'abord `recordScore(..., 'battle_royale')` puis `battle-room-finish`. Le score apparaît ainsi dans l'onglet **Top** (filtre battle) et dans les analytics du panel.

### Lobby et chat

Après création ou après avoir rejoint une salle, l'utilisateur arrive dans le
lobby. Le lobby affiche le code, les joueurs, le mode de jeu, le nombre de
questions et les paramètres importants. Un bouton ouvre le chat du lobby pour
permettre aux participants de discuter et se concerter sur le thème avant le
lancement.

Règles du chat :

- disponible uniquement quand la salle est en statut `waiting` ;
- stocké dans `battleRooms/{code}.chatMessages` ;
- rafraîchissable depuis le lobby ;
- remis à zéro automatiquement quand le jeu est lancé ;
- supprimé avec le lobby via `/api/battle-room-delete`.

### Modes Battle

1. **Classique**
   - nombre de questions défini avant création de la salle ;
   - questions mixtes ;
   - score minimum pour survivre ;
   - pas de timer obligatoire.

2. **QCM chronométré**
   - nombre de questions défini avant création de la salle ;
   - questions obligatoirement QCM ;
   - durée par question définie au départ, par exemple 15 secondes ;
   - si le joueur répond faux, il passe directement à la question suivante ;
   - si le temps expire, il passe directement à la question suivante ;
   - fin de quiz avec récapitulatif questions/réponses.

## 13. Panel admin Vercel

Dossier : `vercel/`

Rôle : administrer les données cloud.

Pages :

- Dashboard : métriques globales ;
- Quiz & Questions : visualisation des quiz Firestore si présents ;
- Users : comptes/profils ;
- Scores : leaderboard et historique ;
- Battle Rooms : salles Firestore ;
- Settings : diagnostics et test IA.

### CRUD Firestore

Sur les pages Quiz, Users, Scores et Battle Rooms :

- **Créer** : document par défaut selon la collection (`vercel/src/adminCrud.js`) ;
- **Modifier** : modale JSON éditable ;
- **Supprimer** : confirmation puis `admin-firestore-delete`.

Les mutations passent par l'API serveur (`admin-firestore-upsert` / `admin-firestore-delete`) avec clé panel et token Firestore. Les documents sont normalisés à la lecture via `firestore-normalize.js`.

### Diagnostics Settings

Vérifie :

- Firestore client ;
- Firebase Auth serveur ;
- Gemini ;
- Mistral ;
- Cloudinary.

### Génération et export JSON

Dans Settings, le bloc "Test prompt IA" permet de générer un quiz via l'API
Vercel. Après génération, le bouton d'export télécharge un JSON au format :

```txt
quizbit-quiz-v1
```

Ce fichier est fait pour être importé dans le panel local/offline.

## 14. Panel admin local / serveur offline

Dossier : `local/`

Rôle : jouer et administrer **sans Internet** via un serveur Node tout-en-un.

```sh
cd local
npm start
```

- Panel : http://localhost:3000/
- API mobile : http://localhost:3000/api/…
- Persistance : `local/data/store.json` (partagé app + panel)

Pages :

- Dashboard ;
- Quiz (génération Ollama + CRUD) ;
- Joueurs ;
- Scores ;
- Battle Rooms ;
- Import / Export ;
- Paramètres (URL serveur, test Ollama).

L'app mobile active **Mode offline** dans Paramètres et pointe vers l'IP du PC (`10.0.2.2` émulateur, IP LAN sur téléphone réel).

Compte démo : `demo@local.quizbit` / `demo123`.

Voir aussi `local/README.md`.

### Import quiz Vercel

1. Générer un quiz dans le panel Vercel.
2. Cliquer sur "Exporter ce quiz JSON offline".
3. Ouvrir le panel local.
4. Aller dans Import / Export.
5. Importer le fichier JSON.
6. Le quiz est ajouté à la liste locale.

Le panel local ne modifie jamais Firestore.

## 15. API Vercel

Pour rester sous la limite du plan gratuit Vercel, toutes les routes API sont
routées par une seule fonction :

```txt
vercel/api/index.js
```

Handlers :

```txt
vercel/lib/api/
```

Routes principales :

```txt
# Auth & profil
/api/auth-register
/api/auth-login
/api/firebase-auth
/api/user-update-avatar
/api/user-update-stats

# Quiz & IA
/api/generate-questions
/api/validate-answer
/api/test-gemini
/api/test-mistral
/api/test-cloudinary

# Scores
/api/scores-record
/api/scores-list

# Battle Royale
/api/battle-room-create
/api/battle-room-join
/api/battle-room-list
/api/battle-room-start
/api/battle-room-finish
/api/battle-room-get
/api/battle-room-chat
/api/battle-room-delete

# Panel admin Firestore
/api/admin-firestore-stats
/api/admin-firestore-list
/api/admin-firestore-upsert
/api/admin-firestore-delete
/api/admin-save-quiz
```

## 16. Variables d'environnement

### Mobile

```txt
VERCEL_API_BASE_URL=https://quizbit-admin.vercel.app
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
```

Le mobile accepte aussi :

```txt
REACT_APP_FIREBASE_*
VITE_FIREBASE_*
```

### Vercel serveur

```txt
GEMINI_API_KEY=
MISTRAL_API_KEY=
FIREBASE_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_AUTH_DOMAIN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## 17. Firebase

À activer :

1. Firebase Authentication.
2. Provider Email/Mot de passe.
3. Cloud Firestore.

Collections utilisées :

```txt
users
scores
battleRooms
quizzes (optionnel, surtout admin)
```

Documentation détaillée schéma, normalisation, flux CRUD et miroir offline :
[documentation/FIRESTORE.md](./FIRESTORE.md)

Erreur connue :

- `CONFIGURATION_NOT_FOUND` signifie généralement que Firebase Auth ou le
  provider Email/Mot de passe n'est pas actif, ou que les variables Vercel ne
  pointent pas vers le bon projet.

## 18. Cloudinary

Utilisé pour les avatars.

Variables principales :

```txt
CLOUDINARY_CLOUD_NAME
CLOUDINARY_UPLOAD_PRESET
```

Le panel Vercel contient aussi un diagnostic Cloudinary.

## 19. Installation et validation

### Racine mobile

```sh
npm ci
npx tsc --noEmit
npm run lint
npm test -- --runInBand
```

### Panel Vercel

```sh
npm run check --prefix vercel
npm run build --prefix vercel
```

### Panel local

```sh
npm run check --prefix local
cd local
npm run start
```

### Android release

```sh
cd android
./gradlew assembleRelease
```

Après ajout/modification de modules natifs, reconstruire l'APK.

## 20. Déploiement

1. Fusionner la PR dans `main`.
2. Redéployer Vercel depuis `main`.
3. Rebuilder l'APK Android/iOS.
4. Installer l'APK sur un vrai téléphone pour tester les permissions natives.

## 21. Checklist de test manuel

Mobile :

- créer un compte ;
- se reconnecter après fermeture de l'app ;
- choisir un avatar depuis la galerie ;
- charger un PDF/audio/vidéo/image comme support de thème ;
- générer un quiz QCM ;
- générer un quiz QRO souple ;
- générer un quiz QRO nom exact ;
- vérifier le récapitulatif final ;
- enregistrer un score ;
- consulter le leaderboard.

Battle :

- créer une salle classique (onglet Créer) ;
- rejoindre avec un code ou depuis la liste des lobbies actifs (onglet Rejoindre) ;
- lancer la battle ;
- créer une salle QCM chronométrée ;
- vérifier le passage automatique en cas d'erreur ou timeout ;
- vérifier le récapitulatif et le score dans le classement battle ;
- chat lobby avant démarrage.

Panels :

- ouvrir Settings Vercel ;
- tester Firebase Auth serveur ;
- tester Gemini/Mistral/Cloudinary ;
- générer un quiz ;
- exporter JSON ;
- importer ce JSON dans le panel local.

## 22. Dépannage rapide

- App ne contacte pas le serveur : vérifier `VERCEL_API_BASE_URL`.
- Auth impossible : vérifier Firebase Auth + Email/Mot de passe.
- Gemini quota : Mistral doit prendre le relais.
- Avatar non uploadé : vérifier Cloudinary et permissions photo.
- Média thème impossible : vérifier permissions Android/iOS et module documents.
- Battle impossible : vérifier routes Vercel et variables Firebase serveur.
- Import local impossible : vérifier que le JSON contient `questions`.

## 23. Guide opérationnel des panels admin

Cette section sert de procédure rapide pour configurer et utiliser les deux
panels après installation ou déploiement.

### 23.1 Panel Vercel : configuration attendue

Le panel Vercel est le tableau de bord cloud. Il doit être utilisé quand on veut
voir ou diagnostiquer les données réelles.

Avant de considérer le panel prêt, ouvrir la page **Settings** et vérifier :

1. **Firebase Firestore** : doit retourner `Connection Firestore OK`.
2. **Firebase Auth serveur** : doit confirmer que l'auth serveur fonctionne.
3. **Google Gemini API** : peut répondre OK ou quota à vérifier ; si Gemini est
   en quota, Mistral doit prendre le relais.
4. **Mistral AI API** : doit être OK pour garantir le fallback.
5. **Cloudinary Upload** : doit être OK si l'upload avatar est utilisé.

La carte **Checklist déploiement Vercel** rappelle les variables minimales :

```txt
FIREBASE_API_KEY ou REACT_APP_FIREBASE_API_KEY
FIREBASE_PROJECT_ID ou REACT_APP_FIREBASE_PROJECT_ID
FIREBASE_AUTH_DOMAIN ou REACT_APP_FIREBASE_AUTH_DOMAIN
GEMINI_API_KEY
MISTRAL_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_UPLOAD_PRESET
```

La carte **Routes critiques disponibles** rappelle les endpoints à vérifier
avant de publier une nouvelle APK :

```txt
/api/auth-login
/api/generate-questions
/api/validate-answer
/api/battle-room-create
/api/battle-room-chat
/api/scores-list
```

Si une variable est changée dans Vercel, il faut redéployer le projet. Les
anciennes exécutions Vercel ne prennent pas toujours les nouvelles variables en
compte tant qu'un redeploy n'a pas été lancé.

### 23.2 Panel Vercel : génération et export de quiz

Depuis **Settings > Test prompt IA** :

1. saisir un prompt ou thème ;
2. choisir le nombre de questions ;
3. cliquer sur génération automatique ou génération Mistral ;
4. vérifier les questions affichées ;
5. cliquer sur l'export JSON pour télécharger un fichier compatible offline.

Le JSON exporté contient :

```txt
format: quizbit-quiz-v1
theme
provider
model
questions[]
```

Ce fichier peut être importé dans le panel local sans Firebase ni Vercel.

### 23.3 Panel local : configuration attendue

Le panel local est conçu pour fonctionner hors cloud. Il ne parle pas à
Firestore, Firebase Auth, Gemini, Mistral ou Cloudinary. Tout est stocké dans le
navigateur via `localStorage`.

La page **Import / Export** contient une carte **Configuration locale** qui
explique :

- le stockage local ;
- l'import de quiz Vercel ;
- l'usage recommandé : démo, test, préparation offline.

Workflow recommandé :

1. Générer un quiz dans le panel Vercel.
2. Exporter le JSON offline.
3. Ouvrir le panel local.
4. Aller dans **Import / Export**.
5. Importer le fichier JSON.
6. Vérifier le quiz dans la page **Quiz**.

### 23.4 Ce que le panel local ne fait pas

Le panel local ne remplace pas le backend de production. Il ne doit pas être
utilisé pour valider :

- Firebase Auth ;
- Firestore réel ;
- scores cloud ;
- rooms Battle Royale réelles ;
- upload Cloudinary ;
- quotas Gemini/Mistral.

Il sert uniquement à manipuler des données locales, importer/exporter des quiz
et tester un scénario offline.

### 23.5 Ordre conseillé après fusion d'une PR

Après fusion dans `main` :

1. Redéployer Vercel.
2. Ouvrir le panel Vercel Settings.
3. Lancer tous les diagnostics.
4. Générer un quiz de test et exporter le JSON.
5. Importer ce JSON dans le panel local.
6. Rebuilder l'APK si la PR touche le mobile ou les modules natifs.
7. Tester sur un vrai téléphone : permissions, avatar, médias, quiz, battle,
   chat lobby et leaderboard.

## 24. Référence Firestore (tables / collections)

Pour une description exhaustive de chaque collection, des champs, de la couche
`firestore-normalize.js`, des routes API associées et du miroir offline
`store.json`, consulter :

```txt
documentation/FIRESTORE.md
```

Ce fichier est la source de vérité pour comprendre comment les données sont
**présentées** dans les panels et **traitées** côté API avant écriture ou après
lecture Firestore.
