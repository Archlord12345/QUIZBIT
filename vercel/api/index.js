const handlers = {
  'admin-firestore-list': require('../lib/api/admin-firestore-list'),
  'admin-firestore-stats': require('../lib/api/admin-firestore-stats'),
  'admin-firestore-delete': require('../lib/api/admin-firestore-delete'),
  'admin-firestore-upsert': require('../lib/api/admin-firestore-upsert'),
  'admin-save-quiz': require('../lib/api/admin-save-quiz'),
  'auth-login': require('../lib/api/auth-login'),
  'auth-register': require('../lib/api/auth-register'),
  'battle-room-create': require('../lib/api/battle-room-create'),
  'battle-room-chat': require('../lib/api/battle-room-chat'),
  'battle-room-delete': require('../lib/api/battle-room-delete'),
  'battle-room-get': require('../lib/api/battle-room-get'),
  'battle-room-finish': require('../lib/api/battle-room-finish'),
  'battle-room-join': require('../lib/api/battle-room-join'),
  'battle-room-list': require('../lib/api/battle-room-list'),
  'battle-room-start': require('../lib/api/battle-room-start'),
  'firebase-auth': require('../lib/api/test-firebase-auth'),
  'generate-questions': require('../lib/api/generate-questions'),
  'scores-list': require('../lib/api/scores-list'),
  'scores-record': require('../lib/api/scores-record'),
  'test-cloudinary': require('../lib/api/test-cloudinary'),
  'test-gemini': require('../lib/api/test-gemini'),
  'test-mistral': require('../lib/api/test-mistral'),
  'user-update-avatar': require('../lib/api/user-update-avatar'),
  'user-update-stats': require('../lib/api/user-update-stats'),
  'validate-answer': require('../lib/api/validate-answer'),
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

const parseRequestBody = req =>
  new Promise((resolve, reject) => {
    if (typeof req.body === 'object' && req.body !== null) {
      resolve(req.body);
      return;
    }
    if (typeof req.body === 'string' && req.body.trim()) {
      try {
        resolve(JSON.parse(req.body));
      } catch {
        resolve({});
      }
      return;
    }

    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      req.body = await parseRequestBody(req);
    }
  } catch {
    req.body = {};
  }

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
