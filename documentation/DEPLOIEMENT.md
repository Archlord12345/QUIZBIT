# Déploiement QuizBit — Vercel, CI Android et serveur local

Guide opérationnel pour publier le panel admin, l'API serverless et l'APK Android sans erreurs de build.

## 1. Vue d'ensemble des cibles

| Cible | Déclencheur | Fichiers clés |
|-------|-------------|---------------|
| Panel + API cloud | Push `main` → Vercel | `vercel.json`, `vercel/`, `api/index.js` |
| APK Android | GitHub Actions | `.github/workflows/android-apk.yml` |
| Serveur offline | Manuel (`npm run local:serve`) | `local/`, `local/data/store.json` |

## 2. Déploiement Vercel (panel admin + API)

### Configuration racine (`vercel.json`)

Le projet Vercel est lié à la **racine du dépôt** (pas seulement `vercel/`).

```json
{
  "installCommand": "VERCEL=1 npm ci --prefix vercel && VERCEL=1 npm ci --ignore-scripts",
  "buildCommand": "npm run build --prefix vercel",
  "outputDirectory": "vercel/dist",
  "functions": { "api/index.js": { "maxDuration": 120, "memory": 1024 } }
}
```

| Étape Vercel | Action |
|--------------|--------|
| Install | Dépendances du panel dans `vercel/` |
| Install (2ᵉ passe) | Dépendances racine **sans scripts** (évite `patch-package` React Native) |
| Build | `vite build` → `vercel/dist/` |
| Functions | `api/index.js` réexporte `vercel/api/index.js` (dispatcher unique) |
| Rewrites | `/api/*` → fonction serverless |

### Pourquoi `postinstall` ne casse plus le build Vercel

Le dépôt mobile utilise `patch-package` pour `react-native-audio-recorder-player` (patch RN 0.85).

Script : `scripts/postinstall.mjs`

- **Ignoré sur Vercel** si `VERCEL=1` ou `VERCEL_ENV` est défini
- **Ignoré** si le module React Native n'est pas installé
- **Exécuté** uniquement en dev local / CI Android après `npm ci` complet

Erreur typique corrigée :

```txt
Failed to apply patch for package react-native-audio-recorder-player
```

### Variables d'environnement Vercel (minimum)

```txt
# Firebase serveur (API mobile + admin)
FIREBASE_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_AUTH_DOMAIN=

# IA
GEMINI_API_KEY=
MISTRAL_API_KEY=

# Cloudinary (avatars)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Panel admin Firestore (optionnel si connexion manuelle UI)
PANEL_FIRESTORE_EMAIL=
PANEL_FIRESTORE_PASSWORD=
ADMIN_PANEL_KEY=
VITE_ADMIN_PANEL_KEY=
```

Variables client (build Vite) — préfixe `VITE_` :

```txt
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Après modification des variables : **redéployer** (les anciennes fonctions gardent l'ancien env).

### Checklist post-déploiement Vercel

1. Ouvrir https://quizbit-admin.vercel.app/
2. **Settings** → diagnostics Firebase Auth, Firestore, Gemini, Mistral, Cloudinary
3. **Paramètres → Connecter Firestore** (ou vérifier `PANEL_FIRESTORE_*`)
4. Tester une route API : `POST /api/firebase-auth`
5. Pages **Users / Scores / Battle** : CRUD (Créer, Modifier, Supprimer)
6. Générer un quiz test → exporter JSON offline

### Routes API critiques

```txt
/api/auth-login
/api/auth-register
/api/generate-questions
/api/validate-answer
/api/scores-record
/api/scores-list
/api/battle-room-create
/api/battle-room-list
/api/battle-room-join
/api/admin-firestore-list
/api/admin-firestore-upsert
/api/admin-firestore-delete
```

## 3. CI GitHub Actions (APK Android)

Workflow : `.github/workflows/android-apk.yml`

Déclenchements : push `main`, `cursor/**`, PR vers `main`, `workflow_dispatch`.

Étapes principales :

1. Node 22.11 + Java 17 + Android SDK 36
2. `.env` depuis GitHub Secrets
3. `npm ci` → **`postinstall`** applique le patch audio (OK en CI Android)
4. `npx tsc --noEmit`, lint, tests
5. `./gradlew assembleRelease`
6. Artifact : `quizbit-release-apk-<run_number>`

Secrets GitHub requis : mêmes clés Firebase, Gemini, Mistral, Cloudinary, `VERCEL_API_BASE_URL`.

## 4. Serveur local offline

```sh
npm run local:serve
# alias : npm run local:server
```

Au démarrage (`local/scripts/ensure-ollama.mjs`) :

1. Démarre `ollama serve` si le daemon est arrêté
2. Télécharge `smollm2:135m-instruct-q4_1` (~98 Mo) si absent
3. Lance le serveur HTTP sur le port 3000

Endpoints utiles :

| Route | Rôle |
|-------|------|
| `GET /api/health` | Statut serveur + `ollama.available` / `ollama.model` |
| `GET /api/test-ollama` | Test rapide du modèle |
| `POST /api/generate-questions` | Génération (`provider: auto` → Ollama puis banque locale) |

L'app mobile en **mode offline** lit `/api/health` et affiche le statut Ollama dans **Paramètres**.

## 5. Mode offline mobile

1. `npm run local:serve` sur le PC
2. App → **Paramètres** → activer **Mode offline**
3. URL serveur :
   - Émulateur Android : `http://10.0.2.2:3000`
   - Téléphone réel : `http://<IP-LAN-PC>:3000`
4. Compte démo : `demo@local.quizbit` / `demo123`

Fichiers :

```txt
src/utils/api.ts           # bascule local / cloud
src/utils/networkHealth.ts # sonde /api/health + statut Ollama
src/views/SettingsView.tsx # configuration URL + affichage Ollama
```

## 6. Scripts npm racine

| Script | Description |
|--------|-------------|
| `npm start` | Metro React Native |
| `npm run android` | Build + lance APK debug |
| `npm run local:serve` | Serveur offline + Ollama auto |
| `npm run local:server` | Alias de `local:serve` |
| `npm run local:ollama` | Installe le modèle Ollama manuellement |
| `npm run logo` | Génère icônes et assets logo |

## 7. Dépannage déploiement

| Symptôme | Cause | Solution |
|----------|-------|----------|
| Vercel : `patch-package` failed | `postinstall` sur dépôt mobile | Vérifier commit avec `scripts/postinstall.mjs` + `vercel.json` |
| Panel : erreur CRUD au clic | TanStack Table | Mettre à jour `vercel/src/App.jsx` (actions via `info.row.original`) |
| Panel : Firestore 401 | Token panel absent | Settings → Connecter Firestore ou `PANEL_FIRESTORE_*` |
| CI : `Permission[]` TypeScript | Typage Android | `src/utils/appPermissions.ts` |
| APK : audio recording crash | RN 0.85 | Patch `patches/react-native-audio-recorder-player+3.6.14.patch` |
| Offline : Ollama indisponible | Daemon ou modèle | `npm run local:ollama` ou relancer `local:serve` |
| Offline : app ne joint pas le serveur | Mauvaise IP | Même Wi-Fi, IP LAN du PC, pas `10.0.2.2` sur téléphone réel |

## 8. Ordre recommandé après merge `main`

1. Attendre le déploiement Vercel (commit `main` récent)
2. Vérifier panel Settings (tous diagnostics)
3. Tester CRUD sur une collection Firestore
4. Télécharger l'APK depuis GitHub Actions (ou build local)
5. Tester sur téléphone : cloud + mode offline + battle + classement
