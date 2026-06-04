const { firebaseAuthRequest } = require('../firebase-rest');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    await firebaseAuthRequest('accounts:signInWithPassword', {
      email: 'diagnostic@example.invalid',
      password: 'diagnostic-password',
      returnSecureToken: true,
    });
    return res.status(200).json({
      ok: true,
      message: 'Firebase Auth serveur OK',
    });
  } catch (error) {
    if (
      ['EMAIL_NOT_FOUND', 'INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD'].includes(
        error.code,
      )
    ) {
      return res.status(200).json({
        ok: true,
        message: 'Firebase Auth serveur OK',
      });
    }

    return res.status(400).json({
      ok: false,
      message: error.message || 'Test Firebase Auth impossible.',
    });
  }
};
