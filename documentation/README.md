# Documentation QuizBit

## 1. Vue d'ensemble

QuizBit est une application mobile React Native avec un panel admin Vercel.
L'application permet de créer des quiz avec IA, de jouer en solo, de gérer des
avatars, de sauvegarder les scores et de lancer des parties Battle Royale.

Le projet suit une règle importante : aucune donnée mockée en production. Les
comptes, scores, avatars et battles doivent venir des services réels.

## 2. Structure du dépôt

```txt
.
├── App.tsx                         # Navigation principale mobile
├── src/
│   ├── components/                  # Composants partagés
│   ├── controllers/                 # Logique applicative mobile
│   ├── models/                      # Services IA, Cloudinary, réseau
│   ├── utils/                       # Config, API, thème, session locale
│   └── views/                       # Écrans React Native
├── vercel/
│   ├── api/index.js                 # Dispatcher API unique Vercel
│   ├── lib/api/                     # Handlers API réels
│   └── src/                         # Panel admin web
├── api/index.js                     # Wrapper si Vercel déploie la racine
└── documentation/                   # Guide projet
```

## 3. Application mobile

### Authentification

L'écran de connexion appelle les routes Vercel :

- `/api/auth-register`
- `/api/auth-login`

Ces routes utilisent Firebase Auth côté serveur. Après connexion, le compte est
sauvegardé localement avec AsyncStorage. Au prochain lancement, `App.tsx`
restaure la session via `AuthController.restoreSession()`.

### Session persistante

Le stockage local est géré dans :

```txt
src/utils/sessionStore.ts
```

La session contient le compte Firebase/Vercel retourné par le serveur, dont
`idToken`. La déconnexion supprime cette session locale.

### Avatar utilisateur

L'écran Home permet de choisir une image depuis le téléphone avec
`react-native-image-picker`. L'image est ensuite envoyée à Cloudinary si
`CLOUDINARY_CLOUD_NAME` et `CLOUDINARY_UPLOAD_PRESET` sont configurés.

Flux :

```txt
HomeView -> pickAvatarFromLibrary -> CloudinaryModel.uploadImage
         -> /api/user-update-avatar -> Firestore users/{userId}
```

### Quiz solo

Le quiz solo appelle :

```txt
/api/generate-questions
```

Le serveur tente Gemini en premier. Si Gemini échoue ou dépasse son quota, il
bascule automatiquement sur Mistral.

## 4. Battle Royale

Le mode Battle Royale utilise Firestore côté mobile pour créer et mettre à jour
les salles dans la collection :

```txt
battleRooms
```

Chaque salle contient :

- un code court ;
- l'hôte ;
- la configuration de partie ;
- les joueurs ;
- les questions générées au démarrage ;
- le statut `waiting`, `active` ou `finished`.

Si l'écran indique que Firestore n'est pas configuré, vérifier les variables
mobile :

```txt
FIREBASE_API_KEY
FIREBASE_PROJECT_ID
FIREBASE_APP_ID
```

Le code accepte aussi les variantes :

```txt
REACT_APP_FIREBASE_*
VITE_FIREBASE_*
```

Après modification des variables, reconstruire l'APK.

## 5. Panel admin Vercel

Le panel admin se trouve dans :

```txt
vercel/
```

Il affiche :

- dashboard ;
- questions ;
- utilisateurs ;
- scores ;
- battle rooms ;
- diagnostics.

Les diagnostics vérifient :

- Firestore client ;
- Firebase Auth serveur ;
- Gemini ;
- Mistral ;
- Cloudinary.

## 6. API Vercel

Pour rester sous la limite du plan gratuit Vercel, toutes les routes API passent
par une seule Serverless Function :

```txt
vercel/api/index.js
```

Les handlers réels sont dans :

```txt
vercel/lib/api/
```

Routes principales :

```txt
/api/auth-register
/api/auth-login
/api/firebase-auth
/api/generate-questions
/api/scores-record
/api/scores-list
/api/user-update-avatar
/api/user-update-stats
/api/test-gemini
/api/test-mistral
/api/test-cloudinary
```

## 7. Variables d'environnement

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

### Vercel serveur

```txt
GEMINI_API_KEY=
MISTRAL_API_KEY=
FIREBASE_API_KEY=
FIREBASE_PROJECT_ID=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## 8. Firebase

À activer dans Firebase Console :

1. Firestore Database.
2. Authentication.
3. Fournisseur Email/Mot de passe.

Si Firebase Auth renvoie `CONFIGURATION_NOT_FOUND`, le serveur Vercel est
joignable mais Firebase Auth n'est pas activé ou les variables Vercel ne pointent
pas vers le bon projet.

## 9. Déploiement

### Panel Vercel

Si le projet Vercel utilise `vercel/` comme root directory :

```sh
cd vercel
npm ci
npm run build
```

Si Vercel utilise la racine du dépôt, `vercel.json` redirige le build vers le
sous-dossier `vercel/`.

### Mobile Android

```sh
npm ci
npm run lint
npm test -- --runInBand
cd android
./gradlew assembleRelease
```

## 10. Checklist de dépannage

- Le panel répond mais l'app non : vérifier `VERCEL_API_BASE_URL`.
- Auth impossible : vérifier Firebase Authentication et Email/Mot de passe.
- Battle Royale impossible : vérifier la config Firebase dans l'APK.
- Avatar non uploadé : vérifier Cloudinary et `CLOUDINARY_UPLOAD_PRESET`.
- Gemini en quota : Mistral prend automatiquement le relais.
