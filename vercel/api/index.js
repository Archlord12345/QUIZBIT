const handlers = {
  'auth-login': require('../lib/api/auth-login'),
  'auth-register': require('../lib/api/auth-register'),
  'firebase-auth': require('../lib/api/test-firebase-auth'),
  'generate-questions': require('../lib/api/generate-questions'),
  'scores-list': require('../lib/api/scores-list'),
  'scores-record': require('../lib/api/scores-record'),
  'test-cloudinary': require('../lib/api/test-cloudinary'),
  'test-gemini': require('../lib/api/test-gemini'),
  'test-mistral': require('../lib/api/test-mistral'),
  'user-update-avatar': require('../lib/api/user-update-avatar'),
  'user-update-stats': require('../lib/api/user-update-stats'),
};

const getRouteName = req => {
  const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const rewrittenPath = url.searchParams.get('path');
  if (rewrittenPath) return rewrittenPath.replace(/^api\//, '').replace(/^\/+|\/+$/g, '');

  const segments = url.pathname.split('/').filter(Boolean);
  const apiIndex = segments.indexOf('api');
  if (apiIndex === -1) return segments.join('/');
  return segments.slice(apiIndex + 1).join('/');
};

module.exports = async (req, res) => {
  const routeName = getRouteName(req);
  const handler = handlers[routeName];

  if (!handler) {
    return res.status(404).json({
      ok: false,
      message: `Route API inconnue: ${routeName || '/'}`,
    });
  }

  return handler(req, res);
};
