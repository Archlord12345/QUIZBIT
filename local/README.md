# QuizBit Local Admin Panel

Ce dossier contient le panel admin pour la version locale de QuizBit.

## Lancer

```sh
cd local
npm run start
```

Puis ouvrir `http://localhost:4173`.

## Stockage

Le panel utilise `localStorage` et ne depend d'aucun service cloud.

Fonctions disponibles :

- dashboard local ;
- gestion des quiz ;
- gestion des joueurs ;
- scores / leaderboard ;
- rooms battle royale ;
- import/export JSON complet ;
- import direct des quiz JSON exportes depuis le panel Vercel pour jouer/tester offline ;
- reset local.
