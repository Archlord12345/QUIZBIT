const { firebaseAuthRequest } = require('./firebase-rest');

const verifyIdToken = async idToken => {
  const token = String(idToken || '').trim();
  if (!token) {
    throw new Error('Token Firebase manquant.');
  }

  const data = await firebaseAuthRequest('accounts:lookup', { idToken: token });
  const user = data?.users?.[0];
  if (!user?.localId) {
    throw new Error('Session Firebase invalide ou expiree.');
  }

  return {
    uid: user.localId,
    email: user.email || '',
    displayName: user.displayName || '',
  };
};

const assertUserId = (requestedUserId, authUid) => {
  const clean = String(requestedUserId || '').trim();
  if (!clean || clean !== authUid) {
    throw new Error('Identifiant utilisateur non autorise.');
  }
};

const assertAccountId = (account, authUid) => {
  if (!account?.id || account.id !== authUid) {
    throw new Error('Compte non autorise pour cette session.');
  }
};

const isSafeAvatarUrl = url => {
  try {
    const parsed = new URL(String(url || '').trim());
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'res.cloudinary.com' ||
      host.endsWith('.cloudinary.com')
    );
  } catch {
    return false;
  }
};

const clampScore = value => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(10000, Math.floor(numeric)));
};

module.exports = {
  assertAccountId,
  assertUserId,
  clampScore,
  isSafeAvatarUrl,
  verifyIdToken,
};
