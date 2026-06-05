const { listDocuments } = require('../firebase-rest');
const { verifyIdToken } = require('../auth-verify');
const { resolveAvatarUrl } = require('../default-avatar');
const {
  getSeasonKey,
  isDateInSeason,
  rankBestScoresForSeason,
} = require('../season');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  const { idToken, mode, season } = req.body || {};
  const seasonKey = String(season || getSeasonKey()).trim() || getSeasonKey();
  if (!idToken) {
    return res.status(400).json({ ok: false, message: 'idToken requis.' });
  }
  try {
    await verifyIdToken(idToken);
    let scores = [];
    try {
      scores = await listDocuments('scores', idToken, 100, 'score desc');
    } catch {
      scores = await listDocuments('scores', idToken, 100, '');
    }
    const filtered = rankBestScoresForSeason(
      scores.filter(
        score =>
          isDateInSeason(score.createdAt, seasonKey) &&
          (!mode || score.mode === mode),
      ),
      seasonKey,
    ).slice(0, 50);

    let usersById = {};
    try {
      const users = await listDocuments('users', idToken, 200);
      usersById = Object.fromEntries(
        users.map(user => [user.id, user]),
      );
    } catch {
      usersById = {};
    }

    return res.status(200).json({
      ok: true,
      season: seasonKey,
      scores: filtered.map(score => {
        const user = usersById[score.userId];
        return {
          ...score,
          avatarUrl: resolveAvatarUrl(
            user?.avatarUrl,
            score.userId,
            score.displayName || user?.displayName,
          ),
        };
      }),
    });
  } catch (error) {
    return res
      .status(400)
      .json({
        ok: false,
        message: error.message || 'Lecture scores impossible.',
      });
  }
};
