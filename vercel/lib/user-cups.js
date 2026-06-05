const { getDocument, setDocument } = require('./firebase-rest');

const incrementUserCups = async (userId, idToken, amount = 1) => {
  const current = await getDocument('users', userId, idToken);
  if (!current) return null;
  const cups = Math.max(0, Number(current.cups || 0) + Math.max(0, Number(amount || 0)));
  const account = {
    ...current,
    cups,
    updatedAt: new Date().toISOString(),
  };
  await setDocument('users', userId, account, idToken);
  return account;
};

module.exports = {
  incrementUserCups,
};
