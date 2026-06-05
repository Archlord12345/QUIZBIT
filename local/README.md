# QuizBit Local Admin + API Offline

Serveur **tout-en-un** pour jouer à QuizBit **sans Internet** : panel admin + API compatible avec l'app mobile.

## Démarrer

Depuis la racine du dépôt :

```sh
npm run local:serve
```

Ou depuis `local/` :

```sh
npm start
```

Au démarrage, le script `prestart` configure automatiquement Ollama :
démarre `ollama serve` si besoin, télécharge le modèle `smollm2:135m-instruct-q4_1` s'il est absent, puis lance le serveur.

- **Panel admin** : http://localhost:3000/
- **API mobile** : http://localhost:3000/api/…
- **Émulateur Android** : http://10.0.2.2:3000
- **Téléphone réel** : http://\<IP-de-ton-PC\>:3000 (configure l'IP dans l'app → Paramètres)

## Compte démo

| Champ | Valeur |
|-------|--------|
| Email | `demo@local.quizbit` |
| Mot de passe | `demo123` |

## App mobile (mode offline)

1. Lance `npm start` dans `local/`.
2. Dans l'app : **Paramètres** → active **Mode offline**.
3. Sur un vrai téléphone, saisis l'**IP LAN** de ton PC (pas `10.0.2.2`).
4. Connecte-toi avec le compte démo ou crée un compte local.
5. Joue : quiz solo, scores, battle royale (données dans `local/data/store.json`).

### URL du serveur (app mobile + panel)

- **App mobile** : Paramètres → Mode offline → champ **URL du serveur local** (ex. `http://10.0.2.2:3000` ou `http://192.168.1.42:3000`) → **Enregistrer**.
- **Panel local** : menu **Parametres** → saisir l’URL du serveur API → **Enregistrer l URL**.

## Panel admin

- Dashboard, quiz, joueurs, scores, battle rooms
- **Import / Export** JSON (quiz exportés depuis Vercel)
- **Synchroniser avec le serveur** : pousse `localStorage` vers l'API
- Au chargement, le panel récupère l'état du serveur (partagé avec l'app)

## Génération de questions offline (Ollama)

Le serveur local peut générer des quiz via **Ollama** (IA 100 % locale, sans cloud).

### Modèle Ollama (~98 Mo)

Chargé **automatiquement** à chaque `npm run local:serve` / `npm start`.

Installation manuelle si besoin :

```sh
npm run local:ollama
```

Modèle par défaut : `smollm2:135m-instruct-q4_1` (98 Mo, sous la limite 100 Mo).

Variables optionnelles :

| Variable | Défaut |
|----------|--------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | `smollm2:135m-instruct-q4_1` |
| `OLLAMA_DISABLED` | `1` pour désactiver |

### Utilisation

- **Panel local** → onglet **Quiz** → « Générer via Ollama »
- **App mobile** (mode offline) : `/api/generate-questions` avec `provider: auto` tente Ollama puis retombe sur la banque locale
- **Test** : `GET /api/test-ollama` ou bouton « Tester Ollama »

Sans Ollama, l'API utilise les **quiz importés** (ou des questions génériques locales).

## Panel Vercel (cloud)

1. Settings → **Test prompt IA** (nécessite `ADMIN_PANEL_KEY` / `VITE_ADMIN_PANEL_KEY` sur Vercel)
2. Exporter le quiz JSON
3. Panel local → **Import / Export** → importer le fichier

## Fichiers

| Fichier | Rôle |
|---------|------|
| `server.mjs` | HTTP : static + `/api/*` |
| `scripts/ensure-ollama.mjs` | Auto : daemon Ollama + pull modèle |
| `lib/offline-api.js` | Routes API offline (`/api/health`, génération, battle…) |
| `lib/ollama-generate.js` | Génération quiz via Ollama |
| `lib/admin-crud.js` | CRUD panel ↔ `store.json` |
| `lib/store.js` | Persistance `data/store.json` |
| `app.js` | UI panel (sync serveur, statut Ollama) |
