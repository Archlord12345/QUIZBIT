const { getEnv } = require('./env');

const getPanelAdminKey = () =>
  getEnv('ADMIN_PANEL_KEY', 'VITE_ADMIN_PANEL_KEY');

const assertPanelAdminKey = panelAdminKey => {
  const expected = getPanelAdminKey();
  if (!expected) {
    throw new Error(
      'ADMIN_PANEL_KEY manquante sur Vercel. Configure-la puis redéploie.',
    );
  }
  if (String(panelAdminKey || '').trim() !== expected) {
    throw new Error('Cle panel admin invalide.');
  }
};

module.exports = { assertPanelAdminKey, getPanelAdminKey };
