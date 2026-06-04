# QuizBit Local Admin + API Offline

Serveur **tout-en-un** pour jouer à QuizBit **sans Internet** : panel admin + API compatible avec l'app mobile.

## Démarrer

```sh
cd local
npm start
```

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

## Panel admin

- Dashboard, quiz, joueurs, scores, battle rooms
- **Import / Export** JSON (quiz exportés depuis Vercel)
- **Synchroniser avec le serveur** : pousse `localStorage` vers l'API
- Au chargement, le panel récupère l'état du serveur (partagé avec l'app)

## Génération de questions offline

L'API utilise les **quiz importés** dans le panel (ou le seed `Culture generale`).  
Sans quiz correspondant, des questions locales génériques sont créées.

L'audio vocal en mode offline utilise les quiz déjà présents (pas d'appel Gemini).

## Panel Vercel (cloud)

1. Settings → **Test prompt IA** (nécessite `ADMIN_PANEL_KEY` / `VITE_ADMIN_PANEL_KEY` sur Vercel)
2. Exporter le quiz JSON
3. Panel local → **Import / Export** → importer le fichier

## Fichiers

| Fichier | Rôle |
|---------|------|
| `server.mjs` | HTTP : static + `/api/*` |
| `lib/offline-api.js` | Routes API offline |
| `lib/store.js` | Persistance `data/store.json` |
| `app.js` | UI panel (sync serveur) |
