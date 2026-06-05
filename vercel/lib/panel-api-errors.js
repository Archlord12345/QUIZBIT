const isPanelAuthError = message =>
  /Cle panel admin invalide|ADMIN_PANEL_KEY manquante/i.test(String(message || ''));

const isFirestoreAccessError = message =>
  /Acces Firestore|Firestore panel|panel manquant|PANEL_FIRESTORE|Connecter Firestore|identifiants Firestore|compte.*Firestore/i.test(
    String(message || ''),
  );

const EMPTY_FIRESTORE_STATS = {
  quizzes: 0,
  players: 0,
  scores: 0,
  battleRooms: 0,
};

module.exports = {
  EMPTY_FIRESTORE_STATS,
  isFirestoreAccessError,
  isPanelAuthError,
};
